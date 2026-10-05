/**
 * F7 — the Moyasar refund URL is plural `/refunds`.
 *
 * The reviewed-correct path (`MoyasarService.refundPayment`, pinned by
 * `moyasar-refund-q81.spec.ts`) posts to `/payments/{id}/refunds`, but the
 * payments-adapter and finance-engine refund paths posted to singular
 * `/refund`. These tests pin the outgoing URL of both call sites so a
 * regression to the singular form goes red.
 */
import { MoyasarAdapter } from './payments.module';
import { RefundExecutor } from '../finance-engine/finance-engine.module';

describe('F7 Moyasar refund URL is plural /refunds (stubbed fetch)', () => {
  const realFetch = (globalThis as any).fetch;
  let urls: string[];

  beforeEach(() => {
    urls = [];
    (globalThis as any).fetch = jest.fn(async (url: string) => {
      urls.push(String(url));
      return { ok: true, json: async () => ({ id: 'refund_1' }) };
    });
  });

  afterEach(() => {
    (globalThis as any).fetch = realFetch;
  });

  it('MoyasarAdapter.refund posts to /payments/{id}/refunds', async () => {
    const adapter = new MoyasarAdapter(undefined);
    await adapter.refund('pay_ABC123', 100);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/\/payments\/pay_ABC123\/refunds$/);
    expect(urls[0]).not.toMatch(/\/refund$/);
  });

  it('RefundExecutor.execute posts the gateway leg to /payments/{id}/refunds', async () => {
    const paidPayment = {
      _id: 'mongo-1',
      moyasar_id: 'pay_XYZ789',
      booking_id: 'bk-1',
      amount: 200,
      refunded_amount: 0,
      status: 'paid',
    };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'moyasar_payments') return { findOne: jest.fn(async () => paidPayment), updateOne: jest.fn(async () => ({})) };
        if (name === 'transactions') return { findOne: jest.fn(async () => null) };
        if (name === 'appointments') {
          return { findOne: jest.fn(async () => ({ id: 'bk-1', patient_id: 'pat-1', payment_method: 'card' })), updateOne: jest.fn(async () => ({})) };
        }
        return { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({})), insertOne: jest.fn(async () => ({})) };
      }),
    };
    const ledger: any = { exists: jest.fn(async () => false), append: jest.fn(async () => ({})), record: jest.fn(async () => ({})) };
    // RefundExecutor only uses ledger.exists on this path; stub the rest loosely.
    const executor = new RefundExecutor(conn, ledger, {} as any, { emit: jest.fn() } as any);
    // Bypass post-gateway ledger/notify internals if they need more surface:
    // they run against the same mocked conn/ledger above.
    process.env.MOYASAR_API_KEY = process.env.MOYASAR_API_KEY || 'test-key';
    const out = await executor.execute({
      refund_id: 'refund-1',
      booking_kind: 'consultation',
      booking_id: 'bk-1',
      patient_id: 'pat-1',
      amount: 50,
      reason: 'test',
      actor_id: 'admin-1',
    }).catch((e: any) => ({ ok: false, method: `threw:${e?.message}` }) as any);

    const gatewayCalls = urls.filter((u) => u.includes('/payments/'));
    expect(gatewayCalls).toHaveLength(1);
    expect(gatewayCalls[0]).toMatch(/\/payments\/pay_XYZ789\/refunds$/);
    expect(out).toBeDefined();
  });
});
