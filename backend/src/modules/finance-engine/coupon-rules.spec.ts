/** PT-20 - coupons: every rule that decides a discount, and that a cancelled order gives its use back. Real MongoDB. */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CouponService } from './finance-engine.module';

jest.setTimeout(120_000);

describe('CouponService rules', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: CouponService;
  const day = 86400000;
  const add = (over: Record<string, unknown> = {}) => conn.collection('coupons').insertOne({ code: 'C1', active: true, discount_percent: 10, used_count: 0, ...over } as any);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'cr' }).asPromise();
    svc = new CouponService(conn);
    await svc.ensureIndexes();
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => { for (const c of ['coupons', 'coupon_usages', 'coupon_failures', 'orders', 'pharmacy_orders']) await conn.collection(c).deleteMany({}); });

  const why = async (ctx: any = { order_total: 100 }, code = 'C1', user = 'u1') => (await svc.validate(user, code, ctx)).reason;

  it('percent discount, rounded to halalas', async () => {
    await add({ discount_percent: 12.5 });
    expect((await svc.validate('u1', 'c1', { order_total: 99.99 })).discount).toBe(12.5); // the code is case-insensitive
  });

  it('a fixed amount, capped at the cart and at max_discount', async () => {
    await add({ discount_percent: undefined, discount_amount: 50 });
    expect((await svc.validate('u1', 'C1', { order_total: 30 })).discount).toBe(30);
    await conn.collection('coupons').updateOne({ code: 'C1' }, { $set: { max_discount: 20 } });
    expect((await svc.validate('u1', 'C1', { order_total: 300 })).discount).toBe(20);
  });

  it('unknown, inactive, not yet valid, expired', async () => {
    expect(await why()).toBe('not_found');
    await add({ active: false });
    expect(await why()).toBe('inactive');
    await conn.collection('coupons').updateOne({ code: 'C1' }, { $set: { active: true, valid_from: new Date(Date.now() + day) } });
    expect(await why()).toBe('not_yet_valid');
    await conn.collection('coupons').updateOne({ code: 'C1' }, { $set: { valid_from: new Date(Date.now() - 2 * day), valid_until: new Date(Date.now() - day) } });
    expect(await why()).toBe('expired');
  });

  it('minimum order, provider and category scope', async () => {
    await add({ min_order: 150, provider_id: 'ph1', categories: ['skin'] });
    expect(await why({ order_total: 100, provider_id: 'ph1', categories: ['skin'] })).toBe('min_order_150');
    expect(await why({ order_total: 200, provider_id: 'ph2', categories: ['skin'] })).toBe('wrong_provider');
    expect(await why({ order_total: 200, provider_id: 'ph1', categories: ['hair'] })).toBe('wrong_category');
    expect((await svc.validate('u1', 'C1', { order_total: 200, provider_id: 'ph1', categories: ['skin'] })).valid).toBe(true);
  });

  it('first order only: a previous order (legacy or current) refuses it', async () => {
    await add({ first_order_only: true });
    expect((await svc.validate('u1', 'C1', { order_total: 100 })).valid).toBe(true);
    await conn.collection('pharmacy_orders').insertOne({ patient_account_id: 'u1', status: 'delivered' } as any);
    expect(await why()).toBe('first_order_only');
    expect((await svc.validate('u2', 'C1', { order_total: 100 })).valid).toBe(true);
  });

  it('one use per account by default; usage_limit_per_user raises it; max_uses is total', async () => {
    await add({ max_uses: 2 });
    await svc.apply('u1', 'C1', 'o1', { order_total: 100 });
    expect(await why({ order_total: 100 }, 'C1', 'u1')).toBe('already_used');
    await svc.apply('u2', 'C1', 'o2', { order_total: 100 });
    expect(await why({ order_total: 100 }, 'C1', 'u3')).toBe('max_uses_reached');
    await conn.collection('coupons').updateOne({ code: 'C1' }, { $set: { max_uses: 10, usage_limit_per_user: 2 } });
    expect((await svc.validate('u1', 'C1', { order_total: 100 })).valid).toBe(true);
  });

  it('the same order cannot take the coupon twice, and the counter is rolled back', async () => {
    await add({ usage_limit_per_user: 5 });
    await svc.apply('u1', 'C1', 'o1', { order_total: 100 });
    await expect(svc.apply('u1', 'C1', 'o1', { order_total: 100 })).rejects.toThrow('already_applied');
    expect((await conn.collection('coupons').findOne({ code: 'C1' }) as any).used_count).toBe(1);
  });

  it('a cancelled unpaid order gives the use back', async () => {
    await add();
    await svc.apply('u1', 'C1', 'o1', { order_total: 100 });
    await svc.release('o1');
    expect((await conn.collection('coupons').findOne({ code: 'C1' }) as any).used_count).toBe(0);
    expect((await svc.validate('u1', 'C1', { order_total: 100 })).valid).toBe(true);
    await expect(svc.release('o-never')).resolves.toBeUndefined();
  });
});
