// Q81: the refund breaker is cached by name, so the payment id must travel as
// the breaker argument. A captured id sent every later refund to the first
// payment's refund URL while the second payment was marked refunded locally.
import { CircuitBreakerService } from '../../common/circuit-breaker.service';
import { MoyasarService } from './moyasar.module';

describe('MoyasarService.refundPayment (Q81)', () => {
  const realFetch = global.fetch;
  const oldKey = process.env.MOYASAR_API_KEY;
  let urls: string[];

  beforeEach(() => {
    process.env.MOYASAR_API_KEY = 'sk_test_unit';
    urls = [];
    global.fetch = jest.fn(async (url: any) => {
      urls.push(String(url));
      return { ok: true, json: async () => ({ id: 'rf', status: 'refunded' }) } as any;
    }) as any;
  });

  afterEach(() => {
    global.fetch = realFetch;
    if (oldKey === undefined) delete process.env.MOYASAR_API_KEY; else process.env.MOYASAR_API_KEY = oldKey;
  });

  function service() {
    const docs: Record<string, { moyasar_id: string; amount: number; status: string; save: jest.Mock }> = {};
    for (const id of ['pay_aaaa1111', 'pay_bbbb2222']) {
      docs[id] = { moyasar_id: id, amount: 50, status: 'paid', save: jest.fn() };
    }
    const paymentModel = { findOne: jest.fn(async (q: { moyasar_id: { $eq: string } }) => docs[q.moyasar_id.$eq] ?? null) };
    const events = { emit: jest.fn() };
    const svc = new MoyasarService(paymentModel as never, {} as never, events as never, new CircuitBreakerService());
    return { svc, docs };
  }

  it('sends each refund to its own payment', async () => {
    const { svc, docs } = service();
    await svc.refundPayment('pay_aaaa1111');
    await svc.refundPayment('pay_bbbb2222', 20);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toMatch(/\/payments\/pay_aaaa1111\/refund$/);
    expect(urls[1]).toMatch(/\/payments\/pay_bbbb2222\/refund$/);
    expect(docs.pay_aaaa1111.status).toBe('refunded');
    expect(docs.pay_bbbb2222.status).toBe('refunded');
  });
});
