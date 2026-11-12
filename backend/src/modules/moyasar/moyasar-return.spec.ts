import { MoyasarController, MoyasarService } from './moyasar.module';

// PT-24, the money side of the gateway return (GET /moyasar/callback): paid, failed and cancelled. The page the patient lands on is told
// what the GATEWAY says, never what the query string of the browser says, and the return itself moves no money and confirms no booking
// (that stays with the webhook / payments sync, which is idempotent).
describe('payment return from the gateway: paid, failed, cancelled', () => {
  const realFetch = global.fetch;
  const OLD = { ...process.env };
  beforeEach(() => { process.env.MOYASAR_API_KEY = 'sk_test_x'; process.env.PAYMENT_RESULT_URL = 'https://result.test/payments/result'; });
  afterEach(() => { global.fetch = realFetch; process.env = { ...OLD }; });

  function world(invoice: any | Error) {
    const payment: any = { moyasar_id: 'inv_1', status: 'initiated', amount: 50, save: jest.fn(async () => undefined) };
    const model: any = { findOne: jest.fn(async () => payment), create: jest.fn() };
    const emit = jest.fn();
    global.fetch = jest.fn(async () => {
      if (invoice instanceof Error) throw invoice;
      return { ok: true, status: 200, json: async () => invoice } as unknown as Response;
    }) as any;
    const svc = new MoyasarService(model, {} as any, { emit } as any);
    const res: any = { redirect: jest.fn() };
    return { ctrl: new MoyasarController(svc), payment, emit, res };
  }
  const target = (res: any) => new URL(res.redirect.mock.calls[0][0]);

  it('paid at the gateway: the payment is stored paid and the patient is sent to the result page with status=paid and its payment id', async () => {
    const { ctrl, payment, res } = world({ id: 'inv_1', status: 'paid', payments: [{ id: 'pay_9', status: 'paid', source: { type: 'creditcard' } }] });
    await ctrl.callback('inv_1', 'paid', res);
    expect(payment.status).toBe('paid');
    expect(payment.paid_at).toBeInstanceOf(Date);
    expect(target(res).origin + target(res).pathname).toBe('https://result.test/payments/result');
    expect(Object.fromEntries(target(res).searchParams)).toEqual({ status: 'paid', id: 'inv_1' });
  });

  it('failed at the gateway: stored failed with the reason, the page is told failed, and no money event is emitted', async () => {
    const { ctrl, payment, emit, res } = world({ id: 'inv_1', status: 'failed', payments: [{ id: 'pay_9', status: 'failed', source: { type: 'creditcard', message: 'DECLINED' } }] });
    await ctrl.callback('inv_1', 'failed', res);
    expect(payment).toMatchObject({ status: 'failed', failure_reason: 'DECLINED' });
    expect(payment.paid_at).toBeUndefined();
    expect(target(res).searchParams.get('status')).toBe('failed');
    expect(emit).not.toHaveBeenCalled();
  });

  it('cancelled by the patient (no payment attempt on the invoice): never shown as paid, stays unpaid, nothing charged or emitted', async () => {
    const { ctrl, payment, emit, res } = world({ id: 'inv_1', status: 'canceled', payments: [] });
    await ctrl.callback('inv_1', 'canceled', res);
    expect(payment.status).toBe('initiated');
    expect(payment.paid_at).toBeUndefined();
    expect(target(res).searchParams.get('status')).not.toBe('paid');
    expect(emit).not.toHaveBeenCalled();
  });

  it('a browser that says status=paid cannot make a failed payment look paid: the gateway wins', async () => {
    const { ctrl, res } = world({ id: 'inv_1', status: 'failed', payments: [{ id: 'pay_9', status: 'failed', source: { type: 'creditcard', message: 'DECLINED' } }] });
    await ctrl.callback('inv_1', 'paid', res);
    expect(target(res).searchParams.get('status')).toBe('failed');
  });

  it('the gateway cannot be reached on return: the payment keeps its stored status and the return still lands on the result page', async () => {
    const { ctrl, payment, res } = world(new Error('socket hang up'));
    await ctrl.callback('inv_1', undefined, res);
    expect(payment.status).toBe('initiated');
    expect(target(res).searchParams.get('status')).toBe('initiated');
  });
});
