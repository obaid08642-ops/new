import { NursingRefundListener, PharmacyRefundListener } from './finance-engine.module';

function build(policy?: any) {
  const execute = jest.fn(async () => ({ ok: true, method: 'card' }));
  const conn: any = { collection: () => ({ findOne: jest.fn(async () => policy ?? null) }) };
  return { execute, nursing: new NursingRefundListener(conn, { execute } as any), pharmacy: new PharmacyRefundListener(conn, { execute } as any) };
}

describe('nursing cancel refund', () => {
  it('before the nurse is on the way: the full total', async () => {
    const { nursing, execute } = build();
    await nursing.onNursingCancelled({ booking_id: 'n1', patient_id: 'p1', total: 300, prior_state: 'CONFIRMED' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ refund_id: 'nursing-cancel-n1', booking_kind: 'nursing', amount: 300, reason: 'nursing_cancel_before_transit' }));
  });
  it('once in transit: the total minus the trip fee of the refund policy', async () => {
    const { nursing, execute } = build({ value: { home_visit: { trip_fee_sar: 25 } } });
    await nursing.onNursingCancelled({ booking_id: 'n2', patient_id: 'p1', total: 300, prior_state: 'IN_TRANSIT' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 275, reason: 'nursing_cancel_after_transit' }));
  });
  it('a booking with no total refunds nothing', async () => {
    const { nursing, execute } = build();
    await nursing.onNursingCancelled({ booking_id: 'n3', patient_id: 'p1', total: 0 });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('pharmacy cancel refund', () => {
  it('before dispatch: the full total including the delivery fee', async () => {
    const { pharmacy, execute } = build();
    await pharmacy.onPharmacyOrderCancelled({ entity_id: 'o1', patient_account_id: 'p1', meta: { total: 140, delivery_fee: 15, prior_status: 'preparing' } });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ refund_id: 'pharmacy-cancel-o1', booking_kind: 'pharmacy', amount: 140, reason: 'pharmacy_cancel_before_dispatch' }));
  });
  it('once out for delivery: the total minus the delivery fee', async () => {
    const { pharmacy, execute } = build();
    await pharmacy.onPharmacyOrderCancelled({ entity_id: 'o2', patient_account_id: 'p1', meta: { total: 140, delivery_fee: 15, prior_status: 'out_for_delivery' } });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 125, reason: 'pharmacy_cancel_after_dispatch' }));
  });
});
