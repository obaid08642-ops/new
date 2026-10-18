/** 16.12 - referral fraud: one person (phone / device) per referral, atomically, and a cap per referrer. Real MongoDB. */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReferralService, REFERRAL_IDENTITY_USED } from './referral.service';

jest.setTimeout(120_000);

describe('ReferralService fraud rules', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: ReferralService;
  const emitted: Array<{ ev: string; p: any }> = [];
  const events: any = { emit: (ev: string, p: any) => emitted.push({ ev, p }) };
  const newUser = async (id: string, extra: Record<string, unknown> = {}) =>
    conn.collection('users').insertOne({ id, full_name: id, createdAt: new Date(), ...extra });
  const codeOf = async (id: string) => svc.getOrCreateCode(id);

  beforeAll(async () => {
    process.env.JWT_SECRET = 'referral-test-secret';
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'ref' }).asPromise();
    svc = new ReferralService(conn, events);
    await svc.onModuleInit();
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => {
    for (const c of ['users', 'referral_invites', 'appointments', 'security_events']) await conn.collection(c).deleteMany({});
    emitted.length = 0;
    delete process.env.REFERRAL_MAX_REWARDS_PER_MONTH;
  });

  it('the happy path: a new person with their own phone and device is registered, then rewarded once', async () => {
    await newUser('ref', { phone: '+966500000001' });
    await newUser('new1', { phone: '+966500000002' });
    await expect(svc.apply('new1', await codeOf('ref'), 'dev-new1')).resolves.toMatchObject({ ok: true, status: 'registered' });
    const inv: any = await conn.collection('referral_invites').findOne({ referred_user_id: 'new1' });
    expect(inv.referred_phone_hash).toMatch(/^[0-9a-f]{40}$/);
    expect(JSON.stringify(inv)).not.toMatch(/966500000002|dev-new1/);           // only hashes are stored
    await svc.onBookingCompleted({ user_id: 'new1', booking_id: 'b1' });
    await svc.onBookingCompleted({ user_id: 'new1', booking_id: 'b2' });         // a second completion rewards nothing more
    expect(emitted.filter((e) => e.ev === 'referral.converted')).toHaveLength(1);
  });

  it('a phone that is already in a referral cannot be used for another account', async () => {
    await newUser('ref', { phone: '+966500000001' });
    await newUser('a', { phone: '+966500000009' });
    await newUser('b', { phone: '+966500000009' });                              // the same number on a second account
    const code = await codeOf('ref');
    await svc.apply('a', code, 'dev-a');
    await expect(svc.apply('b', code, 'dev-b')).rejects.toThrow(REFERRAL_IDENTITY_USED);
    expect(await conn.collection('referral_invites').countDocuments({})).toBe(1);
    expect(await conn.collection('security_events').countDocuments({ type: 'referral_blocked', reason: 'identity_already_referred' })).toBe(1);
  });

  it('a device that is already in a referral cannot be used for another account, even under another referrer', async () => {
    await newUser('ref1', { phone: '+966500000011' });
    await newUser('ref2', { phone: '+966500000012' });
    await newUser('a', { phone: '+966500000021' });
    await newUser('b', { phone: '+966500000022' });
    await svc.apply('a', await codeOf('ref1'), 'shared-device');
    await expect(svc.apply('b', await codeOf('ref2'), 'shared-device')).rejects.toThrow(REFERRAL_IDENTITY_USED);
  });

  it("the referrer's own second account (same phone, or a device the referrer uses) is refused", async () => {
    await newUser('ref', { phone: '+966500000031' });
    await newUser('alt-same-phone', { phone: '+966500000031' });
    await newUser('alt-same-device', { phone: '+966500000032' });
    const code = await codeOf('ref');
    await expect(svc.apply('alt-same-phone', code, 'dev-x')).rejects.toThrow('cannot use your own referral code');
    await svc.myDashboard('ref', 'referrer-phone-device');                       // the referrer is seen on this device
    await expect(svc.apply('alt-same-device', code, 'referrer-phone-device')).rejects.toThrow('cannot use your own referral code');
    expect(await conn.collection('referral_invites').countDocuments({})).toBe(0);
  });

  it('an account with no phone and no device cannot be verified as a person and is refused', async () => {
    await newUser('ref', { phone: '+966500000041' });
    await newUser('ghost');                                                      // no phone on the account
    await expect(svc.apply('ghost', await codeOf('ref'))).rejects.toThrow('referral_identity_required');
  });

  it('the request cannot supply its own phone: only the account phone counts', async () => {
    await newUser('ref', { phone: '+966500000051' });
    await newUser('a', { phone: '+966500000052' });
    await svc.apply('a', await codeOf('ref'), 'dev-a');
    const inv: any = await conn.collection('referral_invites').findOne({ referred_user_id: 'a' });
    expect(inv.referred_phone_hash).toBe(ReferralService.identityHash('phone', '+966500000052'));
    expect(inv.referred_phone_hash).not.toBe(ReferralService.identityHash('phone', '+966500000051'));
  });

  it('two requests at once for the same person: exactly one invite is stored (the unique index decides)', async () => {
    await newUser('ref', { phone: '+966500000061' });
    for (let i = 0; i < 6; i++) await newUser(`u${i}`, { phone: '+966500000099' });   // six accounts, one phone
    const code = await codeOf('ref');
    const results = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => svc.apply(`u${i}`, code, `dev-${i}`)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await conn.collection('referral_invites').countDocuments({})).toBe(1);
  });

  it('a referrer is rewarded for at most REFERRAL_MAX_REWARDS_PER_MONTH conversions; the rest are held without points', async () => {
    process.env.REFERRAL_MAX_REWARDS_PER_MONTH = '2';
    await newUser('ref', { phone: '+966500000071' });
    const code = await codeOf('ref');
    for (let i = 0; i < 4; i++) {
      await newUser(`n${i}`, { phone: `+96650000008${i}` });
      await svc.apply(`n${i}`, code, `dev-n${i}`);
      await svc.onBookingCompleted({ user_id: `n${i}`, booking_id: `b${i}` });
    }
    const states = (await conn.collection('referral_invites').find({}).toArray()).map((i: any) => i.status).sort();
    expect(states).toEqual(['held', 'held', 'rewarded', 'rewarded']);
    expect(emitted.filter((e) => e.ev === 'referral.converted')).toHaveLength(2);
    expect(await conn.collection('security_events').countDocuments({ reason: 'referrer_monthly_cap' })).toBe(2);
    const held: any = await conn.collection('referral_invites').findOne({ status: 'held' });
    expect(held.reward_points).toBe(0);
  });

  it('the old rules still hold: unknown code, own code, second code, an old account', async () => {
    await newUser('ref', { phone: '+966500000091' });
    await newUser('old', { phone: '+966500000092', createdAt: new Date(Date.now() - 40 * 86400000) });
    await newUser('fresh', { phone: '+966500000093' });
    const code = await codeOf('ref');
    await expect(svc.apply('fresh', 'NOPE-123456', 'd')).rejects.toThrow('invalid referral code');
    await expect(svc.apply('ref', code, 'd')).rejects.toThrow('cannot use your own referral code');
    await expect(svc.apply('old', code, 'd')).rejects.toThrow('only be applied to new accounts');
    await svc.apply('fresh', code, 'd-fresh');
    await expect(svc.apply('fresh', code, 'd-fresh')).rejects.toThrow('already applied');
  });
});
