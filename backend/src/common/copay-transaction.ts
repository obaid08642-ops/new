/**
 * An insured booking's copay is paid on its insurance request
 * (transactions.booking_kind 'insurance', booking_id = the request id), never
 * on the booking. Lab and radiology bookings store insurance_request_id;
 * consultations and nursing do not, so the request is also found by its
 * booking_id.
 */
export async function findCopayTransaction(conn: { collection(name: string): any }, booking: any, bookingId: string): Promise<any | null> {
  const ids = new Set<string>();
  if (booking?.insurance_request_id) ids.add(String(booking.insurance_request_id));
  const linked: any[] = await conn.collection('insuranceservicerequests')
    .find({ booking_id: { $eq: String(bookingId) } }, { projection: { id: 1 } }).limit(10).toArray();
  for (const r of linked) if (r?.id) ids.add(String(r.id));
  if (!ids.size) return null;
  return conn.collection('transactions').findOne(
    { booking_kind: 'insurance', booking_id: { $in: [...ids] }, status: { $in: ['paid', 'partially_refunded'] } },
    { sort: { createdAt: -1 } },
  );
}

/** The gateway payment id a transactions row carries (charge, then intent; older rows). */
export function gatewayPaymentIdOf(tx: any): string | undefined {
  return tx?.gateway_charge_id || tx?.gateway_intent_id || tx?.gateway_payment_id || tx?.moyasar_payment_id || tx?.payment_id || undefined;
}
