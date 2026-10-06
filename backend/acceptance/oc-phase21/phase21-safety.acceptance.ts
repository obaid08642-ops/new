// ACCEPTANCE — OpenCode review 2026-10-05 (REVIEW_OPENCODE_P15_P21.md, item B: Phase 21 rework).
// Written by the reviewer; the implementing agent makes it pass and may not edit it.
// Phase 21 (ca8df120 / 6242f179 / 0e5ff93d) shipped without tests and with:
// account linking that confirms on a bare link id and writes the target's email;
// placeholder provider emails ('user@gmail.com' / 'user@icloud.com'); an unguarded
// POST /auth/guest/cleanup; inline body types instead of DTOs; Math.random OTPs.
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ROLES_KEY } from '../../src/common/auth.guard';
import { roleSatisfies } from '../../src/common/rbac';

jest.setTimeout(60_000);
const AUTH = path.join(__dirname, '../../src/modules/auth');
const read = (f: string) => (fs.existsSync(path.join(AUTH, f)) ? fs.readFileSync(path.join(AUTH, f), 'utf8') : '');

describe('account linking needs proof and ownership', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'oc-p21' }).asPromise();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    await conn.collection('account_links').deleteMany({});
    await conn.collection('users').deleteMany({});
    await conn.collection('users').insertOne({ id: 'victim', role: 'patient' });
    await conn.collection('account_links').insertOne({
      id: 'L1', sourceAccountId: 'attacker', targetAccountId: 'victim', method: 'email', providerEmail: 'attacker@evil.test', status: 'pending', createdAt: new Date(),
    });
  });

  it('a pending link is not confirmed by its id alone, nor by someone who is not the target', async () => {
    if (!fs.existsSync(path.join(AUTH, 'account-linking.service.ts'))) return; // Phase 21 not delivered yet
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AccountLinkingService } = require(path.join(AUTH, 'account-linking.service')) as { AccountLinkingService: new (c: Connection) => unknown };
    const svc = new AccountLinkingService(conn) as unknown as { confirmLink: (...a: unknown[]) => Promise<unknown> };
    await expect(svc.confirmLink('L1')).rejects.toThrow();
    await expect(svc.confirmLink('L1', 'attacker')).rejects.toThrow();
    const link = await conn.collection('account_links').findOne({ id: 'L1' });
    expect(link?.status).toBe('pending');
    const victim = await conn.collection('users').findOne({ id: 'victim' });
    expect(victim?.email).toBeUndefined();
  });

  it('no placeholder provider identity is ever used for a link', () => {
    const src = read('auth.service.ts') + read('account-linking.service.ts');
    expect(src).not.toMatch(/['"]user@(gmail|icloud)\.com['"]/);
  });
});

describe('Phase 21 endpoints are guarded and validated', () => {
  it('POST /auth/guest/cleanup is admin-only', async () => {
    const { AuthController } = await import('../../src/modules/auth/auth.controller');
    const handler = (AuthController.prototype as unknown as Record<string, unknown>).cleanupGuests;
    if (handler === undefined) return; // endpoint removed: nothing public left
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, handler as object) || Reflect.getMetadata(ROLES_KEY, AuthController) || [];
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.some((r) => roleSatisfies(r, ['patient']))).toBe(false);
    expect(roles.some((r) => roleSatisfies(r, ['admin']))).toBe(true);
  });

  it('linkAccount, storeCheckoutContact and cleanupGuests take a DTO class, not an inline type', async () => {
    const { AuthController } = await import('../../src/modules/auth/auth.controller');
    for (const name of ['linkAccount', 'storeCheckoutContact', 'cleanupGuests']) {
      if ((AuthController.prototype as unknown as Record<string, unknown>)[name] === undefined) continue;
      const types: unknown[] = Reflect.getMetadata('design:paramtypes', AuthController.prototype, name) || [];
      expect(types.filter((t) => t === Object)).toEqual([]);
    }
  });

  it('guest merge passes the target account id, not the request DTO, and the caller must prove the target', () => {
    const ctl = read('auth.controller.ts');
    expect(ctl).not.toMatch(/migrateGuestData\(\s*\w+\s*,\s*dto\s*\)/);
  });

  it('OTP codes use a CSPRNG', () => {
    for (const f of ['auth.service.ts', 'email-otp.service.ts']) {
      // Any line that builds an OTP / verification code must not use Math.random.
      const bad = read(f).split('\n').filter((l) => /Math\.random\(/.test(l) && /(otp|code|pin)/i.test(l));
      expect(bad).toEqual([]);
      // A generator method (generateOtp / generateCode) must not use Math.random anywhere in its body.
      const gen = /(generate\w*(Otp|Code)\w*)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\s{2}\}/g;
      for (const m of read(f).matchAll(gen)) expect(m[3]).not.toMatch(/Math\.random\(/);
    }
  });
});
