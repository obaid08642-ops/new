/**
 * Phase 22.11 — seeded fraud patterns are flagged, honest behaviour is not.
 * Real in-memory Mongo; every pattern is written the way the platform writes it (origins, orders, payments, coupons, alerts).
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RiskService } from './risk.service';
import { DEFAULT_RISK_RULES, levelOf, mergeRules } from './risk.rules';
import { runWithLogContext } from '../../common/structured-logger';

jest.setTimeout(120_000);

const HOUR = 3600_000;

describe('Phase 22.11 risk scoring', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let risk: RiskService;
  const col = (n: string) => conn.collection(n);

  beforeAll(async () => {
    process.env.RISK_HASH_KEY = 'test-risk-key';
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'risk' }).asPromise();
    risk = new RiskService(conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    for (const n of ['risk_origins', 'risk_scores', 'pharmacy_orders', 'moyasar_payments', 'coupon_redemptions', 'fraud_alerts', 'system_configs']) {
      if (!(await conn.db!.collections()).some((c) => c.collectionName === n)) await conn.createCollection(n).catch(() => undefined);
      await col(n).deleteMany({});
    }
    (risk as any).recent.clear();
  });

  const origin = (user: string, kind: 'register' | 'login', device: string | null, ip: string | null) =>
    runWithLogContext({ deviceId: device ?? undefined, ip: ip ?? undefined }, () => risk.recordOrigin(user, kind));
  const types = (s: { signals: Array<{ type: string }> } | null) => (s?.signals ?? []).map((x) => x.type).sort();

  describe('account farms and shared devices', () => {
    it('three accounts registered from one device in a day are a farm; two are not', async () => {
      await origin('a1', 'register', 'dev-1', '10.0.0.1');
      await origin('a2', 'register', 'dev-1', '10.0.0.2');
      expect(types(await risk.evaluate('a1', { force: true }))).toEqual([]);
      await origin('a3', 'register', 'dev-1', '10.0.0.3');
      for (const u of ['a1', 'a2', 'a3']) {
        const s = await risk.evaluate(u, { force: true });
        expect(types(s)).toEqual(['account_farm']);
        expect(s!.signals[0].evidence).toMatchObject({ by: 'device', accounts: 3 });
        expect(s!.level).toBe('medium'); // 45 is a look, not a block
      }
    });

    it('five accounts from one address in a day are a farm (a household or an office of two is not)', async () => {
      for (let i = 1; i <= 4; i++) await origin(`n${i}`, 'register', `dev-n${i}`, '203.0.113.9');
      expect(types(await risk.evaluate('n1', { force: true }))).toEqual([]);
      await origin('n5', 'register', 'dev-n5', '203.0.113.9');
      const scored = (await risk.evaluate('n3', { force: true }))!;
      expect(scored.signals[0].evidence).toMatchObject({ by: 'address', accounts: 5 });
      // one shared address alone (a mobile carrier, an office) never reaches the medium level
      expect(scored.level).toBe('low');
    });

    it('registrations spread over weeks on one device are not a farm', async () => {
      for (let i = 1; i <= 3; i++) {
        await origin(`s${i}`, 'register', 'dev-slow', null);
        await col('risk_origins').updateOne({ user_id: `s${i}` }, { $set: { at: new Date(Date.now() - i * 10 * 24 * HOUR) } });
      }
      expect(types(await risk.evaluate('s1', { force: true }))).toEqual([]);
    });

    it('four accounts signed in on one device in a week is device sharing (a weaker signal)', async () => {
      for (let i = 1; i <= 4; i++) await origin(`d${i}`, 'login', 'dev-shared', null);
      const s = await risk.evaluate('d2', { force: true });
      expect(types(s)).toEqual(['device_sharing']);
      expect(s!.level).toBe('low');
    });

    it('stores only keyed hashes of the device and the address, never the raw values, and nothing without a request', async () => {
      await origin('p1', 'register', 'raw-device-id-abc', '198.51.100.77');
      const row: any = await col('risk_origins').findOne({ user_id: 'p1' });
      expect(JSON.stringify(row)).not.toMatch(/raw-device-id-abc|198\.51\.100\.77/);
      expect(row.device_h).toMatch(/^[0-9a-f]{32}$/);
      await risk.recordOrigin('p2', 'login', {});
      expect(await col('risk_origins').countDocuments({ user_id: 'p2' })).toBe(0);
    });
  });

  describe('orders', () => {
    const order = (id: string, user: string, status: string, ageHours: number, cancelledAfterHours?: number, extra: Record<string, unknown> = {}) => {
      const created = new Date(Date.now() - ageHours * HOUR);
      return col('pharmacy_orders').insertOne({
        id, patient_account_id: user, status, createdAt: created,
        timeline: cancelledAfterHours === undefined ? [] : [{ ts: new Date(created.getTime() + cancelledAfterHours * HOUR), event: 'cancelled_by_patient' }],
        ...extra,
      });
    };

    it('four orders cancelled within a day of creation, none delivered, are fake orders', async () => {
      for (let i = 1; i <= 4; i++) await order(`f${i}`, 'u-fake', 'cancelled', 30 + i, 0.2);
      const s = await risk.evaluate('u-fake', { force: true });
      expect(types(s)).toEqual(['fake_orders']);
      expect(s!.signals[0].evidence).toMatchObject({ cancelled_quickly: 4, delivered: 0 });
    });

    it('a patient with a delivered order, or who cancelled days later, or only three times, is not flagged', async () => {
      for (let i = 1; i <= 4; i++) await order(`g${i}`, 'u-ok', 'cancelled', 30 + i, 0.2);
      await order('g-del', 'u-ok', 'delivered', 20);
      expect(types(await risk.evaluate('u-ok', { force: true }))).toEqual([]);
      for (let i = 1; i <= 4; i++) await order(`h${i}`, 'u-slow', 'cancelled', 100 + i, 48);
      expect(types(await risk.evaluate('u-slow', { force: true }))).toEqual([]);
      for (let i = 1; i <= 3; i++) await order(`i${i}`, 'u-three', 'cancelled', 30 + i, 0.2);
      expect(types(await risk.evaluate('u-three', { force: true }))).toEqual([]);
    });

    it('cash-on-delivery orders cancelled after they were on the way, twice in a month, are COD abuse', async () => {
      await col('pharmacy_orders').insertMany([1, 2].map((i) => ({
        id: `c${i}`, patient_account_id: 'u-cod', status: 'cancelled', payment_method: 'cod', createdAt: new Date(Date.now() - 5 * 24 * HOUR),
        timeline: [{ ts: new Date(), event: 'out_for_delivery' }, { ts: new Date(), event: 'cancelled_by_patient' }],
      })));
      expect(types(await risk.evaluate('u-cod', { force: true }))).toEqual(['cod_abuse']);
      await col('pharmacy_orders').insertOne({ id: 'c-card', patient_account_id: 'u-card', status: 'cancelled', payment_method: 'cod', createdAt: new Date(), timeline: [{ ts: new Date(), event: 'cancelled_by_patient' }] });
      expect(types(await risk.evaluate('u-card', { force: true }))).toEqual([]); // cancelled before dispatch is the patient's right
    });
  });

  describe('payments and promotions', () => {
    it('three different cards failing in an hour is card testing', async () => {
      await col('moyasar_payments').insertMany(['4242', '1111', '9999'].map((last4, i) => ({ id: `p${i}`, patient_id: 'u-card-test', status: 'failed', createdAt: new Date(), source: { number: `XXXX-XXXX-XXXX-${last4}` } })));
      const s = await risk.evaluate('u-card-test', { force: true });
      expect(types(s)).toEqual(['card_testing']);
      expect(s!.level).toBe('medium');
      expect(JSON.stringify(s)).not.toMatch(/4242|1111|9999/); // the evidence counts cards, it does not list them
    });

    it('one card failing three times is a typo, not testing', async () => {
      await col('moyasar_payments').insertMany([1, 2, 3].map((i) => ({ id: `q${i}`, patient_id: 'u-typo', status: 'failed', createdAt: new Date(), source: { number: 'XXXX-XXXX-XXXX-4242' } })));
      expect(types(await risk.evaluate('u-typo', { force: true }))).toEqual([]);
    });

    it('three accounts on one device redeeming the same coupon is promo abuse', async () => {
      for (const u of ['k1', 'k2', 'k3']) {
        await origin(u, 'register', 'dev-promo', null);
        await col('coupon_redemptions').insertOne({ code: 'WELCOME', user_id: u, order_id: `o-${u}`, redeemed_at: new Date() });
      }
      const s = await risk.evaluate('k2', { force: true });
      expect(types(s)).toContain('promo_abuse');
      expect(s!.signals.find((x) => x.type === 'promo_abuse')!.evidence).toMatchObject({ coupon: 'WELCOME', accounts_on_one_device: 3 });
    });

    it('the earlier detectors (refund abuse, payment velocity, coupon guessing, duplicate payment) feed the same score', async () => {
      await col('fraud_alerts').insertMany([
        { id: 'fa1', userId: 'u-old', flagType: 'refund_abuse', status: 'pending', confidenceScore: 0.8, createdAt: new Date() },
        { id: 'fa2', userId: 'u-old', flagType: 'payment_velocity_abuse', status: 'pending', confidenceScore: 0.85, createdAt: new Date() },
        { id: 'fa3', userId: 'u-old', flagType: 'duplicate_payment', status: 'resolved', createdAt: new Date() },
      ]);
      const s = await risk.evaluate('u-old', { force: true });
      expect(types(s)).toEqual(['payment_velocity', 'refund_abuse']); // the resolved one no longer counts
      expect(s!.score).toBe(50);
    });
  });

  describe('score, levels and rules', () => {
    it('adds the weights, caps at 100, and names the level', async () => {
      for (const u of ['m1', 'm2', 'm3']) await origin(u, 'register', 'dev-big', '192.0.2.5');
      for (let i = 1; i <= 4; i++) await col('pharmacy_orders').insertOne({ id: `bo${i}`, patient_account_id: 'm1', status: 'cancelled', createdAt: new Date(Date.now() - 30 * HOUR), timeline: [{ ts: new Date(Date.now() - 29 * HOUR), event: 'cancelled_by_patient' }] });
      const s = await risk.evaluate('m1', { force: true });
      expect(types(s)).toEqual(['account_farm', 'fake_orders']);
      expect(s!.score).toBe(85);
      expect(s!.level).toBe('high');
      expect(levelOf(100, DEFAULT_RISK_RULES.levels)).toBe('high');
      expect(levelOf(39, DEFAULT_RISK_RULES.levels)).toBe('low');
    });

    it('a high score raises one admin alert, not one per evaluation', async () => {
      for (const u of ['h1', 'h2', 'h3']) await origin(u, 'register', 'dev-h', null);
      for (let i = 1; i <= 4; i++) await col('pharmacy_orders').insertOne({ id: `ho${i}`, patient_account_id: 'h1', status: 'cancelled', createdAt: new Date(Date.now() - 30 * HOUR), timeline: [{ ts: new Date(Date.now() - 29 * HOUR), event: 'cancelled_by_patient' }] });
      await risk.evaluate('h1', { force: true });
      await risk.evaluate('h1', { force: true });
      const alerts = await col('fraud_alerts').find({ userId: 'h1', flagType: 'risk_high' }).toArray();
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({ severity: 'high', status: 'pending', details: { score: 85 } });
    });

    it('the admin changes the rules in system_configs; a bad number falls back to its default', async () => {
      await col('system_configs').insertOne({ key: 'risk_rules', value: { farm_device_accounts: 2, weights: { account_farm: 80 }, levels: { medium: 30, high: 60 }, fake_orders_cancelled: 'many' } });
      await origin('r1', 'register', 'dev-r', null);
      await origin('r2', 'register', 'dev-r', null);
      const s = await risk.evaluate('r1', { force: true });
      expect(s).toMatchObject({ score: 80, level: 'high' });
      const r = mergeRules({ levels: { medium: 90, high: 10 }, weights: { fake_orders: -5 }, farm_window_hours: 0 });
      expect(r.levels).toEqual(DEFAULT_RISK_RULES.levels); // inverted levels are refused
      expect(r.weights.fake_orders).toBe(DEFAULT_RISK_RULES.weights.fake_orders);
      expect(r.farm_window_hours).toBe(DEFAULT_RISK_RULES.farm_window_hours);
    });

    it('many events for one person rescore at most once every few seconds, unless forced', async () => {
      await origin('t1', 'login', 'dev-t', null);
      expect(await risk.evaluate('t1')).not.toBeNull();
      expect(await risk.evaluate('t1')).toBeNull();
      expect(await risk.evaluate('t1', { force: true })).not.toBeNull();
      expect(await risk.evaluate('t1', { now: Date.now() + RiskService.MIN_GAP_MS + 1 })).not.toBeNull();
    });
  });

  describe('the dashboard', () => {
    it('lists the medium and high scores worst first, filters by level and signal, counts by signal', async () => {
      for (const u of ['x1', 'x2', 'x3']) await origin(u, 'register', 'dev-x', null);
      await col('moyasar_payments').insertMany(['1', '2', '3'].map((n) => ({ id: `xp${n}`, patient_id: 'y1', status: 'failed', createdAt: new Date(), source: { number: `XXXX-${n}` } })));
      for (const u of ['x1', 'x2', 'x3', 'y1', 'z-clean']) await risk.evaluate(u, { force: true });
      const all = await risk.list({});
      expect(all.total).toBe(4);
      expect(all.users[0]).toMatchObject({ user_id: 'y1', score: 50 }); // 50 > 45
      expect((await risk.list({ signal: 'account_farm' })).total).toBe(3);
      expect((await risk.list({ level: 'high' })).total).toBe(0);
      expect((await risk.list({ signal: 'x; drop' })).total).toBe(4); // a bad filter is ignored, not injected
      const s = await risk.summary();
      expect(s).toMatchObject({ scored: 5, high: 0, medium: 4 });
      expect(s.by_signal).toEqual(expect.arrayContaining([{ signal: 'account_farm', users: 3 }, { signal: 'card_testing', users: 1 }]));
      const d = await risk.detail('y1');
      expect(d.score).toMatchObject({ user_id: 'y1', level: 'medium' });
      expect(await risk.list({ limit: 2, page: 2 })).toMatchObject({ page: 2, limit: 2 });
    });
  });
});
