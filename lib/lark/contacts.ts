// Lark Contacts (org chart) reads. Endpoints checked against open.larksuite.com/document:
//   GET /contact/v3/departments/:department_id/children   (0 = root; fetch_child=true recurses; page_size max 50)
//   GET /contact/v3/users/find_by_department               (department_id, 0 = root; page_size max 50)
// Scopes: contact:contact.base:readonly to call them; contact:department.base:readonly for
// department names; contact:user.base:readonly for names and avatars;
// contact:user.department:readonly for each user's department_ids.
// Results are limited to the app's contacts visibility range set in the developer console.

import { larkListAll } from './client.ts';

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
  return larkListAll<LarkDepartment>(
    '/contact/v3/departments/0/children',
    { fetch_child: 'true', department_id_type: 'open_department_id', user_id_type: 'open_id' },
    50,
  );
}

export function listDepartmentUsers(openDepartmentId: string): Promise<LarkUser[]> {
  return larkListAll<LarkUser>(
    '/contact/v3/users/find_by_department',
    { department_id: openDepartmentId, department_id_type: 'open_department_id', user_id_type: 'open_id' },
    50,
  );
}
