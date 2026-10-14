/**
 * P3 "My offers": pure helpers over GET /provider/pharmacy/offers?status=
 * view_status values come from the backend (pharmacy-offer.service.ts listForPharmacy).
 */
export type OfferView = 'draft' | 'sent' | 'chosen' | 'not_chosen' | 'expired' | 'cancelled';
export type OfferFilter = 'all' | OfferView;

export const OFFER_FILTERS: { key: OfferFilter; ar: string; en: string }[] = [
  { key: 'all', ar: 'الكل', en: 'All' },
  { key: 'draft', ar: 'مسودة', en: 'Draft' },
  { key: 'sent', ar: 'مرسل', en: 'Sent' },
  { key: 'chosen', ar: 'تم اختياره', en: 'Chosen' },
  { key: 'not_chosen', ar: 'لم يُختر', en: 'Not chosen' },
  { key: 'expired', ar: 'منتهي', en: 'Expired' },
  { key: 'cancelled', ar: 'ملغي', en: 'Cancelled' },
];

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default' | 'primary';

export const OFFER_VIEW_META: Record<OfferView, { ar: string; en: string; variant: BadgeVariant }> = {
  draft: { ar: 'مسودة', en: 'Draft', variant: 'default' },
  sent: { ar: 'مرسل', en: 'Sent', variant: 'info' },
  chosen: { ar: 'تم اختياره', en: 'Chosen', variant: 'success' },
  not_chosen: { ar: 'لم يُختر', en: 'Not chosen', variant: 'warning' },
  expired: { ar: 'منتهي', en: 'Expired', variant: 'danger' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'default' },
};

/** The query path: "All" sends no status (the backend filters only on a given status). */
export function offersPath(filter: OfferFilter): string {
  return filter === 'all' ? '/provider/pharmacy/offers' : `/provider/pharmacy/offers?status=${encodeURIComponent(filter)}`;
}

export interface OfferRow {
  id: string;
  orderId: string;
  view: OfferView | null;
  total: number | null;
  currency: string;
  itemsCount: number;
  quoteExpiresAt: string | null;
  allocationId: string | null;
}

const VIEWS = Object.keys(OFFER_VIEW_META) as OfferView[];

/** Maps the backend rows; rows without an id are dropped; an unknown view_status stays null (shown as raw, never guessed). */
export function mapOffers(raw: unknown): OfferRow[] {
  if (!Array.isArray(raw)) return [];
  const out: OfferRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== 'string') continue;
    const totals = (o.totals && typeof o.totals === 'object' ? o.totals : {}) as Record<string, unknown>;
    const total = totals.total === undefined || totals.total === null ? NaN : Number(totals.total);
    out.push({
      id: o.id,
      orderId: typeof o.order_id === 'string' ? o.order_id : '',
      view: VIEWS.includes(o.view_status as OfferView) ? (o.view_status as OfferView) : null,
      total: Number.isFinite(total) ? total : null,
      currency: typeof totals.currency === 'string' && totals.currency ? totals.currency : 'SAR',
      itemsCount: Number(o.items_count) || 0,
      quoteExpiresAt: typeof o.quote_expires_at === 'string' ? o.quote_expires_at : null,
      allocationId: typeof o.allocation_id === 'string' && o.allocation_id ? o.allocation_id : null,
    });
  }
  return out;
}
