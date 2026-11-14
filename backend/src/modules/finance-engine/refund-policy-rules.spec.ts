import { NursingNoShowRefundListener, PharmacyRefundListener } from './finance-engine.module';
import { patientAbsentPercent, patientAbsentRefund, pharmacyCancelRefund, refundsDeliveryFeeBeforeDispatch } from './refund-policy-rules';

describe('refund policy fields (screens-audit-3 gap 24): the pure rules', () => {
  it('patient_absent_percent: a valid 0..100 number is used, anything else is the default 0', () => {
    expect(patientAbsentPercent({ home_visit: { patient_absent_percent: 30 } })).toBe(30);
    expect(patientAbsentPercent({ home_visit: { patient_absent_percent: 0 } })).toBe(0);
    expect(patientAbsentPercent({ home_visit: { patient_absent_percent: 100 } })).toBe(100);
    for (const bad of [-1, 101, NaN, Infinity, '30', null, undefined]) expect(patientAbsentPercent({ home_visit: { patient_absent_percent: bad } })).toBe(0);
    expect(patientAbsentPercent(undefined)).toBe(0);
    expect(patientAbsentPercent({})).toBe(0);
  });

  it('refund_delivery_fee_before_dispatch: a boolean is used, anything else is the default (yes)', () => {
    expect(refundsDeliveryFeeBeforeDispatch({ pharmacy: { refund_delivery_fee_before_dispatch: false } })).toBe(false);
    expect(refundsDeliveryFeeBeforeDispatch({ pharmacy: { refund_delivery_fee_before_dispatch: true } })).toBe(true);
    for (const bad of ['false', 0, null, undefined]) expect(refundsDeliveryFeeBeforeDispatch({ pharmacy: { refund_delivery_fee_before_dispatch: bad } })).toBe(true);
    expect(refundsDeliveryFeeBeforeDispatch(undefined)).toBe(true);
  });

  it('a pharmacy cancel: before dispatch everything comes back (the default), after dispatch the delivery fee is kept', () => {
    expect(pharmacyCancelRefund(120, 15, false, true)).toBe(120);
    expect(pharmacyCancelRefund(120, 15, true, true)).toBe(105);
  });

  it('the policy can keep the delivery fee even before dispatch', () => {
    expect(pharmacyCancelRefund(120, 15, false, false)).toBe(105);
    expect(pharmacyCancelRefund(120, 15, true, false)).toBe(105);
  });

  it('the pharmacy refund is exact on halalas and never negative or above the total', () => {
    expect(pharmacyCancelRefund(0.3, 0.1, true, true)).toBe(0.2);        // 0.3 - 0.1 is 0.19999999999999998 on doubles
    expect(pharmacyCancelRefund(10, 25, true, true)).toBe(0);            // a fee larger than the total
    expect(pharmacyCancelRefund(10, -5, true, true)).toBe(10);           // a negative fee is no fee
    expect(pharmacyCancelRefund(NaN, 5, false, true)).toBe(0);
    expect(pharmacyCancelRefund(50, NaN, true, true)).toBe(50);
  });

  it('a patient-absent refund is the policy share of what was paid, in whole halalas', () => {
    expect(patientAbsentRefund(200, 0)).toBe(0);
    expect(patientAbsentRefund(200, 25)).toBe(50);
    expect(patientAbsentRefund(200, 100)).toBe(200);
    expect(patientAbsentRefund(33.33, 50)).toBe(16.67);                  // 1666.5 halalas rounds half away from zero
    expect(patientAbsentRefund(0.1 + 0.2, 10)).toBe(0.03);
    expect(patientAbsentRefund(-5, 50)).toBe(0);
    expect(patientAbsentRefund(NaN, 50)).toBe(0);
    expect(patientAbsentRefund(100, 250)).toBe(100);                     // a percent above 100 is capped
  });
});

function listenerWorld(policy: any) {
  const calls: any[] = [];
  const conn = { collection: () => ({ findOne: async () => (policy === undefined ? null : { value: policy }) }) };
  const refundExec = { execute: jest.fn(async (o: any) => { calls.push(o); return { ok: true }; }) };
  return { conn, refundExec, calls };
}

describe('NursingNoShowRefundListener', () => {
  const event = { booking_id: 'b1', patient_id: 'p1', total: 200 };

  it('with the default policy (0 %) nothing is refunded, as before', async () => {
    const w = listenerWorld(undefined);
    await new NursingNoShowRefundListener(w.conn as any, w.refundExec as any).onNoShow(event);
    expect(w.calls).toEqual([]);
  });

  it('with patient_absent_percent 25 the patient gets 25 % of what they paid, once per booking', async () => {
    const w = listenerWorld({ home_visit: { trip_fee_sar: 40, patient_absent_percent: 25 } });
    await new NursingNoShowRefundListener(w.conn as any, w.refundExec as any).onNoShow(event);
    expect(w.calls).toEqual([expect.objectContaining({ refund_id: 'nursing-noshow-b1', booking_kind: 'nursing', booking_id: 'b1', patient_id: 'p1', amount: 50, reason: 'nursing_patient_absent', actor_id: 'system' })]);
  });

  it('an event without a booking, a patient or an amount does nothing, and a failing refund never throws', async () => {
    const w = listenerWorld({ home_visit: { patient_absent_percent: 50 } });
    const l = new NursingNoShowRefundListener(w.conn as any, w.refundExec as any);
    await l.onNoShow({ patient_id: 'p1', total: 100 });
    await l.onNoShow({ booking_id: 'b1', total: 100 });
    await l.onNoShow({ booking_id: 'b1', patient_id: 'p1', total: 0 });
    expect(w.calls).toEqual([]);
    w.refundExec.execute.mockRejectedValueOnce(new Error('gateway down'));
    await expect(l.onNoShow(event)).resolves.toBeUndefined();
  });
});

describe('PharmacyRefundListener reads refund_delivery_fee_before_dispatch', () => {
  const cancelled = (prior: string) => ({ entity_id: 'o1', patient_account_id: 'p1', meta: { total: 120, delivery_fee: 15, prior_status: prior } });
  const make = (policy: any) => {
    const w = listenerWorld(policy);
    return { w, l: new PharmacyRefundListener(w.conn as any, w.refundExec as any) };
  };

  it('default: before dispatch 100 %, after dispatch minus the fee', async () => {
    const a = make(undefined);
    await a.l.onPharmacyOrderCancelled(cancelled('accepted'));
    expect(a.w.calls[0]).toMatchObject({ amount: 120, reason: 'pharmacy_cancel_before_dispatch' });
    const b = make(undefined);
    await b.l.onPharmacyOrderCancelled(cancelled('out_for_delivery'));
    expect(b.w.calls[0]).toMatchObject({ amount: 105, reason: 'pharmacy_cancel_after_dispatch' });
  });

  it('policy false: the delivery fee is kept even before dispatch', async () => {
    const a = make({ pharmacy: { refund_delivery_fee_before_dispatch: false } });
    await a.l.onPharmacyOrderCancelled(cancelled('accepted'));
    expect(a.w.calls[0]).toMatchObject({ refund_id: 'pharmacy-cancel-o1', amount: 105, reason: 'pharmacy_cancel_before_dispatch' });
  });
});
