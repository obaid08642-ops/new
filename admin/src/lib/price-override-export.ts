import { adminFetch, toQuery } from './admin-client';

/**
 * Q25 / 13.R3: the server-side CSV of the pharmacy price-override audit
 * (GET /admin/pharmacy/price-overrides.csv, same filters as the list, capped
 * at 5000 rows, formula-safe cells). Fetched through the admin BFF so the
 * session, device binding and step-up rules apply like every other call.
 */
export type PriceOverrideExportFilters = {
  order_id?: string;
  offer_id?: string;
  pharmacy_account_id?: string;
  sku?: string;
  from?: string;
  to?: string;
};

export const PRICE_OVERRIDES_CSV_PATH = '/api/admin/admin/pharmacy/price-overrides.csv';

export async function fetchPriceOverridesCsv(filters: PriceOverrideExportFilters = {}): Promise<{ filename: string; csv: string }> {
  const csv = await adminFetch<string>(`${PRICE_OVERRIDES_CSV_PATH}${toQuery(filters)}`, { headers: { accept: 'text/csv' } });
  if (typeof csv !== 'string') throw new Error('price_overrides_csv_not_text');
  return { filename: `price-overrides-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

/** Browser-only: hand the CSV to the user as a file (BOM so Excel reads Arabic). */
export function saveCsvFile(filename: string, csv: string): void {
  const body = csv.startsWith('﻿') ? csv : `﻿${csv}`;
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
