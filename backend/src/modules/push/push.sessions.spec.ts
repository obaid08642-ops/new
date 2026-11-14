import { PushService } from './push.module';

/** 21.7: a push token is tied to the sign-in it was registered from, so signing that device out removes it. */
describe('PushService tokens and sessions (21.7)', () => {
  const make = () => {
    const calls: any = { upsert: null, deleted: null };
    const service: any = Object.create(PushService.prototype);
    service.tokens = {
      findOneAndUpdate: jest.fn(async (_q: any, update: any) => { calls.upsert = update.$set; return {}; }),
      deleteMany: jest.fn(async (q: any) => { calls.deleted = q; return { deletedCount: 2 }; }),
    };
    return { service, calls };
  };

  it('register records the sign-in id and takes the device id from the token when the app sends none', async () => {
    const { service, calls } = make();
    await service.register({ id: 'u1', sid: 'sid-1', dev: 'dev-abc' }, { token: 'ExponentPushToken[x]' });
    expect(calls.upsert).toMatchObject({ user_id: 'u1', session_id: 'sid-1', device_id: 'dev-abc' });
  });

  it('an explicit device id from the app wins, and no sign-in id means none is stored', async () => {
    const { service, calls } = make();
    await service.register({ id: 'u1' }, { token: 't', device_id: 'dev-body' });
    expect(calls.upsert.device_id).toBe('dev-body');
    expect('session_id' in calls.upsert).toBe(false);
  });

  it('removes the tokens of the ended sign-ins, and older tokens of the same device that carry no sign-in id', async () => {
    const { service, calls } = make();
    expect(await service.removeForSessions('u1', ['s1', 's2'], ['d1'])).toBe(2);
    expect(calls.deleted).toEqual({
      user_id: { $eq: 'u1' },
      $or: [{ session_id: { $in: ['s1', 's2'] } }, { device_id: { $in: ['d1'] }, session_id: { $exists: false } }],
    });
  });

  it('removes nothing when there is nothing to match, so a sign-out can never wipe an account\'s tokens', async () => {
    const { service } = make();
    expect(await service.removeForSessions('u1', [], [])).toBe(0);
    expect(service.tokens.deleteMany).not.toHaveBeenCalled();
  });
});

/** The schema itself must keep `session_id`: Mongoose drops fields it does not know (a mock model cannot show that). */
describe('PushService tokens on a real model (21.7)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mongoose = require('mongoose');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MongoMemoryServer } = require('mongodb-memory-server');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PushTokenSchema } = require('./push.module');
  let mongo: any;
  let conn: any;
  let service: any;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'push-sessions' }).asPromise();
    service = Object.create(PushService.prototype);
    service.tokens = conn.model('PushToken', PushTokenSchema);
  }, 120_000);
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('keeps the sign-in id and removes exactly the ended sign-in\'s tokens', async () => {
    await service.register({ id: 'u1', sid: 'sid-phone', dev: 'dev-phone' }, { token: 'ExponentPushToken[phone]', platform: 'ios' });
    await service.register({ id: 'u1', sid: 'sid-laptop', dev: 'dev-laptop' }, { token: 'ExponentPushToken[laptop]', platform: 'web' });
    const stored = await service.tokens.find({ user_id: 'u1' }).lean();
    expect(stored.map((t: any) => t.session_id).sort()).toEqual(['sid-laptop', 'sid-phone']);
    expect(await service.removeForSessions('u1', ['sid-laptop'], ['dev-laptop'])).toBe(1);
    expect((await service.tokens.find({ user_id: 'u1' }).lean()).map((t: any) => t.token)).toEqual(['ExponentPushToken[phone]']);
  });
});
