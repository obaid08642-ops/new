/**
 * Q81 regression at the call site the reviewer reproduced: refunding TWO
 * different Moyasar payments.
 *
 * Before the fix, the `moyasar:payments:refund` breaker was cached by name with
 * the FIRST caller's work function, whose closure captured the first
 * `moyasarId`. Every later refund therefore POSTed to
 * `/payments/<first-id>/refund` while the service marked the *later* payment
 * refunded locally — a silent cross-payment mis-refund.
 *
 * These tests pin the per-payment targeting (the Q81 guarantee) AND the exact
 * outgoing URL. The endpoint is the documented singular
 * `POST /payments/:id/refund`, which is what the local fake gateway
 * (tools/live/fake_moyasar.py) serves; a plural `/refunds` would 404 there and
 * in production, so pinning it here also keeps the live journey able to
 * exercise refunds at all.
 */
import { CircuitBreakerService } from '../../common/circuit-breaker.service';
import { MoyasarService } from './moyasar.module';

interface FakePayment {
  moyasar_id: string;
  booking_id: string;
  amount: number;
  status: string;
  refunded_amount: number;
  saved: number;
  save(): Promise<void>;
}

function fakePayment(moyasar_id: string, amount = 100): FakePayment {
  const doc: any = {
    moyasar_id,
    booking_id: `booking_${moyasar_id}`,
    amount,
    status: 'paid',
    refunded_amount: 0,
    saved: 0,
    async save() {
      this.saved += 1;
    },
  };
  return doc;
}

function makeService(payments: FakePayment[], breakers?: CircuitBreakerService) {
  const model = {
    findOne: jest.fn(async ({ moyasar_id }: any) => {
      const id = moyasar_id?.$eq;
      return payments.find((p) => p.moyasar_id === id) ?? null;
    }),
    create: jest.fn(async (doc: any) => fakePayment(doc.moyasar_id ?? 'sandbox', doc.amount)),
  } as any;
  const conn = { collection: jest.fn() } as any;
  const events = { emit: jest.fn() } as any;
  return new MoyasarService(model, conn, events, breakers);
}

describe('MoyasarService.refundPayment — one breaker, many payments (Q81)', () => {
  const savedEnv = { ...process.env };
  let requested: Array<{ url: string; body: any }>;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.MOYASAR_API_KEY = 'test-key';
    process.env.MOYASAR_API_BASE = 'https://gateway.test/v1';
    process.env.MOYASAR_TIMEOUT_MS = '5000';
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    requested = [];
    fetchMock = jest.fn(async (url: any, init: any) => {
      requested.push({
        url: String(url),
        body: init?.body ? JSON.parse(init.body) : undefined,
      });
      return { ok: true, json: async () => ({ id: 'refund_1', status: 'refunded' }) };
    });
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    delete (globalThis as any).fetch;
  });

  it('refunds each payment against ITS OWN id on the shared refund breaker', async () => {
    const first = fakePayment('pay_FIRST0001');
    const second = fakePayment('pay_SECOND002');
    const breakers = new CircuitBreakerService();
    const svc = makeService([first, second], breakers);

    await svc.refundPayment('pay_FIRST0001');
    await svc.refundPayment('pay_SECOND002');

    // The exact defect: the second refund targeted the FIRST payment.
    expect(requested.map((r) => r.url)).toEqual([
      'https://gateway.test/v1/payments/pay_FIRST0001/refund',
      'https://gateway.test/v1/payments/pay_SECOND002/refund',
    ]);
  });

  it('marks the payment that was refunded, never a different one', async () => {
    const first = fakePayment('pay_FIRST0001');
    const second = fakePayment('pay_SECOND002');
    const svc = makeService([first, second], new CircuitBreakerService());

    await svc.refundPayment('pay_FIRST0001');
    await svc.refundPayment('pay_SECOND002');

    expect(first.status).toBe('refunded');
    expect(second.status).toBe('refunded');
    expect(first.saved).toBe(1);
    expect(second.saved).toBe(1);
  });

  it('interleaves refunds across many payments without crossing targets', async () => {
    const ids = ['pay_A', 'pay_B', 'pay_C', 'pay_D', 'pay_E'];
    const payments = ids.map((id) => fakePayment(id));
    const svc = makeService(payments, new CircuitBreakerService());

    for (const id of ids) {
      await svc.refundPayment(id);
    }

    expect(requested.map((r) => r.url)).toEqual(
      ids.map((id) => `https://gateway.test/v1/payments/${id}/refund`),
    );
  });

  it('sends the partial amount in the body of the right payment', async () => {
    const first = fakePayment('pay_FIRST0001', 500);
    const second = fakePayment('pay_SECOND002', 800);
    const svc = makeService([first, second], new CircuitBreakerService());

    await svc.refundPayment('pay_FIRST0001', 100);
    await svc.refundPayment('pay_SECOND002', 250);

    expect(requested).toEqual([
      {
        url: 'https://gateway.test/v1/payments/pay_FIRST0001/refund',
        body: { amount: 10000 },
      },
      {
        url: 'https://gateway.test/v1/payments/pay_SECOND002/refund',
        body: { amount: 25000 },
      },
    ]);
    expect(first.refunded_amount).toBe(100);
    expect(second.refunded_amount).toBe(250);
  });

  it('does not mark a payment refunded when the gateway fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('connection reset'));
    const payment = fakePayment('pay_FIRST0001');
    const svc = makeService([payment], new CircuitBreakerService());

    await expect(svc.refundPayment('pay_FIRST0001')).rejects.toThrow();
    expect(payment.status).toBe('paid');
    expect(payment.saved).toBe(0);
  });

  it('rejects a malformed payment id before any gateway call', async () => {
    const svc = makeService([fakePayment('pay_FIRST0001')], new CircuitBreakerService());

    await expect(svc.refundPayment('pay/../../evil')).rejects.toThrow(
      /invalid_moyasar_payment_id/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});