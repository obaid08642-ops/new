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
