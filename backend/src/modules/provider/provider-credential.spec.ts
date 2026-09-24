import * as bcrypt from 'bcryptjs';
import { findLinkedUser, unifyProviderPasswords } from './provider-credential';
import { makeDb } from '../../../test/support/fake-db';

describe('P3.0b provider credential unification (users wins)', () => {
  let userHash: string;
  let otherHash: string;

  beforeAll(async () => {
    userHash = await bcrypt.hash('UserPass1', 4);
    otherHash = await bcrypt.hash('StaleProv1', 4);
  });

  async function seed() {
    const db = makeDb();
    const users = db.collection('users');
    const accs = db.collection('provider_accounts');
    // same: identical hashes
    await users.insertOne({ id: 'u-same', email: 'same@x.test', password_hash: userHash });
    await accs.insertOne({ id: 'u-same', user_id: 'u-same', email: 'same@x.test', password_hash: userHash });
    // differ: both real → users wins
    await users.insertOne({ id: 'u-diff', email: 'diff@x.test', password_hash: userHash });
    await accs.insertOne({ id: 'u-diff', user_id: 'u-diff', email: 'diff@x.test', password_hash: otherHash });
    // placeholder on the account
    await users.insertOne({ id: 'u-ph', email: 'ph@x.test', password_hash: userHash });
    await accs.insertOne({ id: 'u-ph', user_id: 'u-ph', email: 'ph@x.test', password_hash: 'onboarding' });
    // users has no hash, account does → backfill users
    await users.insertOne({ id: 'u-nohash', email: 'nohash@x.test' });
    await accs.insertOne({ id: 'u-nohash', user_id: 'u-nohash', email: 'nohash@x.test', password_hash: otherHash });
    // hospital-style: random account id, linked only by email → link backfilled
    await users.insertOne({ id: 'u-hosp', email: 'hosp@x.test', password_hash: userHash });
    await accs.insertOne({ id: 'acc-random', email: 'hosp@x.test', password_hash: otherHash });
    // orphan
    await accs.insertOne({ id: 'acc-orphan', email: 'orphan@x.test', password_hash: otherHash, status: 'approved' });
    // neither side usable
    await users.insertOne({ id: 'u-none', email: 'none@x.test' });
    await accs.insertOne({ id: 'u-none', user_id: 'u-none', email: 'none@x.test', password_hash: 'onboarding' });
    return db;
  }

  it('dry-run reports counts and writes nothing', async () => {
    const db = await seed();
    const r = await unifyProviderPasswords(db, { apply: false });
    expect(r).toMatchObject({ total: 7, same: 1, differ_users_wins: 2, account_hash_placeholder: 1, backfill_user_from_account: 1, no_usable_hash: 1, link_backfilled: 1 });
    expect(r.orphans.map((o) => o.id)).toEqual(['acc-orphan']);
    const diff: any = await db.collection('provider_accounts').findOne({ id: 'u-diff' }).lean();
    expect(diff.password_hash).toBe(otherHash);
    const hosp: any = await db.collection('provider_accounts').findOne({ id: 'acc-random' }).lean();
    expect(hosp.user_id).toBeUndefined();
    const nohash: any = await db.collection('users').findOne({ id: 'u-nohash' }).lean();
    expect(nohash.password_hash).toBeUndefined();
  });

  it('apply: users hash wins; users backfilled only when it had none; links written', async () => {
    const db = await seed();
    await unifyProviderPasswords(db, { apply: true });
    const acc = async (id: string) => db.collection('provider_accounts').findOne({ id }).lean() as any;
    expect((await acc('u-diff')).password_hash).toBe(userHash);
    expect((await acc('u-ph')).password_hash).toBe(userHash);
    expect((await acc('acc-random')).user_id).toBe('u-hosp');
    expect((await acc('acc-random')).password_hash).toBe(userHash);
    const nohash: any = await db.collection('users').findOne({ id: 'u-nohash' }).lean();
    expect(nohash.password_hash).toBe(otherHash);
    const diffUser: any = await db.collection('users').findOne({ id: 'u-diff' }).lean();
    expect(diffUser.password_hash).toBe(userHash);
    // Idempotent: a second dry-run finds nothing left to change.
    const again = await unifyProviderPasswords(db, { apply: false });
    expect(again).toMatchObject({ differ_users_wins: 0, account_hash_placeholder: 0, backfill_user_from_account: 0, link_backfilled: 0 });
  });

  it('findLinkedUser resolves user_id → shared id → email', async () => {
    const db = await seed();
    expect((await findLinkedUser(db, { id: 'x', user_id: 'u-diff' }))?.id).toBe('u-diff');
    expect((await findLinkedUser(db, { id: 'u-same' }))?.id).toBe('u-same');
    expect((await findLinkedUser(db, { id: 'acc-random', email: 'HOSP@x.test ' }))?.id).toBe('u-hosp');
    expect(await findLinkedUser(db, { id: 'acc-orphan', email: 'orphan@x.test' })).toBeNull();
  });
});
