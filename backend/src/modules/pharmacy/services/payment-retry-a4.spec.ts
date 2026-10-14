/** A-4: payment status is read-only; a retry is card only, never while the gateway holds a payment. */
import { PharmacyOrderService } from './pharmacy-order.service';

const lean = (v: any) => ({ lean: async () => v });

function svcWith(order: any, intents: any[] = []) {
  const svc: any = Object.create(PharmacyOrderService.prototype);
  const updateMany = jest.fn(async () => ({}));
  svc.orders = { findOne: () => lean(order) };
  svc.conn = { collection: () => ({
    findOne: async (q: any) => intents.find((i) => q.status.$in.includes(i.status)) ?? null,
    updateMany,
  }) };
  svc.governedView = (o: any) => ({ governed_state: o.governed_state });
  return { svc: svc as PharmacyOrderService, updateMany };
}

const user = { id: 'pat1', role: 'patient' };
const base = { id: 'o1', patient_account_id: 'pat1', status: 'cash_card_payment_pending' };

describe('A-4 card payment retry', () => {
  it('closes only never-started intents of other attempts', async () => {
    const { svc, updateMany } = svcWith({ ...base, governed_state: 'FINAL_QUOTE_ACCEPTED' });
    await svc.prepareCardRetry(user, 'o1', 'retry-key-0123456789');
    expect(updateMany).toHaveBeenCalledWith(
      { order_id: 'o1', idempotency_key: { $ne: 'retry-key-0123456789' }, status: { $in: ['requires_payment', 'initiating'] } },
      expect.anything(),
    );
  });

  it('refuses while a payment is pending or authorized at the gateway', async () => {
    const { svc, updateMany } = svcWith({ ...base, governed_state: 'PAYMENT_PENDING' }, [{ status: 'authorized' }]);
    await expect(svc.prepareCardRetry(user, 'o1', 'retry-key-0123456789')).rejects.toThrow('payment_in_progress');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('never retries into cash on delivery', async () => {
    const { svc } = svcWith({ ...base, governed_state: 'COD_REGISTERED' });
    await expect(svc.prepareCardRetry(user, 'o1', 'retry-key-0123456789')).rejects.toThrow('payment_not_retryable_in_current_state');
  });
});
