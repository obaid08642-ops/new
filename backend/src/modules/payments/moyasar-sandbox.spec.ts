import * as fs from 'fs';
import * as path from 'path';
import { MoyasarAdapter, PaymentsService } from './payments.module';
import { isMoyasarWebhookAuthenticated } from '../../common/moyasar-webhook-auth';

/**
 * #551: the Moyasar flow end to end against recorded, documented-shape fixtures (test/fixtures/moyasar):
 * create the hosted checkout (invoice), the payer's redirect, the webhook proof, settle, refund.
 * No network and no real key: global fetch is replaced and the keys below are dummies.
 */
const fx = (n: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../../test/fixtures/moyasar', n), 'utf8'));
const jsonRes = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;

describe('Moyasar sandbox flow (fixtures)', () => {
  const env = { ...process.env };
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    process.env.MOYASAR_API_KEY = 'sk_test_FIXTURE_NOT_A_REAL_KEY';
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_FIXTURE_NOT_A_REAL_SECRET';
    process.env.MOYASAR_API_BASE = 'https://api.moyasar.test/v1';
    process.env.PAYMENT_RESULT_URL = 'https://nabd.example/payments/result';
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => { fetchMock.mockRestore(); process.env = { ...env }; });

  const adapter = () => new MoyasarAdapter();

  it('creates the hosted checkout as an invoice with our return address, amount in halalas, and no card source', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-created.json'), 201));
    const out = await adapter().createIntent({ amount: 150, currency: 'SAR', description: 'Nabd consultation #abcd1234', metadata: {}, return_ref: 'txn 1' });
    expect(out).toEqual({ intent_id: fx('invoice-created.json').id, checkout_url: fx('invoice-created.json').url });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.moyasar.test/v1/invoices');
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ amount: 15000, currency: 'SAR', callback_url: 'https://nabd.example/payments/result?ref=txn%201' });
    expect(sent.source).toBeUndefined();
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('sk_test_FIXTURE_NOT_A_REAL_KEY:').toString('base64')}`);
  });

  it('a provider error while creating is a gateway error, never a checkout', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ type: 'invalid_request_error', message: 'amount invalid' }, 400));
    await expect(adapter().createIntent({ amount: 150, currency: 'SAR', description: 'x', metadata: {} })).rejects.toBeDefined();
  });

  it('verify: an invoice with a paid payment is paid, the charge is that payment, the raw record is the payment', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-paid.json')));
    const out = await adapter().verify(fx('invoice-paid.json').id);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.moyasar.test/v1/invoices/${fx('invoice-paid.json').id}`);
    expect(out.status).toBe('paid');
    expect(out.charge_id).toBe(fx('invoice-paid.json').payments[0].id);
    expect(out.raw).toMatchObject({ amount: 15000, currency: 'SAR' });
  });

  it('verify: an unpaid invoice stays pending (also after an attempt that has not settled); a declined one is failed', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-created.json')));
    expect((await adapter().verify('i')).status).toBe('pending');
    fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-initiated-unpaid-attempt.json')));
    expect((await adapter().verify('i')).status).toBe('pending');
    fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-failed.json')));
    expect((await adapter().verify('i')).status).toBe('failed');
  });

  it('refund: POST /payments/:id/refund (singular) with the amount in halalas', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(fx('payment-refunded.json')));
    const out = await adapter().refund('pay-1', 40);
    expect(out.refunded).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.moyasar.test/v1/payments/pay-1/refund');
    expect(JSON.parse(init.body)).toEqual({ amount: 4000 });
  });

  it('refund: a provider refusal is not a refund', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ type: 'invalid_request_error', message: 'already refunded' }, 400));
    expect((await adapter().refund('pay-1')).refunded).toBe(false);
  });

  describe('webhook proof', () => {
    it('accepts the documented body secret_token and refuses a wrong or missing one', () => {
      const body = fx('webhook-payment-paid.json');
      expect(isMoyasarWebhookAuthenticated(body, undefined, JSON.stringify(body))).toBe(true);
      expect(isMoyasarWebhookAuthenticated({ ...body, secret_token: 'nope' }, undefined, '{}')).toBe(false);
      const { secret_token: _drop, ...noToken } = body;
      expect(isMoyasarWebhookAuthenticated(noToken, undefined, '{}')).toBe(false);
    });
  });

  describe('service: redirect callback and webhook settle by the invoice, replays and refunds do not regress', () => {
    const make = (txn: any) => {
      const svc: any = Object.create(PaymentsService.prototype);
      svc.txns = { findOne: jest.fn(async () => txn) };
      svc.adapter = new MoyasarAdapter();
      svc.events = { emit: jest.fn() };
      svc.realtime = { emitToUser: jest.fn() };
      svc.fraud = { detectDuplicatePayments: jest.fn(async () => null), checkPaymentVelocity: jest.fn(async () => false) };
      svc.logger = { error: jest.fn() };
      svc.modelFor = jest.fn(() => ({ updateOne: jest.fn() }));
      return svc;
    };
    const txn = (over: any = {}) => ({ id: 'tx1', patient_id: 'p1', gateway: 'moyasar', gateway_intent_id: fx('invoice-paid.json').id, amount: 150, currency: 'SAR', status: 'pending', booking_kind: 'lab', booking_id: 'lb1', save: jest.fn(), ...over });
    const payer = { id: 'p1', role: 'patient' };

    it('the payer returns from 3DS: verify reads the invoice and settles once at the right amount', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-paid.json')));
      const t = txn(); const svc = make(t);
      const out = await svc.verifyPayment(payer, 'tx1');
      expect(out.status).toBe('paid');
      expect(t.gateway_charge_id).toBe(fx('invoice-paid.json').payments[0].id);
      expect(svc.events.emit).toHaveBeenCalledWith('payment.completed', expect.objectContaining({ transaction_id: 'tx1' }));
    });

    it('a paid invoice for another amount does not settle', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-paid.json')));
      const t = txn({ amount: 99 }); const svc = make(t);
      expect((await svc.verifyPayment(payer, 'tx1')).status).toBe('failed');
      expect(svc.events.emit).not.toHaveBeenCalledWith('payment.completed', expect.anything());
    });

    it('the payment_paid webhook finds our transaction by data.invoice_id and settles it', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes(fx('invoice-paid.json')));
      const t = txn(); const svc = make(t);
      const hook = fx('webhook-payment-paid.json');
      const out = await svc.handleWebhook('moyasar', hook, undefined, JSON.stringify(hook));
      expect(out).toEqual({ ok: true });
      expect(svc.txns.findOne.mock.calls[0][0].$or[0].gateway_intent_id.$in).toContain(fx('invoice-paid.json').id);
      expect(t.status).toBe('paid');
    });

    it('a webhook with a wrong secret is refused and calls nothing', async () => {
      const svc = make(txn());
      await expect(svc.handleWebhook('moyasar', { ...fx('webhook-payment-paid.json'), secret_token: 'bad' }, undefined, '{}')).rejects.toThrow('invalid_webhook_signature');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the payment_refunded webhook on a refunded transaction changes nothing and does not ask the provider', async () => {
      const t = txn({ status: 'refunded', refunded_amount: 150 }); const svc = make(t);
      const hook = fx('webhook-payment-refunded.json');
      expect(await svc.handleWebhook('moyasar', hook, undefined, JSON.stringify(hook))).toEqual({ ok: true });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(t.status).toBe('refunded');
      expect(svc.events.emit).not.toHaveBeenCalled();
    });

    it('refund goes to the settled payment (the charge), not the invoice', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes(fx('payment-refunded.json')));
      const t = txn({ status: 'paid', gateway_charge_id: 'charge-9' }); const svc = make(t);
      const out = await svc.refundTransactionAsSystem('tx1', undefined, 'test');
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.moyasar.test/v1/payments/charge-9/refund');
      expect(out.txn.status).toBe('refunded');
    });
  });
});
