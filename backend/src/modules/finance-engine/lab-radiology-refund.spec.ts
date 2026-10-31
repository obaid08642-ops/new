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
