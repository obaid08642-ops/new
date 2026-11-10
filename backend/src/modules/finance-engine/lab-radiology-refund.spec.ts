import { LabRadiologyRefundListener } from './finance-engine.module';

function build(opts: { paid?: any; booking?: any; policy?: any }) {
  const execute = jest.fn(async () => ({ ok: true, method: 'card' }));
  const dlq = jest.fn(async () => ({}));
  const collections: Record<string, any> = {
    transactions: { findOne: jest.fn(async () => opts.paid ?? null) },
    labbookings: { findOne: jest.fn(async () => opts.booking ?? null) },
    radiologybookings: { findOne: jest.fn(async () => opts.booking ?? null) },
    system_configs: { findOne: jest.fn(async () => opts.policy ?? null) },
    event_dlq: { insertOne: dlq },
  };
  const conn: any = { collection: (n: string) => collections[n] };
  const svc = new LabRadiologyRefundListener(conn, { execute } as any);
  return { svc, execute, dlq };
}

describe('a cancelled lab or radiology booking returns what the patient paid', () => {
  it('lab cancelled before the collector leaves: the full card payment', async () => {
    const { svc, execute } = build({ paid: { status: 'paid', amount: 112, refunded_amount: 0 } });
    await svc.onLabCancelled({ booking_id: 'l1', patient_id: 'p1', prior_state: 'CONFIRMED' });
    expect(execute).toHaveBeenCalledWith({ refund_id: 'lab-cancel-l1', booking_kind: 'lab', booking_id: 'l1', patient_id: 'p1', amount: 112, reason: 'lab_cancel_before_service', actor_id: 'system' });
  });

  it('lab cancelled while the collector is on the way keeps the trip fee of the refund policy', async () => {
    const { svc, execute } = build({ paid: { status: 'paid', amount: 112 }, policy: { value: { home_visit: { trip_fee_sar: 30 } } } });
    await svc.onLabCancelled({ booking_id: 'l2', patient_id: 'p1', prior_state: 'IN_TRANSIT' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 82, reason: 'lab_cancel_after_transit' }));
  });

  it('radiology cancelled: the full payment, never a trip fee', async () => {
    const { svc, execute } = build({ paid: { status: 'paid', amount: 400 } });
    await svc.onRadiologyCancelled({ booking_id: 'r1', patient_id: 'p1', prior_state: 'IN_TRANSIT' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ refund_id: 'radiology-cancel-r1', booking_kind: 'radiology', amount: 400 }));
  });

  it('only what is left of the payment is refunded', async () => {
    const { svc, execute } = build({ paid: { status: 'paid', amount: 400, refunded_amount: 150 } });
    await svc.onRadiologyCancelled({ booking_id: 'r2', patient_id: 'p1' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 250 }));
  });

  it('a booking nobody paid by card (cash, unpaid) refunds nothing', async () => {
    const { svc, execute } = build({ paid: null });
    await svc.onLabCancelled({ booking_id: 'l3', patient_id: 'p1' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('a refund the gateway refuses reaches the dead-letter queue instead of vanishing', async () => {
    const { svc, execute, dlq } = build({ paid: { status: 'paid', amount: 50 } });
    execute.mockRejectedValueOnce(new Error('refund_failed'));
    await svc.onLabCancelled({ booking_id: 'l4', patient_id: 'p1' });
    expect(dlq).toHaveBeenCalledWith(expect.objectContaining({ type: 'lab.booking_cancelled', entity_id: 'l4', last_error: 'refund_failed' }));
  });
});

describe('owner decision 2026-11-10: a patient\'s cancel of a lab or radiology booking follows the 2-hour table', () => {
  const at = (hours: number) => new Date(Date.now() + hours * 3_600_000);
  it('lab, 24 hours ahead: everything back; 1 hour ahead: 50 %', async () => {
    const early = build({ paid: { status: 'paid', amount: 200 }, booking: { scheduled_at: at(24) } });
    await early.svc.onLabCancelled({ booking_id: 'l1', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by: 'patient' });
    expect(early.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 200 }));
    const late = build({ paid: { status: 'paid', amount: 200 }, booking: { scheduled_at: at(1) } });
    await late.svc.onLabCancelled({ booking_id: 'l2', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by: 'patient' });
    expect(late.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
  });
  it('radiology: the same table (no trip fee)', async () => {
    const late = build({ paid: { status: 'paid', amount: 400 }, booking: { scheduled_at: at(0.5) } });
    await late.svc.onRadiologyCancelled({ booking_id: 'r1', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by: 'patient' });
    expect(late.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 200 }));
    const early = build({ paid: { status: 'paid', amount: 400 }, booking: { scheduled_at: at(30) } });
    await early.svc.onRadiologyCancelled({ booking_id: 'r2', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by: 'patient' });
    expect(early.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 400 }));
  });
  it('lab on the way and late: the table and the trip fee together, never more than the total minus the trip fee', async () => {
    const t = build({ paid: { status: 'paid', amount: 112 }, booking: { scheduled_at: at(1) }, policy: { value: { home_visit: { trip_fee_sar: 30 } } } });
    await t.svc.onLabCancelled({ booking_id: 'l3', patient_id: 'p1', prior_state: 'IN_TRANSIT', cancelled_by: 'patient' });
    expect(t.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 56 }));          // 50 % of 112 (56) is below 112 - 30 (82)
    const early = build({ paid: { status: 'paid', amount: 112 }, booking: { scheduled_at: at(24) }, policy: { value: { home_visit: { trip_fee_sar: 30 } } } });
    await early.svc.onLabCancelled({ booking_id: 'l4', patient_id: 'p1', prior_state: 'IN_TRANSIT', cancelled_by: 'patient' });
    expect(early.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 82 }));      // 100 % capped by 112 - 30
  });
  it('an as-soon-as-possible lab booking has no appointment to be early for: everything back until the collector is on the way', async () => {
    const t = build({ paid: { status: 'paid', amount: 150 }, booking: { scheduled_at: at(0.1), scheduled_asap: true } });
    await t.svc.onLabCancelled({ booking_id: 'l5', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by: 'patient' });
    expect(t.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 150 }));
  });
  it('the provider\'s cancel, the system\'s, and an unknown canceller stay 100 % at any time', async () => {
    for (const cancelled_by of ['provider', 'system', undefined]) {
      const t = build({ paid: { status: 'paid', amount: 200 }, booking: { scheduled_at: at(0.5) } });
      await t.svc.onLabCancelled({ booking_id: 'l6', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by });
      expect(t.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 200 }));
    }
  });
  it('a stored table is followed: 6 hours / 30 %', async () => {
    const t = build({ paid: { status: 'paid', amount: 100 }, booking: { scheduled_at: at(5) }, policy: { value: { consultation: { full_refund_min_hours: 6, late_refund_percent: 30, patient_no_show_percent: 0, free_reschedules: 1, free_reschedule_min_hours: 2 } } } });
    await t.svc.onLabCancelled({ booking_id: 'l7', patient_id: 'p1', prior_state: 'CONFIRMED', cancelled_by: 'patient' });
    expect(t.execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 30 }));
  });
});

