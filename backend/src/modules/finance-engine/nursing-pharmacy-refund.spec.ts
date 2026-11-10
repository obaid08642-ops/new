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

describe('owner decision 2026-11-10: a patient\'s cancel of a nursing booking follows the 2-hour table', () => {
  const at = (hours: number) => new Date(Date.now() + hours * 3_600_000);
  it('24 hours ahead: the full total; 1 hour ahead: 50 %', async () => {
    const a = build();
    await a.nursing.onNursingCancelled({ booking_id: 'n10', patient_id: 'p1', total: 300, prior_state: 'CONFIRMED', scheduled_at: at(24), cancelled_by: 'patient' });
    expect(a.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 300 }));
    const b = build();
    await b.nursing.onNursingCancelled({ booking_id: 'n11', patient_id: 'p1', total: 300, prior_state: 'CONFIRMED', scheduled_at: at(1), cancelled_by: 'patient' });
    expect(b.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 150 }));
  });
  it('late and the nurse already on the way: 50 %, capped by the total minus the trip fee', async () => {
    const t = build({ value: { home_visit: { trip_fee_sar: 25 } } });
    await t.nursing.onNursingCancelled({ booking_id: 'n12', patient_id: 'p1', total: 300, prior_state: 'IN_TRANSIT', scheduled_at: at(1), cancelled_by: 'patient' });
    expect(t.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 150 }));
    const early = build({ value: { home_visit: { trip_fee_sar: 25 } } });
    await early.nursing.onNursingCancelled({ booking_id: 'n13', patient_id: 'p1', total: 300, prior_state: 'IN_TRANSIT', scheduled_at: at(30), cancelled_by: 'patient' });
    expect(early.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 275 }));
  });
  it('an admin\'s cancel keeps the earlier rule (everything back before the nurse leaves)', async () => {
    const t = build();
    await t.nursing.onNursingCancelled({ booking_id: 'n14', patient_id: 'p1', total: 300, prior_state: 'CONFIRMED', scheduled_at: at(0.5), cancelled_by: 'admin' });
    expect(t.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 300 }));
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

describe('owner decision 2026-11-10: pharmacy cancel by the pharmacy or an admin is a full refund', () => {
  it('an admin cancelling an order that is out for delivery refunds the whole total (the delivery fee too)', async () => {
    const { pharmacy, execute } = build();
    await pharmacy.onPharmacyOrderCancelled({ entity_id: 'o9', patient_account_id: 'p1', actor_role: 'admin', meta: { total: 140, delivery_fee: 15, prior_status: 'out_for_delivery' } });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ refund_id: 'pharmacy-cancel-o9', amount: 140 }));
  });
  it('the patient\'s own cancel keeps the policy rule (before preparation: everything, fee per policy)', async () => {
    const { pharmacy, execute } = build();
    await pharmacy.onPharmacyOrderCancelled({ entity_id: 'o10', patient_account_id: 'p1', actor_role: 'patient', meta: { total: 140, delivery_fee: 15, prior_status: 'confirmed' } });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 140 }));
  });
});

