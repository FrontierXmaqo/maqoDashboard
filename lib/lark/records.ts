// Lark Base record reads. Endpoint checked against open.larksuite.com/document:
//   POST /bitable/v1/apps/:app_token/tables/:table_id/records/search
//   query: page_size (max 500), page_token, user_id_type (default open_id)
//   -> data: { items: [{ record_id, fields }], has_more, page_token }
// Scope: bitable:app:readonly (or bitable:app). Person fields need contact:user.base:readonly
// for names and avatars.

import { larkListAll } from './client.ts';

export type LarkRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

export function searchAllRecords(appToken: string, tableId: string): Promise<LarkRecord[]> {
  return larkListAll<LarkRecord>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/search`,
    { user_id_type: 'open_id' },
    500,
    { method: 'POST', body: {} },
  );
}
