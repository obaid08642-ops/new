/** The price-override audit page: rows of GET /admin/pharmacy/price-overrides shaped for the table. */
export type PriceAuditRecord = {
  id: string;
  pharmacy_id: string;
  medicine_sku: string;
  medicine_name?: string;
  official_sfda_price: number;
  override_price: number;
  difference_pct: number;
  reason?: string;
  updated_by?: string;
  created_at: string;
};

/** One row of GET /admin/pharmacy/price-overrides (collection pharmacy_price_override_audit). */
export type OverrideRow = {
  id: string; order_id?: string; pharmacy_account_id?: string; sku?: string; name_ar?: string; name_en?: string;
  catalog_price?: number; override_price?: number; reason?: string; changed_by?: string; changed_at?: string;
};
export type OverridesResponse = { items: OverrideRow[]; total: number; page: number; limit: number };

export type PriceAuditResponse = {
  data: PriceAuditRecord[];
  total: number;
  page: number;
  pages: number;
  summary: {
    total_overrides: number;
    flagged_overpriced: number;
    avg_variance_pct: number;
  };
};

/** The percentage between the catalogue price and the price the pharmacy set (display only; the server stores both prices). */
export const variancePct = (catalog: number, override: number): number =>
  catalog > 0 ? Math.round(((override - catalog) / catalog) * 1000) / 10 : 0;

export const toAuditPage = (r: OverridesResponse): PriceAuditResponse => {
  const data: PriceAuditRecord[] = (r.items || []).map((x) => ({
    id: String(x.id),
    pharmacy_id: String(x.pharmacy_account_id ?? '—'),
    medicine_sku: String(x.sku ?? ''),
    medicine_name: x.name_ar || x.name_en || undefined,
    official_sfda_price: Number(x.catalog_price) || 0,
    override_price: Number(x.override_price) || 0,
    difference_pct: variancePct(Number(x.catalog_price) || 0, Number(x.override_price) || 0),
    reason: x.reason || undefined,
    updated_by: x.changed_by || undefined,
    created_at: String(x.changed_at ?? ''),
  }));
  const over = data.filter((d) => d.difference_pct > 0).length;
  const avg = data.length ? data.reduce((a, d) => a + d.difference_pct, 0) / data.length : 0;
  const limit = r.limit || 25;
  return { data, total: r.total || 0, page: r.page || 1, pages: Math.max(1, Math.ceil((r.total || 0) / limit)), summary: { total_overrides: r.total || 0, flagged_overpriced: over, avg_variance_pct: avg } };
};
