/** The intent charges the amount the screen shows: consultation total_price, insured lab/radiology insurance_copay. */
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
const KEY = 'key-123456789012345';

describe('payment intent amount', () => {
  it('consultation: charges total_price (115), not price (100), and equals the capabilities amount', async () => {
    const appt = { id: 'a1', patient_id: 'pat-1', price: 100, total_price: 115, payment_method: 'card' };
    const svc = svcFor(appt);
    svc.appts = { findOne: () => ({ lean: async () => appt }) };
    await svc.createPaymentIntent(PATIENT, 'consultation', 'a1', KEY).catch(() => undefined);
    const charged = svc.txns.create.mock.calls[0][0].amount;
    expect(charged).toBe(115);
    expect((await svc.getConsultationCapabilities(PATIENT, 'a1')).amount).toBe(charged);
  });

  it.each(['lab', 'radiology', 'nursing'])('%s: an insured approved share charges insurance_copay, not the total', async (kind) => {
    const svc = svcFor({ id: 'b1', patient_id: 'pat-1', total: 200, payment_method: 'insurance', insurance_status: 'partial_approval', insurance_copay: 60 });
    await svc.createPaymentIntent(PATIENT, kind, 'b1', KEY, 'card').catch(() => undefined);
    expect(svc.txns.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 60 }));
  });

  it('an insured booking the insurer has not decided yet still charges its total', async () => {
    const svc = svcFor({ id: 'b1', patient_id: 'pat-1', total: 200, payment_method: 'insurance', insurance_status: 'pending', insurance_copay: 0 });
    await svc.createPaymentIntent(PATIENT, 'lab', 'b1', KEY, 'card').catch(() => undefined);
    expect(svc.txns.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 200 }));
  });

  it('a fully covered booking (copay 0) never creates a charge', async () => {
    const svc = svcFor({ id: 'b1', patient_id: 'pat-1', total: 200, payment_method: 'insurance', insurance_status: 'approved', insurance_copay: 0 });
    await expect(svc.createPaymentIntent(PATIENT, 'lab', 'b1', KEY, 'card')).rejects.toThrow('invalid_amount');
    expect(svc.txns.create).not.toHaveBeenCalled();
  });
});
