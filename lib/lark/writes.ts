// Lark Base record writes. Endpoints checked against open.larksuite.com/document:
//   POST /bitable/v1/apps/:app_token/tables/:table_id/records          { fields }  (client_token = uuid for idempotency)
//   PUT  /bitable/v1/apps/:app_token/tables/:table_id/records/:record_id { fields }  (only the given fields change; null clears)
// Scope: bitable:app. user_id_type=open_id so person fields take open_ids.

import { randomUUID } from 'node:crypto';
import { larkRequest } from './client.ts';
import type { LarkRecord } from './records.ts';

const base = (appToken: string, tableId: string) =>
  `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`;

export async function createRecord(appToken: string, tableId: string, fields: Record<string, unknown>): Promise<string> {
  const data = await larkRequest<{ record?: LarkRecord }>('POST', base(appToken, tableId), {
    query: { user_id_type: 'open_id', client_token: randomUUID() },
    body: { fields },
  });
  return data.record?.record_id ?? '';
}

export async function updateRecord(appToken: string, tableId: string, recordId: string, fields: Record<string, unknown>): Promise<void> {
  await larkRequest('PUT', `${base(appToken, tableId)}/${encodeURIComponent(recordId)}`, {
    query: { user_id_type: 'open_id' },
    body: { fields },
  });
}
