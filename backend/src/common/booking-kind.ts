/**
 * The booking kinds the card payment API accepts (moyasar `resolveBookingAmount`) and the ones billing knows are not the same list. One shared map, so an invoice
 * (and its credit note) is issued for a payment made with ANY accepted spelling, and the payment is found under the spelling it was stored with.
 */

/** Every accepted spelling -> the kind billing works with (the one its bookings, invoices and unique key use). */
export const BILLING_KIND_OF: Readonly<Record<string, string>> = Object.freeze({
  pharmacy: 'pharmacy', order: 'order', orders: 'order',
  consultation: 'consultation', appointment: 'appointment',
  lab: 'lab', labs: 'lab',
  radiology: 'radiology',
  nursing: 'nursing', home_care: 'home_care', 'home-care': 'home_care', homecare: 'home_care',
  insurance: 'insurance', 'insurance-copay': 'insurance', copay: 'insurance',
});

/** The billing kind of a booking kind as written by any caller; an unknown kind comes back unchanged (billing refuses it as before). */
export function billingKindOf(raw: unknown): string {
  const k = String(raw ?? '').trim().toLowerCase();
  return BILLING_KIND_OF[k] ?? k;
}

/** The group a billing kind belongs to for payments: one booking can be paid under any spelling of its group. */
const GROUP: Readonly<Record<string, string>> = Object.freeze({
  pharmacy: 'pharmacy', order: 'pharmacy', consultation: 'consultation', appointment: 'consultation', lab: 'lab', radiology: 'radiology',
  nursing: 'nursing', home_care: 'nursing', insurance: 'insurance',
});

/** Every `transactions.booking_kind` spelling a payment of this booking may carry (what billing searches with `$in`). */
export function transactionKinds(kind: unknown): string[] {
  const group = GROUP[billingKindOf(kind)];
  if (!group) return [String(kind ?? '')];
  return Object.keys(BILLING_KIND_OF).filter((alias) => GROUP[BILLING_KIND_OF[alias]] === group);
}
