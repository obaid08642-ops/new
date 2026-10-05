/**
 * The Moyasar refund endpoint is the SINGULAR `/payments/:id/refund`.
 *
 * Moyasar's own API reference documents exactly one refund route —
 * `POST /payments/:id/refund` (docs.moyasar.com Payments API -> Refund
 * Payment) — and its sibling operations are `/payments/:id/capture` and
 * `/payments/:id/void`. There is no plural `/refunds` route: the local fake
 * gateway the live journeys run against (tools/live/fake_moyasar.py) dispatches
 * `refund` (singular) and 404s anything else, and in production a plural POST
 * fails before the payment is marked refunded, so card refunds become
 * impossible.
 *
 * The three production call sites that POST a Moyasar refund must therefore
 * agree. This spec pins each one's outgoing URL AND then sweeps the whole
 * non-spec backend source for a plural Moyasar refund URL, so a fourth call
 * site — or a regression in any of the three — goes red. That sweep is
 * strictly stronger than asserting two literal URLs.
 *
 * Deliberately NOT touched: the plural `/refunds` literals in StripeAdapter
 * (`POST https://api.stripe.com/v1/refunds`) and TapAdapter
 * (`POST https://api.tap.company/v2/refunds`) are different endpoints for
 * different providers and are not part of this contract.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MoyasarAdapter } from './payments.module';
import { RefundExecutor } from '../finance-engine/finance-engine.module';
import { MoyasarService } from '../moyasar/moyasar.module';
import { CircuitBreakerService } from '../../common/circuit-breaker.service';

const SRC = path.resolve(__dirname, '..', '..');

/** Any `/payments/<something>/refunds` in source — the wrong Moyasar shape. */
const PLURAL_MOYASAR_REFUND = /\/payments\/[^'"`\s]*\/refunds/;

function productionSources(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      productionSources(full, acc);
    } else if (entry.name.endsWith('.ts') && !/\.(spec|acceptance)\.ts$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Moyasar refund URL is singular /payments/:id/refund (stubbed fetch)', () => {
  const realFetch = (globalThis as any).fetch;
  let urls: string[];

  beforeEach(() => {
    urls = [];
    (globalThis as any).fetch = jest.fn(async (url: string) => {
      urls.push(String(url));
      return { ok: true, json: async () => ({ id: 'refund_1', status: 'refunded' }) };
    });
  });

  afterEach(() => {
    (globalThis as any).fetch = realFetch;
  });

  it('MoyasarAdapter.refund posts to /payments/{id}/refund', async () => {
    const adapter = new MoyasarAdapter(undefined);
    await adapter.refund('pay_ABC123', 100);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/\/payments\/pay_ABC123\/refund$/);
    expect(urls[0]).not.toMatch(/\/refunds$/);
  });

  it('MoyasarService.refundPayment posts to /payments/{id}/refund', async () => {
    // MoyasarService reads MOYASAR_API_KEY at construction; without it every
    // refund short-circuits to the sandbox branch and never reaches the gateway.
    const savedEnv = { ...process.env };
    process.env.MOYASAR_API_KEY = 'test-key';
    process.env.MOYASAR_API_BASE = 'https://gateway.test/v1';
    process.env.MOYASAR_TIMEOUT_MS = '5000';
    delete process.env.MOYASAR_WEBHOOK_SECRET;

    try {
      const docs: Record<string, any> = {};
      for (const id of ['pay_MOYASAR1', 'pay_MOYASAR2']) {
        docs[id] = { moyasar_id: id, amount: 50, status: 'paid', save: jest.fn() };
      }
      const paymentModel = {
        findOne: jest.fn(async (q: any) => docs[q?.moyasar_id?.$eq] ?? null),
      };
      const svc = new MoyasarService(
        paymentModel as never,
        { collection: jest.fn() } as never,
        { emit: jest.fn() } as never,
        new CircuitBreakerService(),
      );

      await svc.refundPayment('pay_MOYASAR1');
      await svc.refundPayment('pay_MOYASAR2', 20);

      // Each refund targets its own payment, on the documented singular route.
      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe('https://gateway.test/v1/payments/pay_MOYASAR1/refund');
      expect(urls[1]).toBe('https://gateway.test/v1/payments/pay_MOYASAR2/refund');
    } finally {
      process.env = savedEnv;
    }
  });

  it('RefundExecutor.execute posts the gateway leg to /payments/{id}/refund', async () => {
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
    expect(gatewayCalls[0]).toMatch(/\/payments\/pay_XYZ789\/refund$/);
    expect(gatewayCalls[0]).not.toMatch(/\/refunds$/);
    expect(out).toBeDefined();
  });

  it('no production backend source posts a plural /payments/{id}/refunds', () => {
    const offenders: string[] = [];
    for (const file of productionSources(SRC)) {
      const src = fs.readFileSync(file, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (PLURAL_MOYASAR_REFUND.test(line)) {
          offenders.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});