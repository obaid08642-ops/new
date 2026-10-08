import { FraudScoringService } from '../admin/enterprise/fraud-scoring.service';
import {
  aggregateRisk,
  applyThreeDSAdjustment,
  deriveThreeDSOutcome,
  normalizeThreeDSOutcome,
  scorePaymentFraud,
  scoreThreeDS,
  THREE_DS_WEIGHTS,
} from '../admin/enterprise/fraud-scoring.math';

type Doc = Record<string, unknown>;

function makeConn(seed: Record<string, Doc[]>) {
  const store: Record<string, Doc[]> = {
    users: [],
    orders: [],
    coupon_failures: [],
    coupon_usages: [],
    moyasar_payments: [],
    fraud_alerts: [],
    risk_actions: [],
    ...seed,
  };
  const matches = (doc: Doc, filter: Record<string, unknown>): boolean => {
    for (const [k, cond] of Object.entries(filter)) {
      const c = cond as Doc;
      if (c !== null && typeof c === 'object' && !Array.isArray(c) && !(c instanceof Date) && ('$eq' in c || '$gte' in c || '$in' in c)) {
        if ('$eq' in c && doc[k] !== c['$eq']) return false;
        if ('$gte' in c && !((doc[k] as unknown as Date) >= (c['$gte'] as unknown as Date))) return false;
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

const svcOf = (conn: unknown): FraudScoringService =>
  new FraudScoringService(conn as unknown as import('mongoose').Connection);

describe('P22.11+/Phase 1.1 3DS weights (documented)', () => {
  it('unavailable is neutral (0); authenticated lowers; failed/bypassed raise', () => {
    expect(THREE_DS_WEIGHTS.unavailable).toBe(0);
    expect(THREE_DS_WEIGHTS.authenticated).toBeLessThan(0);
    expect(THREE_DS_WEIGHTS.failed).toBeGreaterThan(0);
    expect(THREE_DS_WEIGHTS.bypassed).toBeGreaterThan(0);
    expect(THREE_DS_WEIGHTS.failed).toBeGreaterThan(THREE_DS_WEIGHTS.bypassed);
  });

  it('standalone three_ds sub-score orders authenticated < unavailable < bypassed < failed', () => {
    const a = scoreThreeDS('authenticated');
    const u = scoreThreeDS('unavailable');
    const b = scoreThreeDS('bypassed');
    const f = scoreThreeDS('failed');
    expect(a.score).toBeLessThan(u.score);
    expect(u.score).toBeLessThan(b.score);
    expect(b.score).toBeLessThan(f.score);
    expect(a.flagged).toBe(false);
    expect(u.flagged).toBe(false);
    expect(b.flagged).toBe(true);
    expect(f.flagged).toBe(true);
  });
});

describe('P22.11+/Phase 1.1 payment fraud consumes 3DS outcome', () => {
  const base = { failedLast1h: 0, distinctCardsFailed: 0, duplicatePaidForBooking: false, amountVsMedianRatio: 1 };

  it('authenticated lowers risk vs baseline; failed/bypassed raise it', () => {
    const baseline = scorePaymentFraud(base).score;
    expect(scorePaymentFraud({ ...base, threeDS: 'authenticated' }).score).toBeLessThanOrEqual(baseline);
    expect(scorePaymentFraud({ ...base, threeDS: 'failed' }).score).toBeGreaterThan(baseline);
    expect(scorePaymentFraud({ ...base, threeDS: 'bypassed' }).score).toBeGreaterThan(baseline);
  });

  it('unavailable is neutral: identical score to omitting the signal, never flags alone', () => {
    expect(scorePaymentFraud({ ...base, threeDS: 'unavailable' }).score).toBe(scorePaymentFraud(base).score);
    expect(scorePaymentFraud({ ...base, threeDS: 'unavailable' }).flagged).toBe(false);
    expect(scoreThreeDS('unavailable').flagged).toBe(false);
  });

  it('authenticated dampens the combined score; other outcomes do not', () => {
    const scores = [scorePaymentFraud(base), scoreThreeDS('unavailable')];
    const plain = aggregateRisk(scores).score;
    const dampened = aggregateRisk(scores, 'authenticated').score;
    expect(dampened).toBeLessThanOrEqual(plain);
    expect(applyThreeDSAdjustment(0.5, 'authenticated')).toBe(0.4);
    expect(applyThreeDSAdjustment(0.5, 'failed')).toBe(0.5);
    expect(applyThreeDSAdjustment(0.5, 'unavailable')).toBe(0.5);
  });
});

describe('P22.11+/Phase 1.1 3DS outcome derivation (Paymob is_3d_secure/is_auth)', () => {
  it('normalizes explicit outcome strings', () => {
    expect(normalizeThreeDSOutcome('authenticated')).toBe('authenticated');
    expect(normalizeThreeDSOutcome('challenge_failed')).toBe('failed');
    expect(normalizeThreeDSOutcome('exemption')).toBe('bypassed');
    expect(normalizeThreeDSOutcome('whatever')).toBe('unavailable');
  });

  it('Paymob shape: is_3d_secure + is_auth decide authenticated/failed', () => {
    expect(deriveThreeDSOutcome({ is_3d_secure: true, is_auth: true })).toBe('authenticated');
    expect(deriveThreeDSOutcome({ is_3d_secure: 'true', is_auth: 'true' })).toBe('authenticated');
    expect(deriveThreeDSOutcome({ is_3d_secure: true, is_auth: false })).toBe('failed');
    expect(deriveThreeDSOutcome({ is_3d_secure: true })).toBe('failed');
  });

  it('is_3d_secure=false and unknown shapes are neutral (not fraud)', () => {
    expect(deriveThreeDSOutcome({ is_3d_secure: false, is_auth: false, success: true })).toBe('unavailable');
    expect(deriveThreeDSOutcome({ payment_method: 'cash' })).toBe('unavailable');
    expect(deriveThreeDSOutcome(null)).toBe('unavailable');
    expect(deriveThreeDSOutcome(undefined)).toBe('unavailable');
  });

  it('explicit bypass markers and nested raw_response fields are honored', () => {
    expect(deriveThreeDSOutcome({ three_ds_bypassed: true })).toBe('bypassed');
    expect(deriveThreeDSOutcome({ three_ds_outcome: 'failed' })).toBe('failed');
    expect(deriveThreeDSOutcome({ raw_response: { is_3d_secure: true, is_auth: true } })).toBe('authenticated');
    expect(deriveThreeDSOutcome({ source: { three_ds_outcome: 'bypassed' } })).toBe('bypassed');
  });
});

describe('P22.11+/Phase 1.1 risk dashboard payload exposes three_ds', () => {
  const oldAccount = new Date(Date.now() - 200 * 24 * 3600 * 1000);
  const recent = new Date(Date.now() - 10 * 60 * 1000);
  const seedUser = (id: string, payments: Doc[]) => ({
    users: [{ id, phone: '0550000001', device_tokens: ['d1'], createdAt: oldAccount }],
    orders: [
      { id: `o-${id}`, patient_id: id, payment_method: 'card', payment_status: 'paid', status: 'DELIVERED', total: 60, createdAt: recent },
    ],
    moyasar_payments: payments.map((p, i) => ({ patient_id: id, booking_id: `b-${i}`, createdAt: recent, ...p })),
  });

  it('failed 3DS raises risk and is exposed in the payload', async () => {
    const { conn } = makeConn(seedUser('u-fail', [{ status: 'failed', is_3d_secure: true, is_auth: false }]));
    const out = await svcOf(conn).scoreUser('u-fail');
    expect(out.threeDSOutcome).toBe('failed');
    expect(out.threeDS.flagged).toBe(true);
    expect(out.threeDS.reasons).toContain('three_ds_failed');
    expect(out.paymentFraud.reasons).toContain('three_ds_failed');
    expect(['review', 'block']).toContain(out.action);
  });

  it('authenticated 3DS lowers risk vs the same profile without 3DS data', async () => {
    const { conn: cAuth } = makeConn(seedUser('u-auth', [{ status: 'paid', is_3d_secure: true, is_auth: true }]));
    const authed = await svcOf(cAuth).scoreUser('u-auth');
    const { conn: cNone } = makeConn(seedUser('u-auth', [{ status: 'paid' }]));
    const neutral = await svcOf(cNone).scoreUser('u-auth');
    expect(authed.threeDSOutcome).toBe('authenticated');
    expect(neutral.threeDSOutcome).toBe('unavailable');
    expect(authed.combined).toBeLessThanOrEqual(neutral.combined);
    expect(authed.action).toBe('allow');
  });

  it('cash profile with no 3DS data stays neutral (not fraud)', async () => {
    const { conn } = makeConn(seedUser('u-cash', []));
    const out = await svcOf(conn).scoreUser('u-cash');
    expect(out.threeDSOutcome).toBe('unavailable');
    expect(out.threeDS.flagged).toBe(false);
    expect(out.action).toBe('allow');
  });
});
