/** Money step M5a: bookings and orders carry `<field>_minor` + `currency` (frozen at creation); SAR rows are identical to the halala shadows; API output unchanged. Real MongoDB, real schemas. */
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppointmentSchema, APPOINTMENT_HALALA_FIELDS } from './appointment.schema';
import { LabBookingSchema, LAB_BOOKING_HALALA_FIELDS } from './lab.schema';
import { RadiologyBookingSchema, RADIOLOGY_BOOKING_HALALA_FIELDS } from './radiology.schema';
import { HomeCareBookingSchema, HOME_CARE_BOOKING_HALALA_FIELDS } from './home-care.schema';
import { OrderSchema, ORDER_HALALA_FIELDS } from './order.schema';
import { runWithMarketContext } from '../modules/markets/market-context';

jest.setTimeout(120_000);
const inMarket = <T>(currency: string, fn: () => T) => runWithMarketContext({ currency } as any, fn);

const CASES: Array<[string, any, string[], string]> = [
  ['appointments', AppointmentSchema, APPOINTMENT_HALALA_FIELDS, 'appointments'],
  ['lab bookings', LabBookingSchema, LAB_BOOKING_HALALA_FIELDS, 'labbookings'],
  ['radiology bookings', RadiologyBookingSchema, RADIOLOGY_BOOKING_HALALA_FIELDS, 'radiologybookings'],
  ['home care bookings', HomeCareBookingSchema, HOME_CARE_BOOKING_HALALA_FIELDS, 'homecarebookings'],
  ['orders', OrderSchema, ORDER_HALALA_FIELDS, 'orders'],
];

describe.each(CASES)('%s: money step M5a', (_name, schema, fields, collection) => {
  let mongo: MongoMemoryServer; let conn: Connection; let M: Model<any>; let n = 0;
  const first = fields[0];
  // the required business fields are not the point here: only the shadow hooks are, so validation is skipped
  const make = (over: Record<string, unknown> = {}) => new M({ [first]: 150.5, ...over }).save({ validateBeforeSave: false });
  const raw = (id: unknown) => conn.collection(collection).findOne({ _id: id } as any) as Promise<any>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: `m5a${++n}` }).asPromise();
    M = conn.model(`M5a_${collection}`, schema, collection);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('every named money field has a Number `<field>_minor` path, optional and with no default; `currency` exists', () => {
    for (const f of fields) {
      const p: any = schema.path(`${f}_minor`);
      expect([`${f}_minor`, p?.instance]).toEqual([`${f}_minor`, 'Number']);
      expect(p.isRequired).toBeFalsy();
      expect(p.options.default).toBeUndefined();
    }
    expect(schema.path('currency')?.instance).toBe('String');
  });

  it('SAR (no market): `_minor` equals `_halalas`, currency SAR, the double is untouched', async () => {
    const d = await make();
    const r = await raw(d._id);
    expect(r[first]).toBe(150.5);
    expect(r[`${first}_minor`]).toBe(15050);
    expect(r[`${first}_minor`]).toBe(r[`${first}_halalas`]);
    expect(r.currency).toBe('SAR');
  });

  it('created inside a BHD market: BHD from the market, 3 digits, no halalas', async () => {
    const d = await inMarket('BHD', () => make({ [first]: 12.345 }));
    const r = await raw(d._id);
    expect(r.currency).toBe('BHD');
    expect(r[`${first}_minor`]).toBe(12345);
    expect(r[`${first}_halalas`]).toBeUndefined();
  });

  it('the currency is frozen at creation: a later save outside any market keeps BHD', async () => {
    const d = await inMarket('BHD', () => make({ [first]: 1 }));
    const again: any = await M.findOne({ _id: d._id });
    again.set(first, 2.5); await again.save({ validateBeforeSave: false });
    const r = await raw(d._id);
    expect(r.currency).toBe('BHD');
    expect(r[`${first}_minor`]).toBe(2500);
  });

  it('a booking stored before currencies existed (no currency field) stays SAR when saved inside another market', async () => {
    const ins = await conn.collection(collection).insertOne({ [first]: 10, [`${first}_halalas`]: 1000 } as any);
    const doc: any = await inMarket('BHD', () => M.findOne({ _id: ins.insertedId }));
    doc.set(first, 10.55);
    await inMarket('BHD', () => doc.save({ validateBeforeSave: false }));
    const r = await raw(ins.insertedId);
    expect(r.currency).toBe('SAR');
    expect(r[`${first}_halalas`]).toBe(1055);
    expect(r[`${first}_minor`]).toBe(1055);   // SAR: in BHD it would have been 10550 fils
  });

  it('API output is unchanged: toJSON shows neither `*_minor` nor the new `currency`', async () => {
    const d: any = await M.findOne({ _id: (await make())._id });
    const j = d.toJSON();
    expect(j[first]).toBe(150.5);
    expect(Object.keys(j).filter((k) => k.endsWith('_minor'))).toEqual([]);
    expect('currency' in j).toBe(false);
  });
});
