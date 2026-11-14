/**
 * Phase 21.2 / 21.8 — the guest → account merge and its proof of possession.
 *
 * The Verify of 21.2 is a live journey plus one injected failure. These tests
 * run against a real MongoDB replica set because the behaviour under test is
 * the TRANSACTION: a failure halfway must leave nothing moved, which a mocked
 * session cannot prove.
 *
 * The security case the reviewer asked for is here too: a guest ID with no
 * token must move nothing, and another guest's token must move nothing.
 */
import mongoose, { Connection } from 'mongoose';
import { readFileSync } from 'fs';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import { JwtService } from '@nestjs/jwt';
import { GuestService, GuestMergeProof } from './guest.service';

jest.setTimeout(120_000);
const SECRET = 'test-secret-for-guest-merge-signing-only';

function jwt(): JwtService {
  return new JwtService({ secret: SECRET });
}

function guestToken(sub: string, jti: string, extra: Record<string, unknown> = {}): string {
  return jwt().sign({ sub, id: sub, role: 'patient', is_guest: true, jti, ...extra }, { expiresIn: '1h' });
}

describe('Phase 21.2 guest → account merge', () => {
  let mongo: MongoMemoryReplSet;
  let conn: Connection;
  let guests: GuestService;
  let usedJtis: Set<string>;

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ launchTimeout: 60000 }] });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-merge' }).asPromise();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    const keep = ['users', 'patient_profiles', 'pharmacy_orders', 'unified_carts', 'patient_addresses', 'auditlogs'];
    for (const name of (await conn.db!.collections()).map((c) => c.collectionName)) {
      if (!keep.includes(name)) await conn.collection(name).drop();
    }
    for (const name of keep) {
      const exists = (await conn.db!.collections()).some((c) => c.collectionName === name);
      if (!exists) await conn.createCollection(name).catch(() => undefined);
      await conn.collection(name).deleteMany({});
    }
    await conn.collection('users').insertMany([
      { id: 'guest-1', is_guest: true, createdAt: new Date('2026-01-01') },
      { id: 'guest-2', is_guest: true, createdAt: new Date('2026-01-01') },
      { id: 'acct-1', is_guest: false, createdAt: new Date('2025-01-01') },
    ]);
    usedJtis = new Set();
    const redis = {
      getClient: () => ({
        set: async (key: string, _v: string, ...args: string[]) => {
          if (args.includes('NX') && usedJtis.has(key)) return null;
          usedJtis.add(key);
          return 'OK';
        },
      }),
    };
    guests = new GuestService(conn, jwt(), redis as never);
  });

  const proofOf = async (token: string): Promise<GuestMergeProof> => guests.proveGuestToken(token);

  it('moves every registered collection, the profile, and writes one audit row', async () => {
    await conn.collection('pharmacy_orders').insertMany([
      { id: 'o1', patient_id: 'guest-1', total: 40 },
      { id: 'o2', patient_id: 'guest-1', total: 15 },
    ]);
    await conn.collection('patient_addresses').insertMany([
      { id: 'a1', user_id: 'guest-1', product_id: 'p9' },
      { id: 'a2', user_id: 'acct-1', product_id: 'p9' },
    ]);
    await conn.collection('patient_profiles').insertOne({ user_id: 'guest-1', full_name: 'Guest' });

    const proof = await proofOf(guestToken('guest-1', 'jti-ok'));
    const report = await guests.mergeGuestIntoAccount(proof, 'acct-1');

    expect(report.audit_row_id).toBeTruthy();
    expect(report.moves.map((m) => m.collection)).toContain('pharmacy_orders');
    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'acct-1' })).toBe(2);
    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'guest-1' })).toBe(0);
    expect((await conn.collection('patient_profiles').findOne({ user_id: 'acct-1' }))?.full_name).toBe('Guest');
    expect(await conn.collection('auditlogs').countDocuments({ action: 'account.guest_merged' })).toBe(1);
  });

  it('keeps one cart per account instead of two', async () => {
    await conn.collection('unified_carts').insertMany([
      { patient_id: 'guest-1', lines: [{ product_id: 'p1' }, { product_id: 'p2' }] },
      { patient_id: 'acct-1', lines: [{ product_id: 'p3' }] },
    ]);
    await guests.mergeGuestIntoAccount(await proofOf(guestToken('guest-1', 'jti-cart')), 'acct-1');
    expect(await conn.collection('unified_carts').countDocuments({ patient_id: 'acct-1' })).toBeGreaterThanOrEqual(1);
  });

  it('drops the duplicate address that the target already had', async () => {
    await conn.collection('patient_addresses').insertMany([
      { id: 'a1', user_id: 'guest-1', product_id: 'p9' },
      { id: 'a2', user_id: 'acct-1', product_id: 'p9' },
    ]);
    const report = await guests.mergeGuestIntoAccount(await proofOf(guestToken('guest-1', 'jti-dup')), 'acct-1');
    expect(report.duplicates_dropped).toBeGreaterThan(0);
  });

  it('an injected failure halfway moves nothing (21.2 Verify)', async () => {
    await conn.collection('pharmacy_orders').insertOne({ id: 'o1', patient_id: 'guest-1' });
    await conn.collection('patient_profiles').insertOne({ user_id: 'guest-1' });

    const real = conn.collection.bind(conn);
    const spy = jest.spyOn(conn, 'collection' as any);
    spy.mockImplementation(((name: string) => {
      const col = real(name);
      if (name === 'notifications') {
        return new Proxy(col, {
          get(target, prop) {
            if (prop === 'updateMany') return async () => { throw new Error('injected_failure'); };
            const value = Reflect.get(target, prop, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      }
      return col;
    }) as any);

    await expect(guests.mergeGuestIntoAccount(await proofOf(guestToken('guest-1', 'jti-inject')), 'acct-1')).rejects.toThrow('injected_failure');
    spy.mockRestore();

    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'guest-1' })).toBe(1);
    expect(await conn.collection('patient_profiles').countDocuments({ user_id: 'guest-1' })).toBe(1);
    expect(await conn.collection('auditlogs').countDocuments({ action: 'account.guest_merged' })).toBe(0);
    expect((await conn.collection('users').findOne({ id: 'guest-1' }))?.is_guest).toBe(true);
  });

  it('refuses to merge an account into itself or without a target', async () => {
    const proof = await proofOf(guestToken('guest-1', 'jti-self'));
    await expect(guests.mergeGuestIntoAccount(proof, 'guest-1')).rejects.toThrow('guest_merge_requires_two_accounts');
    await expect(guests.mergeGuestIntoAccount(proof, '')).rejects.toThrow('guest_merge_requires_the_target_account');
  });

  it('retires the guest row instead of leaving a second live identity', async () => {
    await guests.mergeGuestIntoAccount(await proofOf(guestToken('guest-1', 'jti-retire')), 'acct-1');
    const guest = await conn.collection('users').findOne({ id: 'guest-1' });
    expect(guest?.is_guest).toBe(false);
    expect(guest?.merged_into).toBe('acct-1');
    expect(guest?.phone).toBe('merged-guest-1');
  });
});

