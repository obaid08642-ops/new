import { v4 as uuidv4 } from 'uuid';
import type { Connection } from 'mongoose';
import { riyadhParts } from '../../common/riyadh-clock';

/**
 * Owner decision 2026-10-25 (supersedes OD-12): a pharmacy MAY offer a line above the catalogue (SFDA) price, and every such line is
 * a review for the admin. One `PriceReview` row per offer line (pharmacy, order/offer, medicine, catalogue and offered price, the % above,
 * and later who decided what, when and why). The admin notice is one per pharmacy + medicine per day (Riyadh), however many offers.
 */
export const PRICE_REVIEWS = 'pharmacy_line_price_reviews';
export type PriceReviewStatus = 'open' | 'catalogue_updated' | 'pharmacy_actioned' | 'dismissed';
export type PriceReviewAction = 'catalogue_updated' | 'dismissed' | 'warning' | 'suspend_temporary' | 'block' | 'penalty' | 'suspension_lifted';

/** How far above the catalogue price, in percent with two decimals. */
export function percentAbove(offered: number, catalogue: number): number {
  return Math.round(((offered - catalogue) / catalogue) * 10_000) / 100;
}

/** The lines of an offer that are above their catalogue price (the offer service marks them while pricing). */
export function aboveLines(offer: any): any[] {
  return (Array.isArray(offer?.items) ? offer.items : []).filter((i: any) => i?.above_catalogue_price === true && Number(i?.catalogue_price) > 0 && Number(i?.unit_price) > Number(i?.catalogue_price));
}

/**
 * Keeps the review rows of one offer current (called as the draft changes and on submit): a row per line above the price, updated while it
 * is still open; a decided row is never reopened or rewritten; an open row whose line is no longer above the price is removed.
 * Then one admin notice per pharmacy + medicine + day.
 */
export async function syncLineReviews(conn: Pick<Connection, 'collection'>, offer: any, orderId: string, now: Date = new Date()): Promise<void> {
  const col = conn.collection(PRICE_REVIEWS);
  const lines = aboveLines(offer);
  const keep = lines.map((l: any) => String(l.order_item_id));
  await col.deleteMany({ offer_id: offer.id, status: 'open', order_item_id: { $nin: keep } });
  const day = riyadhParts(now).ymd;
  for (const l of lines) {
    const itemId = String(l.order_item_id);
    const existing: any = await col.findOne({ offer_id: offer.id, order_item_id: itemId });
    if (existing && existing.status !== 'open') continue;
    const offered = Number(l.unit_price);
    const catalogue = Number(l.catalogue_price);
    const fields = {
      pharmacy_id: String(offer.pharmacy_account_id ?? ''), order_id: orderId, offer_id: offer.id, order_item_id: itemId,
      medicine_id: l.medicine_id ?? null, sku: l.sku ?? null, name_ar: l.name_ar ?? null, name_en: l.name_en ?? null,
      catalogue_price: catalogue, offered_price: offered, percent_above: percentAbove(offered, catalogue), offer_status: offer.status ?? null, updated_at: now,
    };
    const res: any = await col.findOneAndUpdate(
      { offer_id: offer.id, order_item_id: itemId, status: 'open' },
      { $set: fields, $setOnInsert: { id: uuidv4(), status: 'open', admin_id: null, action: null, note: null, acted_at: null, created_at: now } },
      { upsert: true, returnDocument: 'after' },
    );
    const row = res?.value ?? res;
    const medicineKey = String(l.medicine_id ?? l.sku ?? itemId);
    await conn.collection('notifications').updateOne(
      { role: 'admin', type: 'pharmacy_price_above_catalogue', dedupe_key: `${fields.pharmacy_id}|${medicineKey}|${day}` },
      { $setOnInsert: { id: uuidv4(), user_id: 'admin', role: 'admin', type: 'pharmacy_price_above_catalogue', title_key: 'admin.pharmacy.price_above_catalogue',
        dedupe_key: `${fields.pharmacy_id}|${medicineKey}|${day}`,
        body: { review_id: row?.id ?? null, order_id: orderId, offer_id: offer.id, pharmacy_id: fields.pharmacy_id, medicine_id: l.medicine_id ?? null, catalogue_price: catalogue, offered_price: offered, percent_above: fields.percent_above },
        read: false, createdAt: now } },
      { upsert: true },
    );
  }
}
