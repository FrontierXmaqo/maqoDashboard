// Lark Base (bitable) reads. Endpoints checked against open.larksuite.com/document:
//   GET /bitable/v1/apps/:app_token/tables                     (list tables)
//   GET /bitable/v1/apps/:app_token/tables/:table_id/fields    (list fields)
// Either scope bitable:app:readonly or bitable:app allows these reads.

import { larkListAll } from './client.ts';

export type LarkTable = { table_id: string; name: string; revision?: number };

export type LarkFieldOption = { id?: string; name: string; color?: number };

export type LarkField = {
  field_id: string;
  field_name: string;
  type: number;
  ui_type?: string;
  is_primary?: boolean;
  property?: {
    options?: LarkFieldOption[];
    table_id?: string;
    table_name?: string;
    multiple?: boolean;
  } | null;
};

export function listTables(appToken: string): Promise<LarkTable[]> {
  return larkListAll<LarkTable>(`/bitable/v1/apps/${encodeURIComponent(appToken)}/tables`);
}

export function listFields(appToken: string, tableId: string): Promise<LarkField[]> {
  return larkListAll<LarkField>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields`,
  );
}
