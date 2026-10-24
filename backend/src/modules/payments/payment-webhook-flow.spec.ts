import { PaymentsService } from './payments.module';

// #551: what an authentic Moyasar webhook does (the unit specs so far covered only who may send one).
describe('PaymentsService.handleWebhook after authentication', () => {
  const OLD = process.env.MOYASAR_WEBHOOK_SECRET;
  beforeEach(() => { process.env.MOYASAR_WEBHOOK_SECRET = 'hook-secret'; });
  afterEach(() => { if (OLD === undefined) delete process.env.MOYASAR_WEBHOOK_SECRET; else process.env.MOYASAR_WEBHOOK_SECRET = OLD; });

  const make = (txn: unknown) => {
    const svc: any = Object.create(PaymentsService.prototype);
    svc.txns = { findOne: jest.fn(async () => txn) };
    svc.verifyPayment = jest.fn(async () => ({ status: 'paid' }));
    return svc;
  };
  const body = (over: Record<string, unknown> = {}) => ({ id: 'evt_1', type: 'payment_paid', secret_token: 'hook-secret', data: { id: 'pay_1', status: 'paid' }, ...over });

  it('looks the payment up by the id nested in data and verifies it as that patient, never trusting the body status', async () => {
    const svc = make({ id: 'txn_1', patient_id: 'pat_1' });
    expect(await svc.handleWebhook('moyasar', body(), undefined, JSON.stringify(body()))).toEqual({ ok: true });
    expect(svc.txns.findOne).toHaveBeenCalledWith({ $or: [{ gateway_intent_id: { $in: ['pay_1', 'evt_1'] } }, { gateway_charge_id: { $in: ['pay_1', 'evt_1'] } }] });
    expect(svc.verifyPayment).toHaveBeenCalledWith({ id: 'pat_1', role: 'system' }, 'txn_1'); // asks the provider, ignores data.status
  });

  it('a payment we never issued is answered without error and verifies nothing', async () => {
    const svc = make(null);
    expect(await svc.handleWebhook('moyasar', body({ data: { id: 'pay_x' } }), undefined, '{}')).toEqual({ ok: false, reason: 'no_match' });
    expect(svc.verifyPayment).not.toHaveBeenCalled();
  });

  it('a body without a payment id is answered without error', async () => {
    const svc = make(null);
    expect(await svc.handleWebhook('moyasar', { secret_token: 'hook-secret' }, undefined, '{}')).toEqual({ ok: false, reason: 'no_intent_id' });
  });

  it('a wrong or missing secret is refused before any lookup', async () => {
    const svc = make({ id: 'txn_1', patient_id: 'pat_1' });
    await expect(svc.handleWebhook('moyasar', body({ secret_token: 'nope' }), undefined, '{}')).rejects.toThrow('invalid_webhook_signature');
    await expect(svc.handleWebhook('moyasar', body({ secret_token: undefined }), undefined, '{}')).rejects.toThrow('invalid_webhook_signature');
    expect(svc.txns.findOne).not.toHaveBeenCalled();
    expect(svc.verifyPayment).not.toHaveBeenCalled();
  });
});
