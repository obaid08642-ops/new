import { FraudScoringService } from './fraud-scoring.service';
import {
  aggregateRisk,
  gateway3DSCapabilities,
  scoreAccountFarm,
  scoreCodAbuse,
  scoreFakeOrder,
  scorePaymentFraud,
  scorePromoAbuse,
  threeDSHook,
} from './fraud-scoring.math';

type Doc = Record<string, unknown>;

interface Seed {
  users: Doc[];
  orders: Doc[];
  coupon_failures: Doc[];
  coupon_usages: Doc[];
  moyasar_payments: Doc[];
  fraud_alerts: Doc[];
  risk_actions: Doc[];
}

function makeConn(seed: Partial<Seed>) {
  const store: Record<string, Doc[]> = {
    users: [],
    orders: [],
    coupon_failures: [],
    coupon_usages: [],
    moyasar_payments: [],
    fraud_alerts: [],
    risk_actions: [],
    ...(seed as Record<string, Doc[]>),
  };
  const get = (v: unknown): unknown => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      const o = v as Doc;
      if ('$eq' in o) return o['$eq'];
      if ('$gte' in o) return o['$gte'];
    }
    return v;
  };
  const matches = (doc: Doc, filter: Record<string, unknown>): boolean => {
    for (const [k, cond] of Object.entries(filter)) {
      const c = cond as Doc;
      if (c !== null && typeof c === 'object' && !Array.isArray(c) && !(c instanceof Date) && ('$eq' in c || '$gte' in c || '$in' in c)) {
        if ('$eq' in c && doc[k] !== c['$eq']) return false;
        if ('$gte' in c && !((doc[k] as unknown as Date) >= (c['$gte'] as unknown as Date))) return false;
        void get;
      } else if (doc[k] !== (cond as unknown)) return false;
    }
    return true;
  };
  const conn = {
    collection: (name: string) => ({
      findOne: async (f: Record<string, unknown>): Promise<Doc | null> =>
        (store[name] || []).find((d) => matches(d, f)) ?? null,
      insertOne: async (d: Doc): Promise<{ insertedId: unknown }> => {
        (store[name] = store[name] || []).push(d);
        return { insertedId: d['id'] };
      },
      updateOne: async (f: Record<string, unknown>, u: Record<string, unknown>): Promise<{ modifiedCount: number }> => {
        const d = (store[name] || []).find((x) => matches(x, f));
        if (!d) return { modifiedCount: 0 };
        Object.assign(d, (u['$set'] as Doc) || {});
        return { modifiedCount: 1 };
      },
      find: (f: Record<string, unknown>) => ({
        toArray: async (): Promise<Doc[]> => (store[name] || []).filter((d) => matches(d, f)),
        limit: (n: number) => ({
          toArray: async (): Promise<Doc[]> => (store[name] || []).filter((d) => matches(d, f)).slice(0, n),
        }),
      }),
      countDocuments: async (f: Record<string, unknown>): Promise<number> =>
        (store[name] || []).filter((d) => matches(d, f)).length,
    }),
  };
  return { store, conn };
}

const now = Date.now();
const minutesAgo = (m: number): Date => new Date(now - m * 60 * 1000);

