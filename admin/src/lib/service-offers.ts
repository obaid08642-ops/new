// GET /admin/service-offers/:vertical rows: which provider offers which catalogue service, and how (where, insurance, price).

export interface ServiceOfferAdminRow {
  provider_account_id: string; service_id: string; offered: boolean; where?: 'premises' | 'home' | 'both' | null;
  insurance?: boolean; price?: number | null; currency?: string;
  service_name_ar?: string | null; service_name_en?: string | null; provider_name_ar?: string | null; provider_name_en?: string | null;
}

export const OFFER_VERTICALS = [
  { key: 'lab', label: 'المختبرات' },
  { key: 'radiology', label: 'الأشعة' },
  { key: 'nursing', label: 'التمريض' },
] as const;
export type OfferVertical = (typeof OFFER_VERTICALS)[number]['key'];

export function whereText(w: ServiceOfferAdminRow['where']): string {
  return w === 'home' ? 'في المنزل' : w === 'both' ? 'في المنشأة وفي المنزل' : w === 'premises' ? 'في المنشأة' : '—';
}

export function priceText(r: Pick<ServiceOfferAdminRow, 'price' | 'currency'>): string {
  return typeof r.price === 'number' ? `${r.price} ${r.currency === 'SAR' || !r.currency ? 'ر.س' : r.currency}` : '—';
}

/** Rows that match the typed text (service or provider name, or either id) and the "offered only" switch. */
export function filterOffers(rows: ServiceOfferAdminRow[], text: string, offeredOnly: boolean): ServiceOfferAdminRow[] {
  const q = text.trim().toLowerCase();
  return rows.filter((r) => {
    if (offeredOnly && !r.offered) return false;
    if (!q) return true;
    return [r.service_name_ar, r.service_name_en, r.provider_name_ar, r.provider_name_en, r.service_id, r.provider_account_id].some((v) => String(v || '').toLowerCase().includes(q));
  });
}
