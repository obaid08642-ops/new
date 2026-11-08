import { fromHalalas, toHalalas } from './money';

/**
 * An insured booking's copay is paid on its insurance request
 * (transactions.booking_kind 'insurance', booking_id = the request id), never
 * on the booking. Lab and radiology bookings store insurance_request_id;
 * consultations and nursing do not, so the request is also found by its
 * booking_id. Both the request and the transaction must belong to the
 * booking's owner.
 */
export async function findCopayTransaction(conn: { collection(name: string): any }, booking: any, bookingId: string): Promise<any | null> {
  const owner = String(booking?.patient_id ?? booking?.patient_account_id ?? booking?.user_id ?? '');
  if (!owner) return null;
  const ids = new Set<string>();
  if (booking?.insurance_request_id) ids.add(String(booking.insurance_request_id));
  const linked: any[] = await conn.collection('insuranceservicerequests')
    .find({ booking_id: { $eq: String(bookingId) }, patient_id: { $eq: owner } }, { projection: { id: 1 } }).limit(10).toArray();
  for (const r of linked) if (r?.id) ids.add(String(r.id));
  if (!ids.size) return null;
  return conn.collection('transactions').findOne(
    { booking_kind: 'insurance', booking_id: { $in: [...ids] }, patient_id: { $eq: owner }, status: { $in: ['paid', 'partially_refunded'] } },
    { sort: { createdAt: -1 } },
  );
}

/** The gateway payment id a transactions row carries (charge, then intent; older rows). */
export function gatewayPaymentIdOf(tx: any): string | undefined {
  return tx?.gateway_charge_id || tx?.gateway_intent_id || tx?.gateway_payment_id || tx?.moyasar_payment_id || tx?.payment_id || undefined;
}

/** What can still be refunded on a copay transaction (amount minus earlier refunds). */
export function copayRefundable(tx: any): number {
  // R11 P2: whole halalas. The integer shadow (`amount_halalas`, `refunded_amount_halalas`) is read when the row has one, else the double is
  // converted exactly; the subtraction is on integers, so 0.3 - 0.1 is 0.2 and not 0.19999999999999998.
  return fromHalalas(Math.max(0, halalasOf(tx?.amount_halalas, tx?.amount) - halalasOf(tx?.refunded_amount_halalas, tx?.refunded_amount)));
}

function halalasOf(shadow: unknown, sar: unknown): number {
  if (typeof shadow === 'number' && Number.isSafeInteger(shadow)) return shadow;
  const n = Number(sar || 0);
  return Number.isFinite(n) ? toHalalas(n) : 0;
}
