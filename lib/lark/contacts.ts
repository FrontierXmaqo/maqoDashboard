// Lark Contacts (org chart) reads. Endpoints checked against open.larksuite.com/document:
//   GET /contact/v3/departments/:department_id/children   (0 = root; fetch_child=true recurses; page_size max 50)
//   GET /contact/v3/users/find_by_department               (department_id, 0 = root; page_size max 50)
// Scopes: contact:contact.base:readonly to call them; contact:department.base:readonly for
// department names; contact:user.base:readonly for names and avatars;
// contact:user.department:readonly for each user's department_ids.
//   GET /contact/v3/scopes            (departments and users the app may see; data.department_ids / user_ids)
//   GET /contact/v3/departments/batch (department_ids, repeated, max 50)
//   GET /contact/v3/users/batch       (user_ids, repeated, max 50)
// Results are limited to the app's contacts visibility range set in the developer console.
// Listing from the root (department 0) needs the range to be "all members"; otherwise use
// listScopes() and start from the departments it returns.

import { larkListAll, larkRequest } from './client.ts';

export type LarkDepartment = {
  open_department_id: string;
  department_id?: string;
  name?: string;
  i18n_name?: { en_us?: string; zh_cn?: string };
  parent_department_id?: string;
  status?: { is_deleted?: boolean };
};

export type LarkUser = {
  open_id: string;
  name?: string;
  en_name?: string;
  job_title?: string;
  avatar?: { avatar_72?: string; avatar_240?: string };
  department_ids?: string[];
  status?: { is_resigned?: boolean; is_frozen?: boolean; is_exited?: boolean };
};

export function listAllDepartments(): Promise<LarkDepartment[]> {
  return listChildDepartments('0');
}

/** Every department below this one, recursively. */
export function listChildDepartments(openDepartmentId: string): Promise<LarkDepartment[]> {
  return larkListAll<LarkDepartment>(
    `/contact/v3/departments/${encodeURIComponent(openDepartmentId)}/children`,
    { fetch_child: 'true', department_id_type: 'open_department_id', user_id_type: 'open_id' },
    50,
  );
}

/** The app's contacts range: department and user IDs it may read. */
export async function listScopes(): Promise<{ departmentIds: string[]; userIds: string[] }> {
  const departmentIds: string[] = [];
  const userIds: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 1000; page++) {
    const d = await larkRequest<{ department_ids?: string[]; user_ids?: string[]; has_more?: boolean; page_token?: string }>('GET', '/contact/v3/scopes', {
      query: { department_id_type: 'open_department_id', user_id_type: 'open_id', page_size: 100, page_token: pageToken },
    });
    departmentIds.push(...(d.department_ids ?? []));
    userIds.push(...(d.user_ids ?? []));
    if (!d.has_more || !d.page_token) break;
    pageToken = d.page_token;
  }
  return { departmentIds, userIds };
}

async function inBatches<T>(ids: string[], fetchBatch: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 50) out.push(...(await fetchBatch(ids.slice(i, i + 50))));
  return out;
}

export function getDepartments(openDepartmentIds: string[]): Promise<LarkDepartment[]> {
  return inBatches(openDepartmentIds, async (chunk) =>
    (await larkRequest<{ items?: LarkDepartment[] }>('GET', '/contact/v3/departments/batch', {
      query: { department_ids: chunk, department_id_type: 'open_department_id', user_id_type: 'open_id' },
    })).items ?? [],
  );
}

export function getUsers(openIds: string[]): Promise<LarkUser[]> {
  return inBatches(openIds, async (chunk) =>
    (await larkRequest<{ items?: LarkUser[] }>('GET', '/contact/v3/users/batch', {
      query: { user_ids: chunk, department_id_type: 'open_department_id', user_id_type: 'open_id' },
    })).items ?? [],
  );
}

export function listDepartmentUsers(openDepartmentId: string): Promise<LarkUser[]> {
  return larkListAll<LarkUser>(
    '/contact/v3/users/find_by_department',
    { department_id: openDepartmentId, department_id_type: 'open_department_id', user_id_type: 'open_id' },
    50,
  );
}
