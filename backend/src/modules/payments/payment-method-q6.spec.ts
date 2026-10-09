/** Q-6: the chosen method is read and checked against what the booking allows; cash never reaches the gateway. */
import { PaymentsService } from './payments.module';

const svcFor = (booking: any) => {
  const svc: any = Object.create(PaymentsService.prototype);
  svc.txns = {
    findOne: jest.fn(() => ({ lean: async () => null })),
    create: jest.fn(async (doc: any) => ({ id: 'txn-1', ...doc })),
    updateOne: jest.fn(async () => ({ acknowledged: true })),
  };
  svc.adapter = { name: 'moyasar', createIntent: jest.fn(async () => { throw new Error('stop_after_reservation'); }) };
  svc.events = { emit: jest.fn() };
  svc.logger = { error: jest.fn(), warn: jest.fn() };
  svc.modelFor = jest.fn(() => ({ findOne: () => ({ lean: async () => booking }) }));
  return svc;
};
const PATIENT = { id: 'pat-1', role: 'patient' };
const booking = (payment_method?: string) => ({ id: 'b1', patient_id: 'pat-1', total: 100, ...(payment_method ? { payment_method } : {}) });

describe('Q-6 payment intent method', () => {
  it('records the method the patient chose (a card wallet)', async () => {
    const svc = svcFor(booking('card'));
    await svc.createPaymentIntent(PATIENT, 'lab', 'b1', 'key-123456789012345', 'apple-pay').catch(() => undefined);
    expect(svc.txns.create).toHaveBeenCalledWith(expect.objectContaining({ method: 'apple-pay' }));
  });

  it('without a chosen method it keeps the stored one', async () => {
    const svc = svcFor(booking('card'));
    await svc.createPaymentIntent(PATIENT, 'lab', 'b1', 'key-123456789012345').catch(() => undefined);
    expect(svc.txns.create).toHaveBeenCalledWith(expect.objectContaining({ method: 'card' }));
  });

  it('refuses cash / cod and an insurance method on a non-insurance booking, before any reservation', async () => {
    for (const m of ['cash', 'cod', 'insurance']) {
      const svc = svcFor(booking('card'));
      await expect(svc.createPaymentIntent(PATIENT, 'lab', 'b1', 'key-123456789012345', m)).rejects.toThrow('invalid_payment_method');
      expect(svc.txns.create).not.toHaveBeenCalled();
    }
  });

  it('an insurance booking may pay its co-pay as insurance or by card', async () => {
    for (const m of ['insurance', 'card']) {
      const svc = svcFor(booking('insurance'));
      await svc.createPaymentIntent(PATIENT, 'lab', 'b1', 'key-123456789012345', m).catch(() => undefined);
      expect(svc.txns.create).toHaveBeenCalledWith(expect.objectContaining({ method: m }));
    }
  });
});