describe('P22.11 fraud math (pure)', () => {
  it('fake-order pattern flags COD first-order new accounts', () => {
    const r = scoreFakeOrder({
      isCod: true,
      accountAgeDays: 1,
      orderTotal: 800,
      priorCompletedOrders: 0,
      addressChangesLast24h: 0,
      phonesOnSameDevice: 0,
    });
    expect(r.flagged).toBe(true);
    expect(r.reasons).toContain('cod_first_order_new_account');
    const legit = scoreFakeOrder({
      isCod: true,
      accountAgeDays: 200,
      orderTotal: 60,
      priorCompletedOrders: 12,
      addressChangesLast24h: 0,
      phonesOnSameDevice: 1,
    });
    expect(legit.flagged).toBe(false);
  });

  it('COD abuse flags chronic cancellers', () => {
    expect(scoreCodAbuse({ codOrders: 8, codCancelled: 6, codUnpaid: 0 }).flagged).toBe(true);
    expect(scoreCodAbuse({ codOrders: 8, codCancelled: 1, codUnpaid: 0 }).flagged).toBe(false);
  });

  it('account farms flag device over-limit (mirrors DeviceLimitGuard max 3)', () => {
    expect(scoreAccountFarm({ accountsOnDevice: 5, accountsSamePhonePrefix: 0, registrationsLast24h: 1 }).flagged).toBe(true);
    expect(scoreAccountFarm({ accountsOnDevice: 2, accountsSamePhonePrefix: 0, registrationsLast24h: 1 }).flagged).toBe(false);
  });

  it('promo abuse flags coupon guessing bursts', () => {
    expect(scorePromoAbuse({ couponFailuresLast1h: 8, distinctCodesFailed: 7, usagesLast24h: 0 }).flagged).toBe(true);
    expect(scorePromoAbuse({ couponFailuresLast1h: 1, distinctCodesFailed: 1, usagesLast24h: 1 }).flagged).toBe(false);
  });

  it('payment fraud flags card-testing velocity + duplicate paid bookings', () => {
    expect(
      scorePaymentFraud({ failedLast1h: 6, distinctCardsFailed: 0, duplicatePaidForBooking: false, amountVsMedianRatio: 1 }).flagged,
    ).toBe(true);
    expect(
      scorePaymentFraud({ failedLast1h: 0, distinctCardsFailed: 0, duplicatePaidForBooking: true, amountVsMedianRatio: 1 }).flagged,
    ).toBe(false);
    expect(
      scorePaymentFraud({ failedLast1h: 6, distinctCardsFailed: 0, duplicatePaidForBooking: true, amountVsMedianRatio: 1 }).score,
    ).toBeGreaterThan(0.6);
  });

  it('aggregateRisk escalates allow < review < block', () => {
    const allow = aggregateRisk([
      scoreCodAbuse({ codOrders: 1, codCancelled: 0, codUnpaid: 0 }),
      scorePromoAbuse({ couponFailuresLast1h: 0, distinctCodesFailed: 0, usagesLast24h: 0 }),
    ]);
    expect(allow.action).toBe('allow');
    const block = aggregateRisk([
      scoreCodAbuse({ codOrders: 8, codCancelled: 7, codUnpaid: 2 }),
      scorePromoAbuse({ couponFailuresLast1h: 9, distinctCodesFailed: 8, usagesLast24h: 6 }),
      scorePaymentFraud({ failedLast1h: 7, distinctCardsFailed: 3, duplicatePaidForBooking: true, amountVsMedianRatio: 6 }),
    ]);
    expect(block.action).toBe('block');
  });

  it('3DS matrix covers Moyasar/Stripe/Tap; HyperPay unavailable', () => {
    const caps = gateway3DSCapabilities();
    expect(caps.find((c) => c.provider === 'moyasar')?.supports3DS).toBe(true);
    expect(caps.find((c) => c.provider === 'stripe')?.supports3DS).toBe(true);
    expect(caps.find((c) => c.provider === 'tap')?.supports3DS).toBe(true);
    expect(caps.find((c) => c.provider === 'hyperpay')?.supports3DS).toBe(false);
    expect(threeDSHook({ paymentMethod: 'card', riskScore: 0.9, orderTotal: 50, provider: 'moyasar' }).required).toBe(true);
    expect(threeDSHook({ paymentMethod: 'card', riskScore: 0.1, orderTotal: 50, provider: 'moyasar' }).required).toBe(false);
    expect(threeDSHook({ paymentMethod: 'cash', riskScore: 0.9, orderTotal: 50, provider: 'moyasar' }).required).toBe(false);
    expect(threeDSHook({ paymentMethod: 'card', riskScore: 0.9, orderTotal: 50, provider: 'hyperpay' }).reason).toBe(
      'gateway_no_3ds_path',
    );
  });
});