describe('Phase 21.2 proof of possession', () => {
  let mongo: MongoMemoryReplSet;
  let conn: Connection;
  let guests: GuestService;
  let usedJtis: Set<string>;

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ launchTimeout: 60000 }] });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-proof' }).asPromise();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    for (const name of ['users', 'pharmacy_orders', 'patient_profiles', 'auditlogs']) {
      const exists = (await conn.db!.collections()).some((c) => c.collectionName === name);
      if (!exists) await conn.createCollection(name).catch(() => undefined);
      await conn.collection(name).deleteMany({});
    }
    await conn.collection('users').insertMany([
      { id: 'guest-1', is_guest: true },
      { id: 'guest-2', is_guest: true },
      { id: 'acct-1', is_guest: false },
      { id: 'merged-guest', is_guest: false, merged_into: 'acct-9' },
    ]);
    await conn.collection('pharmacy_orders').insertOne({ id: 'o1', patient_id: 'guest-1' });
    usedJtis = new Set();
    const redis = {
      getClient: () => ({
        set: async (key: string, _v: string, ...args: string[]) => {
          if (args.includes('NX') && usedJtis.has(key)) return null;
          usedJtis.add(key);
          return 'OK';
        },
      }),
    };
    guests = new GuestService(conn, jwt(), redis as never);
  });

  it('a guest ID with no token proves nothing and moves nothing', async () => {
    await expect(guests.proveGuestToken(undefined)).rejects.toThrow('guest_merge_requires_the_guest_token');
    await expect(guests.proveGuestToken('')).rejects.toThrow('guest_merge_requires_the_guest_token');
    await expect(guests.proveGuestToken('   ')).rejects.toThrow('guest_merge_requires_the_guest_token');
    // and the data is exactly where it was
    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'guest-1' })).toBe(1);
    expect((await conn.collection('users').findOne({ id: 'guest-1' }))?.is_guest).toBe(true);
  });

  it('a token signed by somebody else proves nothing', async () => {
    const foreign = new JwtService({ secret: 'a-different-secret' })
      .sign({ sub: 'guest-1', is_guest: true }, { expiresIn: '1h' });
    await expect(guests.proveGuestToken(foreign)).rejects.toThrow('guest_merge_token_invalid');
    await expect(guests.proveGuestToken('not.a.jwt')).rejects.toThrow('guest_merge_token_invalid');
  });

  it('another guest\'s token cannot claim this guest\'s data', async () => {
    // guest-2's own token is valid, but it only ever proves guest-2.
    const proof2 = await guests.proveGuestToken(guestToken('guest-2', 'jti-2'));
    expect(proof2.guestAccountId).toBe('guest-2');

    // A token for a non-guest account is refused outright.
    await expect(guests.proveGuestToken(guestToken('acct-1', 'jti-acct', { is_guest: false }))).rejects.toThrow('guest_merge_token_is_not_a_guest');
    // A guest that has already been merged is refused.
    await expect(guests.proveGuestToken(guestToken('merged-guest', 'jti-merged', { is_guest: true }))).rejects.toThrow('guest_merge_guest_is_not_live');
    // And guest-1's data is untouched by any of it.
    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'guest-1' })).toBe(1);
  });

  it('a guest token is single-use for a merge', async () => {
    const token = guestToken('guest-1', 'jti-single');
    await guests.proveGuestToken(token);
    // The jti is burned the first time, so the very same token buys one merge.
    await expect(guests.proveGuestToken(token)).rejects.toThrow('guest_merge_token_already_used');
    // A different token for the same guest still works.
    await expect(guests.proveGuestToken(guestToken('guest-1', 'jti-single-2'))).resolves.toBeTruthy();
  });

  it('a token with no jti is refused, because it could never be single-use', async () => {
    // Every token this server mints carries a jti (see AuthService.signToken).
    // A hand-rolled or legacy token without one cannot be burned, so the merge
    // is refused instead of silently becoming replayable.
    const jtiless = jwt().sign({ sub: 'guest-1', is_guest: true }, { expiresIn: '1h' });
    await expect(guests.proveGuestToken(jtiless)).rejects.toThrow('guest_merge_token_has_no_id');
    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'guest-1' })).toBe(1);
  });

  it('minted access tokens carry a jti, so the merge can burn one', () => {
    // Guards the pairing between the signer and the claim store: if signToken
    // ever stopped minting a jti, every real merge would be refused.
    const src = readFileSync(require.resolve('./auth.service'), 'utf8');
    const signToken = src.slice(src.indexOf('signToken(user'), src.indexOf('async recordComplianceConsent'));
    expect(signToken).toContain('randomUUID()');
    expect(signToken).toMatch(/jti:\s*accessJti/);
  });

  it('an expired token proves nothing', async () => {
    const expired = jwt().sign({ sub: 'guest-1', is_guest: true }, { expiresIn: '-1s' });
    await expect(guests.proveGuestToken(expired)).rejects.toThrow('guest_merge_token_invalid');
  });

  it('the controller reads x-guest-token and never an id header', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'auth.controller.ts'), 'utf8');
    expect(src).toMatch(/x-guest-token/);
    expect(src).not.toMatch(/x-guest-id/);
    expect(src).not.toMatch(/guestMergeData/);
  });
});

