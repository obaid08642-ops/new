// R11 §5 lead 5: a consultation card intent charged `price` (the doctor's fee)
// and ignored total_price, which adds the service, home-visit and transport
// fees the patient was shown. The intent now charges the booking's total.
import { PaymentsService } from './payments.module';

describe('card intent charges the booking total (R11 §5 lead 5)', () => {
  it('a home-visit consultation is charged total_price, not price', async () => {
    const appt = { id: 'a1', patient_id: 'p1', price: 200, service_fee: 15, home_visit_fee: 100, total_price: 315, payment_status: 'pending', payment_method: 'card' };
    const created: any[] = [];
    const svc: any = Object.create(PaymentsService.prototype);
    svc.adapter = { name: 'moyasar', createIntent: jest.fn(async () => ({ intent_id: 'pay_1', checkout_url: 'https://checkout.test' })) };
    svc.modelFor = () => ({ findOne: () => ({ lean: async () => appt }) });
    svc.txns = {
      findOne: () => ({ lean: async () => null }),
      create: jest.fn(async (d: any) => { created.push(d); return { id: 'tx1', ...d }; }),
      findOneAndUpdate: jest.fn(async () => ({ id: 'tx1' })),
    };
    await svc.createPaymentIntent({ id: 'p1', role: 'patient' }, 'consultation', 'a1', 'key-1234567890abcdef');
    expect(created[0].amount).toBe(315);
    expect(svc.adapter.createIntent).toHaveBeenCalledWith(expect.objectContaining({ amount: 315 }));
  });
});