describe('P22.11 FraudScoringService seeded patterns (mocked store)', () => {
  const seedFarmAndAbuse = (): Partial<Seed> => ({
    users: [
      { id: 'u-fraud', phone: '0550000001', device_tokens: ['d1', 'd2', 'd3', 'd4', 'd5'], createdAt: minutesAgo(60 * 20) },
    ],
    orders: [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `o-cod-${i}`,
        patient_id: 'u-fraud',
        payment_method: 'cash',
        payment_status: 'unpaid',
        status: 'CANCELLED',
        total: 800,
        createdAt: minutesAgo(30),
      })),
    ],
    coupon_failures: Array.from({ length: 8 }, (_, i) => ({
      user_id: 'u-fraud',
      code: `GUESS${i}`,
      at: minutesAgo(10),
    })),
    coupon_usages: [],
    moyasar_payments: [
      ...Array.from({ length: 6 }, (_, i) => ({
        patient_id: 'u-fraud',
        booking_id: `b-${i}`,
        status: 'failed',
        amount: 100,
        createdAt: minutesAgo(20),
      })),
      { patient_id: 'u-fraud', booking_id: 'b-dup', status: 'paid', amount: 200, createdAt: minutesAgo(50) },
      { patient_id: 'u-fraud', booking_id: 'b-dup', status: 'paid', amount: 200, createdAt: minutesAgo(40) },
    ],
    fraud_alerts: [],
    risk_actions: [],
  });

  it('seeded fraud patterns are flagged with action review/block', async () => {
    const { conn } = makeConn(seedFarmAndAbuse());
    const svc = new FraudScoringService(conn as unknown as import('mongoose').Connection);
    const out = await svc.scoreUser('u-fraud');
    expect(out.fakeOrder.flagged).toBe(true);
    expect(out.codAbuse.flagged).toBe(true);
    expect(out.accountFarm.flagged).toBe(true);
    expect(out.promoAbuse.flagged).toBe(true);
    expect(out.paymentFraud.flagged).toBe(true);
    expect(['review', 'block']).toContain(out.action);
  });

  it('clean users are allowed', async () => {
    const { conn } = makeConn({
      users: [{ id: 'u-clean', phone: '0550000099', device_tokens: ['d9'], createdAt: minutesAgo(60 * 24 * 200) }],
      orders: [
        { id: 'o-1', patient_id: 'u-clean', payment_method: 'card', payment_status: 'paid', status: 'DELIVERED', total: 60, createdAt: minutesAgo(60) },
      ],
      coupon_failures: [],
      coupon_usages: [],
      moyasar_payments: [],
      fraud_alerts: [],
      risk_actions: [],
    });
    const svc = new FraudScoringService(conn as unknown as import('mongoose').Connection);
    const out = await svc.scoreUser('u-clean');
    expect(out.action).toBe('allow');
  });

  it('raiseAlert is idempotent; queue + actOnAlert work the queue', async () => {
    const { store, conn } = makeConn(seedFarmAndAbuse());
    const svc = new FraudScoringService(conn as unknown as import('mongoose').Connection);
    const a = await svc.raiseAlert({ userId: 'u-fraud', flagType: 'promo_abuse', confidence: 0.8, idempotencyKey: 'idem-risk-1' });
    const b = await svc.raiseAlert({ userId: 'u-fraud', flagType: 'promo_abuse', confidence: 0.8, idempotencyKey: 'idem-risk-1' });
    expect(a['id']).toBe(b['id']);
    expect(store['fraud_alerts'].length).toBe(1);
    const q = await svc.queue('pending');
    expect(q.length).toBe(1);
    const act = await svc.actOnAlert(String(a['id']), 'dismiss', 'reviewed: false positive pattern', 'idem-act-1');
    expect(act['action']).toBe('dismiss');
    const after = await svc.queue('dismissed');
    expect(after.length).toBe(1);
  });
});
