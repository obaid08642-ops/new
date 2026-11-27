/** Money step M2: `<field>_minor` + currency next to the legacy amount; `_halalas` for SAR documents only. Real MongoDB, a test schema (no production schema uses the plugin yet). */
import mongoose, { Connection, Model, Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { halalaShadowPlugin, moneyShadows } from './halala-shadow';
import { minorFields, minorShadowPlugin, resolveWriteCurrency } from './minor-shadow';
import { runWithMarketContext } from '../modules/markets/market-context';

jest.setTimeout(120_000);
const inMarket = <T>(currency: string, fn: () => T) => runWithMarketContext({ currency } as any, fn);

describe('resolveWriteCurrency / minorFields', () => {
  it('own currency, else market, else SAR; unknown codes are ignored, never guessed', () => {
    expect(resolveWriteCurrency()).toBe('SAR');
    expect(resolveWriteCurrency('BHD')).toBe('BHD');
    expect(resolveWriteCurrency('xyz')).toBe('SAR');
    expect(inMarket('KWD', () => resolveWriteCurrency())).toBe('KWD');
    expect(inMarket('KWD', () => resolveWriteCurrency('SAR'))).toBe('SAR');
  });
  it('minorFields for raw writes: clean amounts only, with the currency', () => {
    expect(minorFields({ amount: 150.5, fee: 'x' }, ['amount', 'fee'])).toEqual({ amount_minor: 15050, currency: 'SAR' });
    expect(minorFields({ amount: 1.234, currency: 'BHD' }, ['amount'])).toEqual({ amount_minor: 1234, currency: 'BHD' });
    expect(minorFields({ amount: 0.1 + 0.2 }, ['amount'])).toEqual({});
  });
});

describe('moneyShadows (raw writes)', () => {
  it('SAR: halalas + minor + currency; BHD: minor + currency only', () => {
    expect(moneyShadows({ price: 10.5 }, ['price'], 'SAR')).toEqual({ price_halalas: 1050, price_minor: 1050, currency: 'SAR' });
    expect(moneyShadows({ price: 1.234 }, ['price'], 'BHD')).toEqual({ price_minor: 1234, currency: 'BHD' });
    expect(moneyShadows({ price: 0.1 + 0.2 }, ['price'], 'BHD')).toEqual({});
  });
});

describe('minorShadowPlugin', () => {
  let mongo: MongoMemoryServer; let conn: Connection; let M: Model<any>; let n = 0;
  const raw = (id: string) => conn.collection('ms').findOne({ id } as any) as Promise<any>;
  const make = (over: Record<string, unknown> = {}) => M.create({ id: `d${++n}`, amount: 150.5, ...over });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'ms' }).asPromise();
    const s = new Schema({ id: String, amount: Number, refunded: Number }, { collection: 'ms' });
    halalaShadowPlugin(s, ['amount', 'refunded']);
    minorShadowPlugin(s, ['amount', 'refunded']);
    M = conn.model('Ms', s);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('SAR: _minor equals _halalas, currency is SAR, the legacy amount is untouched', async () => {
    const d = await make({ amount: 99.99 });
    const r = await raw(d.id);
    expect(r.amount).toBe(99.99);
    expect(r.amount_minor).toBe(9999);
    expect(r.amount_minor).toBe(r.amount_halalas);
    expect(r.currency).toBe('SAR');
  });

  it('BHD document: 3 digits in _minor, no _halalas', async () => {
    const d = await make({ amount: 1.234, currency: 'BHD' });
    const r = await raw(d.id);
    expect(r.amount_minor).toBe(1234);
    expect(r.amount_halalas).toBeUndefined();
    expect(r.currency).toBe('BHD');
  });

  it('currency from the MarketContext when the document has none', async () => {
    const d = await inMarket('KWD', () => make({ amount: 2.5 }));
    const r = await raw(d.id);
    expect(r.currency).toBe('KWD');
    expect(r.amount_minor).toBe(2500);
    expect(r.amount_halalas).toBeUndefined();
  });

  it('a value that is not a whole number of minor units is not rounded: no shadow', async () => {
    const d = await make({ amount: 0.1 + 0.2 });
    const r = await raw(d.id);
    expect(r.amount_minor).toBeUndefined();
    expect(r.amount_halalas).toBeUndefined();
  });

  it('save() of a changed field updates that field only', async () => {
    const d = await make({ amount: 10 });
    d.refunded = 2.25; await d.save();
    const r = await raw(d.id);
    expect(r.refunded_minor).toBe(225);
    expect(r.amount_minor).toBe(1000);
  });

  it('updateOne $set and $inc keep the shadows in step (SAR and BHD)', async () => {
    const d = await make({ amount: 10 });
    await M.updateOne({ id: d.id }, { $set: { amount: 20.5 }, $inc: { refunded: 1.5 } });
    let r = await raw(d.id);
    expect(r.amount_minor).toBe(2050); expect(r.amount_halalas).toBe(2050);
    expect(r.refunded_minor).toBe(150); expect(r.refunded_halalas).toBe(150);
    const b = await make({ amount: 1, currency: 'BHD' });
    await inMarket('BHD', async () => { await M.updateOne({ id: b.id }, { $inc: { amount: 0.125 } }); });
    r = await raw(b.id);
    expect(r.amount_minor).toBe(1125);   // 1000 + the delta: $inc moves the shadow by the delta, like the halala plugin
    expect(r.amount_halalas).toBeUndefined();
    await M.updateOne({ id: b.id }, { $set: { amount: 2.5, currency: 'BHD' } });   // currency named in the update itself
    expect((await raw(b.id)).amount_minor).toBe(2500);
  });

  it('an update that names no currency and runs outside any market uses SAR: a BHD amount that is not clean SAR is left without a shadow (listed by the integrity check, never rounded)', async () => {
    const b = await make({ amount: 1, currency: 'BHD' });
    await M.updateOne({ id: b.id }, { $inc: { amount: 0.125 } });
    const r = await raw(b.id);
    expect(r.amount).toBe(1.125);
    expect(r.amount_minor).toBe(1000);   // stale, not wrong-rounded; M4 compares amount with amount_minor per currency
  });

  it('findOneAndUpdate and updateMany are covered', async () => {
    const d = await make({ amount: 5 });
    await M.findOneAndUpdate({ id: d.id }, { amount: 7.25 });
    expect((await raw(d.id)).amount_minor).toBe(725);
    await M.updateMany({ id: d.id }, { $set: { amount: 8 } });
    expect((await raw(d.id)).amount_minor).toBe(800);
  });

  it('a stored document with no currency stays in the default currency when saved inside another market', async () => {
    const ins = await conn.collection('ms').insertOne({ id: `legacy${++n}`, amount: 5 } as any);
    const doc: any = await M.findOne({ _id: ins.insertedId });
    doc.amount = 7.55;
    await inMarket('BHD', () => doc.save());
    const r = await conn.collection('ms').findOne({ _id: ins.insertedId } as any) as any;
    expect(r.currency).toBe('SAR');
    expect(r.amount_minor).toBe(755);   // SAR: 755 halalas (in BHD it would have been 7550 fils)
  });

  it('toJSON hides *_minor; legacy fields and currency stay', async () => {
    const d = await make({ amount: 3 });
    const j: any = (await M.findOne({ id: d.id })).toJSON();
    expect(j.amount).toBe(3);
    expect(j.currency).toBe('SAR');
    expect('amount_minor' in j).toBe(false);
  });
});