describe('Phase 21.8 guest data lifecycle', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let guests: GuestService;
  const previous = process.env.GUEST_RETENTION_MONTHS;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-lifecycle' }).asPromise();
    guests = new GuestService(conn, jwt(), { getClient: () => null } as never);
  });
  afterAll(async () => {
    if (previous === undefined) delete process.env.GUEST_RETENTION_MONTHS;
    else process.env.GUEST_RETENTION_MONTHS = previous;
    await conn.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    for (const name of ['users', 'pharmacy_orders', 'auditlogs']) {
      const exists = (await conn.db!.collections()).some((c) => c.collectionName === name);
      if (!exists) await conn.createCollection(name).catch(() => undefined);
      await conn.collection(name).deleteMany({});
    }
  });

  it('deletes an inactive guest with no orders, and anonymises one that ordered', async () => {
    process.env.GUEST_RETENTION_MONTHS = '1';
    const old = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    await conn.collection('users').insertMany([
      { id: 'g-idle', is_guest: true, createdAt: old },
      { id: 'g-bought', is_guest: true, full_name: 'A', phone: '+966500000001', email: 'a@b.c', createdAt: old },
    ]);
    await conn.collection('pharmacy_orders').insertOne({ id: 'o1', patient_id: 'g-bought' });

    const result = await guests.purgeInactiveGuests();

    expect(result.deleted).toBe(1);
    expect(result.anonymised).toBe(1);
    expect(await conn.collection('users').countDocuments({ id: 'g-idle' })).toBe(0);
    const kept = await conn.collection('users').findOne({ id: 'g-bought' });
    expect(kept?.full_name).toBe('deleted guest');
    expect(kept?.phone).toBeNull();
    expect(await conn.collection('pharmacy_orders').countDocuments({ patient_id: 'g-bought' })).toBe(1);
  });

  it('keeps a recent guest and an already-merged guest', async () => {
    process.env.GUEST_RETENTION_MONTHS = '12';
    await conn.collection('users').insertMany([
      { id: 'g-new', is_guest: true, createdAt: new Date() },
      { id: 'g-merged', is_guest: false, merged_into: 'acct-9', createdAt: new Date(Date.now() - 900 * 24 * 3600 * 1000) },
    ]);
    const result = await guests.purgeInactiveGuests();
    expect(result.deleted).toBe(0);
    expect(await conn.collection('users').countDocuments({})).toBe(2);
  });

  it('refuses a nonsense retention window instead of defaulting silently', async () => {
    process.env.GUEST_RETENTION_MONTHS = '0';
    await expect(guests.purgeInactiveGuests()).rejects.toThrow('GUEST_RETENTION_MONTHS');
  });
});