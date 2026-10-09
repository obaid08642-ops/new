/** The six states the server reports for a pharmacy offer (GET /provider/pharmacy/offers, field view_status). */
export const OFFER_VIEW_STATUSES = ['sent', 'chosen', 'not_chosen', 'expired', 'draft', 'cancelled'] as const;
export type OfferViewStatus = typeof OFFER_VIEW_STATUSES[number];

export function isOfferViewStatus(v: unknown): v is OfferViewStatus {
  return typeof v === 'string' && (OFFER_VIEW_STATUSES as readonly string[]).includes(v);
}

export const OFFER_STATUS_LABEL: Record<OfferViewStatus, { ar: string; en: string }> = {
  sent: { ar: 'مُرسل', en: 'Sent' },
  chosen: { ar: 'تم اختياره', en: 'Chosen' },
  not_chosen: { ar: 'لم يُختر', en: 'Not chosen' },
  expired: { ar: 'منتهي', en: 'Expired' },
  draft: { ar: 'مسودة', en: 'Draft' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

/** Whole minutes left until the quote expires; null when there is no expiry, 0 when it is past. */
export function minutesLeft(quoteExpiresAt: unknown, now: Date): number | null {
  if (typeof quoteExpiresAt !== 'string' && !(quoteExpiresAt instanceof Date)) return null;
  const t = new Date(quoteExpiresAt).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.ceil((t - now.getTime()) / 60000));
}
