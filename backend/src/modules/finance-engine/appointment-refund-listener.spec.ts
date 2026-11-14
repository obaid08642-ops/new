/** The appointment refund is the policy percentage of what was paid, and a failure reaches the dead-letter queue. */
import { AppointmentRefundListener } from './finance-engine.module';

const build = (paidAmount: number | null, execute: jest.Mock) => {
  const inserted: any[] = [];
  const conn: any = {
    collection: (name: string) => name === 'transactions'
      ? { findOne: jest.fn(async () => (paidAmount === null ? null : { amount: paidAmount, status: 'paid' })) }
      : { insertOne: jest.fn(async (d: any) => { inserted.push(d); }) },
  };
  const listener = new AppointmentRefundListener(conn, { execute } as any, { exists: jest.fn(), append: jest.fn() } as any);
  return { listener, inserted };
};
const event = (over: any = {}) => ({ appointment_id: 'a1', patient_id: 'p1', doctor_id: 'd1', total_price: 115, refund_percentage: 100, penalty_amount: 0, ...over });

describe('AppointmentRefundListener', () => {
  it('refunds the percentage of the amount paid, never above it', async () => {
    const execute = jest.fn(async () => ({ ok: true, method: 'card' }));
    const { listener } = build(100, execute);
    await listener.onRefundCalculated(event());
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
  });

  it('a 50% late cancel refunds half of what was paid', async () => {
    const execute = jest.fn(async () => ({ ok: true, method: 'card' }));
    const { listener } = build(115, execute);
    await listener.onRefundCalculated(event({ refund_percentage: 50 }));
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 57.5 }));
  });

  it('with no paid transaction it falls back to the appointment total', async () => {
    const execute = jest.fn(async () => ({ ok: true, method: 'cash' }));
    const { listener } = build(null, execute);
    await listener.onRefundCalculated(event());
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ amount: 115 }));
  });

  it('a failed refund is queued for operations, not only logged', async () => {
    const execute = jest.fn(async () => { throw new Error('refund_exceeds_paid'); });
    const { listener, inserted } = build(100, execute);
    await expect(listener.onRefundCalculated(event())).resolves.toBeUndefined();
    expect(inserted).toEqual([expect.objectContaining({ type: 'appointment.refund.calculated', entity_id: 'a1', status: 'pending', last_error: 'refund_exceeds_paid' })]);
  });
});
