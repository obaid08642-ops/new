// 9537426 review: guest cleanup against a real MongoDB (unique sparse indexes are
// what broke it, so a mocked model cannot prove this).
//  - anonymising set email/phone to null; the sparse unique index still stores
//    null, so the SECOND anonymised guest hit E11000 and aborted the run;
//  - linkage looked only at orders and pharmacy_orders, so a guest with a lab
//    booking or a payment was hard-deleted, orphaning those records.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserSchema } from '../../schemas/user.schema';
import { GuestLifecycleService } from './guest-lifecycle.service';

jest.setTimeout(60_000);

describe('GuestLifecycleService on a real MongoDB', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let users: Model<any>;
  const OLD_ENV = process.env;
  const old = new Date('2020-01-01T00:00:00Z');

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest_lifecycle_test' }).asPromise();
    users = conn.model('User', UserSchema);
    await users.syncIndexes();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    process.env = { ...OLD_ENV, GUEST_LIFECYCLE_ENABLED: 'true', GUEST_LIFECYCLE_MONTHS: '12' };
    await conn.db!.dropDatabase();
    await users.syncIndexes();
  });
  afterEach(() => { process.env = OLD_ENV; });

  const guest = (id: string) => ({ id, role: 'patient', is_guest: true, full_name: `Guest ${id}`, email: `${id}@guest.test`, phone: `+9665000000${id.slice(-2)}`, last_login_at: old, updatedAt: old, createdAt: old });
  const insertOld = async (docs: Record<string, unknown>[]) => { await users.collection.insertMany(docs as never[]); };
  const service = () => new GuestLifecycleService(users);

  it('anonymises two order-linked guests without a duplicate-key abort', async () => {
    await insertOld([guest('g-01'), guest('g-02')]);
    await conn.db!.collection('orders').insertMany([{ patient_id: 'g-01' }, { patient_id: 'g-02' }]);
    const out = await service().run();
    expect(out).toMatchObject({ ran: true, anonymised: 2, deleted: 0 });
    const left = await users.collection.find({}).toArray();
    expect(left).toHaveLength(2);
    for (const u of left) {
      expect(u).not.toHaveProperty('email');
      expect(u).not.toHaveProperty('phone');
      expect(u.active).toBe(false);
    }
  });

  it('keeps (anonymises) a guest whose only record is a lab booking or a payment', async () => {
    await insertOld([guest('g-11'), guest('g-12'), guest('g-13')]);
    await conn.db!.collection('labbookings').insertOne({ patient_id: 'g-11' });
    await conn.db!.collection('transactions').insertOne({ patient_id: 'g-12' });
    const out = await service().run();
    expect(out).toMatchObject({ anonymised: 2, deleted: 1 });
    expect(await users.collection.countDocuments({ id: { $in: ['g-11', 'g-12'] } })).toBe(2);
    expect(await users.collection.countDocuments({ id: 'g-13' })).toBe(0);
  });

  it('a guest with nothing linked is deleted together with its sessions and tokens', async () => {
    await insertOld([guest('g-21')]);
    await conn.db!.collection('pushtokens').insertOne({ user_id: 'g-21', token: 'synthetic' });
    await conn.db!.collection('refreshsessions').insertOne({ user_id: 'g-21' });
    await service().run();
    expect(await users.collection.countDocuments({ id: 'g-21' })).toBe(0);
    expect(await conn.db!.collection('pushtokens').countDocuments({ user_id: 'g-21' })).toBe(0);
    expect(await conn.db!.collection('refreshsessions').countDocuments({ user_id: 'g-21' })).toBe(0);
  });
});
