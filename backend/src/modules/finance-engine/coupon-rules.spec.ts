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
  beforeEach(async () => { for (const c of ['coupons', 'coupon_usages', 'coupon_user_counts', 'coupon_failures', 'orders', 'pharmacy_orders']) await conn.collection(c).deleteMany({}); });

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

  it('a coupon made on the admin screen (discount_type/value, min_basket, expires_at, usage_limit_total) is priced and limited at checkout', async () => {
    const adminShape = { discount_percent: undefined, discount_type: 'percent', value: 20, max_discount_cap: 15, min_basket: 100, usage_limit_total: 1, expires_at: new Date(Date.now() + day) };
    await add(adminShape);
    expect(await why({ order_total: 99 })).toBe('min_order_100');
    expect((await svc.validate('u1', 'C1', { order_total: 200 })).discount).toBe(15); // 20% = 40, capped at 15
    await svc.apply('u1', 'C1', 'o1', { order_total: 200 });
    expect(await why({ order_total: 200 }, 'C1', 'u2')).toBe('max_uses_reached'); // usage_limit_total = 1
    await conn.collection('coupons').updateOne({ code: 'C1' }, { $set: { expires_at: new Date(Date.now() - day), used_count: 0 } });
    expect(await why({ order_total: 200 }, 'C1', 'u3')).toBe('expired');
    await conn.collection('coupons').updateOne({ code: 'C1' }, { $set: { discount_type: 'amount', value: 30, expires_at: null, max_discount_cap: null } });
    expect((await svc.validate('u3', 'C1', { order_total: 200 })).discount).toBe(30);
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
