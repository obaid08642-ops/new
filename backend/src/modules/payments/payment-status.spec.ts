import { MoyasarAdapter, PaymentsService } from './payments.module';

/** #533/#534/#550/#553: a read-only, owner-checked payment status; bounded transaction fields; our ref on the return address. */
describe('payment status and the patient view of a transaction', () => {
  const txn = {
    id: 'txn-1', booking_kind: 'pharmacy', booking_id: 'po-1', patient_id: 'pat-1', amount: 115, method: 'card', gateway: 'moyasar',
    status: 'pending', checkout_url: 'https://pay.example.test/x', gateway_intent_id: 'pay_abc', gateway_charge_id: 'pay_abc',
    client_secret: 'secret', webhook_payload: { card: '4111' }, idempotency_key: 'k', _id: 'oid', __v: 0,
  };
  let svc: any;
  let lastQuery: any;
  beforeEach(() => {
    svc = Object.create(PaymentsService.prototype);
    svc.txns = { findOne: jest.fn((q: any) => { lastQuery = q; return { lean: async () => txn }; }) };
    svc.adapter = { verify: jest.fn() };
    svc.events = { emit: jest.fn() };
  });

  it('answers the stored status by our id or the provider id, without calling the provider or emitting anything', async () => {
    const out = await svc.paymentStatus({ id: 'pat-1', role: 'patient' }, 'pay_abc');
    expect(JSON.stringify(lastQuery)).toContain('gateway_intent_id');
    expect(out).toEqual({ id: 'txn-1', booking_kind: 'pharmacy', booking_id: 'po-1', amount: 115, method: 'card', gateway: 'moyasar', gateway_intent_id: 'pay_abc', status: 'pending', checkout_url: 'https://pay.example.test/x' });
    expect(svc.adapter.verify).not.toHaveBeenCalled();
    expect(svc.events.emit).not.toHaveBeenCalled();
  });

  it("another patient's payment answers 404, like a missing one, and a malformed ref never reaches the database", async () => {
    await expect(svc.paymentStatus({ id: 'other', role: 'patient' }, 'txn-1')).rejects.toThrow('txn_not_found');
    svc.txns.findOne.mockClear();
    await expect(svc.paymentStatus({ id: 'pat-1', role: 'patient' }, '{"$ne":1}')).rejects.toThrow('txn_not_found');
    expect(svc.txns.findOne).not.toHaveBeenCalled();
    await expect(svc.paymentStatus({ id: 'adm', role: 'admin' }, 'txn-1')).resolves.toMatchObject({ id: 'txn-1' });
  });

  it('never returns the provider payload, charge id, secret, patient id or idempotency key (except a Stripe client secret)', () => {
    const view = svc.publicTxn(txn);
    for (const k of ['webhook_payload', 'gateway_charge_id', 'client_secret', 'patient_id', 'idempotency_key', '_id', '__v']) expect(view).not.toHaveProperty(k);
    expect(svc.publicTxn({ ...txn, gateway: 'stripe' }).client_secret).toBe('secret');
  });

  it('a paid pharmacy order advertises nothing more to pay', async () => {
    svc.txns = { db: { collection: () => ({ findOne: async () => ({ id: 'po-1', patient_account_id: 'pat-1', selected_offer_id: 'o', pricing_snapshot: { hash: 'h', totals: { total: 115 } }, payment_status: 'paid', quote_accepted_at: new Date() }) }) } };
    await expect(svc.getPharmacyCapabilities({ id: 'pat-1' }, 'po-1')).rejects.toThrow('booking_already_paid');
  });
});

describe('Moyasar return address (#550)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  it('carries our transaction id as ?ref=, before the provider adds its own id and status', async () => {
    process.env.MOYASAR_API_KEY = 'sk_test';
    process.env.PAYMENT_RESULT_URL = 'https://nabd.plus/ar/payments/result';
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'pay_1', source: { transaction_url: 'https://pay.example.test/x' } }) } as any);
    await new MoyasarAdapter().createIntent({ amount: 10, currency: 'SAR', description: 'x', metadata: {}, return_ref: 'txn-9' });
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
    expect(sent.callback_url).toBe('https://nabd.plus/ar/payments/result?ref=txn-9');
  });
});
