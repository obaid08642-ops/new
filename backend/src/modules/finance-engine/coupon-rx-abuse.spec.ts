/** 16.12 - coupons: nothing on prescription-only lines, no guessing, one use per account, no overuse under a race. Real MongoDB. */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CouponService, LoyaltyRedeemService, couponEligibleTotal } from './finance-engine.module';

jest.setTimeout(120_000);

describe('CouponService abuse rules', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: CouponService;
  const coupon = (over: Record<string, unknown> = {}) => conn.collection('coupons').insertOne({ code: 'SAVE10', active: true, discount_percent: 10, used_count: 0, ...over });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'cp' }).asPromise();
    svc = new CouponService(conn);
    await svc.ensureIndexes();
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => { for (const c of ['coupons', 'coupon_usages', 'coupon_failures', 'orders', 'pharmacy_orders']) await conn.collection(c).deleteMany({}); });

  it('the discount is worked out on the part of the cart that is not prescription-only', async () => {
    await coupon();
    const v = await svc.validate('u1', 'SAVE10', { order_total: 200, rx_total: 150 });   // 150 SAR of Rx, 50 SAR of OTC
    expect(v.valid).toBe(true);
    expect(v.discount).toBe(5);                                                             // 10% of 50, not of 200
    expect((await svc.validate('u1', 'SAVE10', { order_total: 200 })).discount).toBe(20);   // no Rx: the whole cart
  });

  it('a fixed-amount coupon never exceeds the OTC part of the cart', async () => {
    await coupon({ code: 'FIVE', discount_percent: undefined, discount_amount: 30 });
    expect((await svc.validate('u1', 'FIVE', { order_total: 100, rx_total: 80 })).discount).toBe(20);
  });

  it('a cart that is all prescription-only gets no coupon at all', async () => {
    await coupon();
    expect(await svc.validate('u1', 'SAVE10', { order_total: 120, rx_total: 120 })).toMatchObject({ valid: false, reason: 'rx_only_cart', discount: 0 });
    await expect(svc.apply('u1', 'SAVE10', 'o1', { order_total: 120, rx_total: 120 })).rejects.toThrow('rx_only_cart');
    expect(await conn.collection('coupon_usages').countDocuments({})).toBe(0);
  });

  it('a minimum order is measured on the OTC part too (an Rx line cannot satisfy it)', async () => {
    await coupon({ min_order: 100 });
    expect((await svc.validate('u1', 'SAVE10', { order_total: 150, rx_total: 100 })).reason).toBe('min_order_100');
    expect((await svc.validate('u1', 'SAVE10', { order_total: 250, rx_total: 100 })).valid).toBe(true);
  });

  it('couponEligibleTotal is safe on bad input', () => {
    expect(couponEligibleTotal({ order_total: 100, rx_total: -50 })).toBe(100);
    expect(couponEligibleTotal({ order_total: 100, rx_total: 500 })).toBe(0);
    expect(couponEligibleTotal({ order_total: NaN })).toBe(0);
  });

  it('ten refused codes in an hour stop further guessing, even for a code that exists', async () => {
    await coupon();
    for (let i = 0; i < 10; i++) expect((await svc.validate('guesser', `NOPE${i}`, { order_total: 100 })).reason).toBe('not_found');
    expect(await svc.validate('guesser', 'SAVE10', { order_total: 100 })).toMatchObject({ valid: false, reason: 'too_many_attempts' });
    expect((await svc.validate('someone-else', 'SAVE10', { order_total: 100 })).valid).toBe(true);   // other accounts are untouched
  });

  it('one use per account: the second order with the same code is refused', async () => {
    await coupon();
    await svc.apply('u1', 'SAVE10', 'o1', { order_total: 100 });
    expect((await svc.validate('u1', 'SAVE10', { order_total: 100 })).reason).toBe('already_used');
  });

  it('a coupon with max_uses cannot be overused by parallel orders', async () => {
    await coupon({ code: 'ONLY3', max_uses: 3 });
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => svc.apply(`user-${i}`, 'ONLY3', `order-${i}`, { order_total: 100 })));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    const c: any = await conn.collection('coupons').findOne({ code: 'ONLY3' });
    expect(c.used_count).toBe(3);
  });

  it('cancelling an unpaid order gives the use back exactly once', async () => {
    await coupon({ code: 'ONE', max_uses: 1 });
    await svc.apply('u1', 'ONE', 'o1', { order_total: 100 });
    await svc.release('o1');
    await svc.release('o1');
    expect(((await conn.collection('coupons').findOne({ code: 'ONE' })) as any).used_count).toBe(0);
  });
});

describe('loyalty redemption is worked out on the non-prescription part', () => {
  function build(balance = 100000) {
    const service: any = Object.create(LoyaltyRedeemService.prototype);
    service.conn = {
      collection: (name: string) => ({
        findOne: async () => (name === 'loyalty_accounts' ? { user_id: 'u1', points: balance } : null),
        updateOne: async () => ({ matchedCount: 1 }),
        insertOne: async () => ({}),
      }),
    };
    return service as LoyaltyRedeemService;
  }
  it('the cap is 10% of the OTC part: Rx lines add nothing to what points may pay', async () => {
    const q = await build().quote('u1', 200, 150);              // 50 SAR eligible -> 5 SAR cap -> 50 points at 0.1 SAR
    expect(q.max_discount_sar).toBe(5);
    expect((await build().quote('u1', 200, 0)).max_discount_sar).toBe(20);
  });
  it('an all-prescription cart cannot be paid down with points', async () => {
    const q = await build().quote('u1', 120, 120);
    expect(q.max_points_for_order).toBe(0);
    await expect(build().redeem('u1', 'o1', 10, 120, 120)).rejects.toThrow(/points_exceed_cap: max 0/);
  });
});
