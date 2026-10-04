import { mongo } from 'mongoose';
import { PasskeyService } from './passkey.service';
import { createFakeAuthenticator, storedCredential } from './passkey.fake-authenticator';

/**
 * Phase 7C prerequisite: the WebAuthn verification path must actually work.
 *
 * Before this spec existed there was NO test covering passkey login, while
 * `auth.service.ts` documented that passkey enforcement was switched OFF
 * because "verification failed on every enrolled device (enroll succeeds, login
 * assertion is rejected)". These tests exercise PasskeyService.finishLogin with
 * cryptographically real assertions (see passkey.fake-authenticator.ts), so a
 * green run is evidence the server accepts a genuine Touch ID / Face ID
 * assertion — and a red run localises the defect instead of guessing.
 */

const RP_ID = 'nabd.plus';
const ORIGIN = 'https://admin.nabd.plus';
const USER_ID = 'user-admin-1';

function makeService(creds: any[] = []) {
  const store = [...creds];
  const passkeyModel: any = {
    find: jest.fn((q: any) => ({ lean: async () => store.filter((c) => c.user_id === (q.user_id ?? c.user_id)) })),
    findOne: jest.fn((q: any) => ({
      lean: async () => store.find((c) => c.credential_id === q.credential_id?.$eq || c.credential_id === q.credential_id) || null,
    })),
    updateOne: jest.fn(async (q: any, update: any) => {
      const row = store.find((c) => c.credential_id === q.credential_id);
      if (row) Object.assign(row, update.$set);
      return { modifiedCount: row ? 1 : 0 };
    }),
    countDocuments: jest.fn(async (q: any) => store.filter((c) => c.user_id === q.user_id).length),
    create: jest.fn(async (doc: any) => { store.push(doc); return doc; }),
    deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
  };
  const userModel: any = {
    findOne: jest.fn(() => ({ lean: async () => ({ id: USER_ID, email: 'admin@nabd.test', role: 'admin' }) })),
  };
  const kv = new Map<string, string>();
  const redisService: any = {
    getClient: () => ({
      set: async (k: string, v: string) => { kv.set(k, v); },
      get: async (k: string) => kv.get(k) ?? null,
      del: async (k: string) => { kv.delete(k); },
    }),
  };
  const service = new PasskeyService(passkeyModel, userModel, redisService);
  return { service, passkeyModel, store, kv };
}

describe('PasskeyService.finishLogin (real assertions)', () => {
  beforeEach(() => {
    process.env.WEBAUTHN_RP_ID = RP_ID;
    process.env.WEBAUTHN_ORIGIN = ORIGIN;
  });

  it('accepts a genuine ES256 platform assertion and returns the owning user', async () => {
    const auth = createFakeAuthenticator();
    const cred: any = storedCredential(auth, USER_ID);
    cred.counter = 0; // a first assertion: nothing recorded yet
    const { service, store } = makeService([cred]);
    await service['setChallenge'](`webauthn_login:${USER_ID}`, 'Y2hhbGxlbmdl', 300);

    const assertion = auth.assertion({ challenge: 'Y2hhbGxlbmdl', origin: ORIGIN, rpId: RP_ID, userHandle: USER_ID });
    const ownerId = await service.finishLogin(assertion);

    expect(ownerId).toBe(USER_ID);
    // The counter must be persisted so the next assertion is not treated as a clone.
    expect(store[0].counter).toBe(auth.counter);
  });

  it('accepts the assertion when the stored key is read back as a BSON Binary (.lean())', async () => {
    const auth = createFakeAuthenticator();
    const cred: any = storedCredential(auth, USER_ID);
    cred.counter = 0;
    cred.public_key = new mongo.Binary(Buffer.from(auth.cosePublicKey));
    const { service } = makeService([cred]);
    await service['setChallenge'](`webauthn_login:${USER_ID}`, 'Y2hhbGxlbmdl', 300);

    const assertion = auth.assertion({ challenge: 'Y2hhbGxlbmdl', origin: ORIGIN, rpId: RP_ID, userHandle: USER_ID });
    await expect(service.finishLogin(assertion)).resolves.toBe(USER_ID);
  });

  it('rejects an assertion replayed against a consumed challenge', async () => {
    const auth = createFakeAuthenticator();
    const cred: any = storedCredential(auth, USER_ID);
    cred.counter = 0;
    const { service } = makeService([cred]);
    await service['setChallenge'](`webauthn_login:${USER_ID}`, 'Y2hhbGxlbmdl', 300);

    const assertion = auth.assertion({ challenge: 'Y2hhbGxlbmdl', origin: ORIGIN, rpId: RP_ID, userHandle: USER_ID });
    await service.finishLogin(assertion);
    // The challenge is single-use: the exact same bytes must not verify twice.
    await expect(service.finishLogin(assertion)).rejects.toThrow();
  });

  it('rejects an assertion made for a different origin', async () => {
    const auth = createFakeAuthenticator();
    const { service } = makeService([storedCredential(auth, USER_ID)]);
    await service['setChallenge'](`webauthn_login:${USER_ID}`, 'Y2hhbGxlbmdl', 300);

    const assertion = auth.assertion({ challenge: 'Y2hhbGxlbmdl', origin: 'https://evil.example', rpId: RP_ID, userHandle: USER_ID });
    await expect(service.finishLogin(assertion)).rejects.toThrow();
  });

  it('accepts a synced passkey that always reports counter 0 even after a stored counter advanced', async () => {
    // iCloud Keychain / Google Password Manager synced passkeys never increment
    // their signature counter. @simplewebauthn/server throws
    // "Response counter value 0 was lower than expected N" for these, which is
    // what made passkey login unusable on the owner's Mac/iPhone.
    const auth = createFakeAuthenticator({ synced: true });
    auth.counter = 0;
    const cred: any = storedCredential(auth, USER_ID);
    cred.counter = 7; // a previous assertion (e.g. from a non-synced backup) advanced it
    const { service } = makeService([cred]);
    await service['setChallenge'](`webauthn_login:${USER_ID}`, 'Y2hhbGxlbmdl', 300);

    const assertion = auth.assertion({ challenge: 'Y2hhbGxlbmdl', origin: ORIGIN, rpId: RP_ID, userHandle: USER_ID });
    await expect(service.finishLogin(assertion)).resolves.toBe(USER_ID);
  });

  it('still rejects a genuine counter regression on a counter-bearing authenticator', async () => {
    // The counter exists to detect cloned authenticators; a real regression on a
    // device that does maintain one must keep failing.
    const auth = createFakeAuthenticator();
    const cred: any = storedCredential(auth, USER_ID);
    cred.counter = 50;
    const { service } = makeService([cred]);
    await service['setChallenge'](`webauthn_login:${USER_ID}`, 'Y2hhbGxlbmdl', 300);

    const assertion = auth.assertion({ challenge: 'Y2hhbGxlbmdl', origin: ORIGIN, rpId: RP_ID, userHandle: USER_ID });
    await expect(service.finishLogin(assertion)).rejects.toThrow();
  });
});
