import { apiFetch, newIdempotencyKey } from './api';
import { extractPatientPharmacyOrderId } from './pharmacy-draft';
import { noAnswerYet } from './pharmacyCheckout';
import { idemKey } from './pharmacyOffers';

/**
 * The one create-and-submit of a governed pharmacy order (POST /patient/pharmacy/orders, then POST .../:id/submit), used by the
 * cart checkout and by the reorder screen. It makes a send safe to press twice and to retry:
 *  - the same body keeps the same pair of idempotency keys until the server has answered, so a retry after a dropped connection is
 *    the same order, never a second one;
 *  - an order that was created stays: a retry only submits it again;
 *  - a body that changed after the draft was created edits that draft (PATCH takes everything but the payment mode) instead of
 *    creating a second one, when the caller passes `editable`;
 *  - after a success the keys and the remembered order are dropped, so the next send is a new order.
 * `keyPrefix` names the flow in the keys (they are kept apart per flow on the server's audit trail).
 */
export function createPharmacyOrderSender(keyPrefix: 'pharmacy-broadcast' | 'pharmacy-reorder') {
  const keys = new Map<string, { create: string; submit: string }>();
  let created: { body: string; orderId: string } | null = null;

  return {
    /** True while a created draft is waiting to be submitted (the payment mode of that draft can no longer change). */
    get hasDraft(): boolean {
      return created !== null;
    },
    /** Creates (or reuses, or edits) the draft for `draft` and submits it. Resolves with the order id. */
    async send(draft: Record<string, unknown>, options: { editable?: boolean } = {}): Promise<string> {
      const body = JSON.stringify(draft);
      let pair = keys.get(body);
      if (!pair) {
        const nonce = newIdempotencyKey();
        pair = { create: idemKey(keyPrefix, [], nonce), submit: idemKey(`${keyPrefix}-submit`, [], nonce) };
        keys.set(body, pair);
      }
      let orderId = created?.body === body ? created.orderId : null;
      if (!orderId && created && options.editable) {
        // the delivery mode or the address changed after the draft was created: that draft is edited, never a second one created
        const { payment_mode: _paymentMode, ...patch } = draft;
        await apiFetch(`/patient/pharmacy/orders/${created.orderId}`, { method: 'PATCH', headers: { 'Idempotency-Key': newIdempotencyKey() }, body: JSON.stringify(patch) });
        orderId = created.orderId;
        created = { body, orderId };
      }
      if (!orderId) {
        const response = await apiFetch('/patient/pharmacy/orders', { method: 'POST', headers: { 'Idempotency-Key': pair.create }, body });
        orderId = extractPatientPharmacyOrderId(response);
        if (!orderId) throw new Error('governed_pharmacy_order_id_missing');
        created = { body, orderId };
      }
      await apiFetch(`/patient/pharmacy/orders/${orderId}/submit`, { method: 'POST', headers: { 'Idempotency-Key': pair.submit }, body: JSON.stringify({}) });
      keys.delete(body);
      created = null;
      return orderId;
    },
    /** Call when a send threw: a server answer ends the attempt (the next one takes new keys); after no answer the same keys go out again. */
    failed(error: unknown): void {
      if (!noAnswerYet(error)) keys.clear();
    },
  };
}
