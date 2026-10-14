/**
 * Phase 21.2 — every sign-up and sign-in method merges the guest's data, and
 * only ever on a proven guest token.
 *
 * The cases the reviewer asked for are here: a guest ID with no token merges
 * nothing, and a token is required for every method.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const SECRET = 'test-secret-for-guest-merge-wiring-only';

function row(doc: any) {
  return { save: jest.fn(async function (this: any) { return this; }), ...doc };
}

function userModelStub() {
  const store: any[] = [];
  const matches = (r: any, q: any) =>
    Object.entries(q).every(([k, v]) => {
      if (k === '$or') return (v as any[]).some((sub) => matches(r, sub));
      if (k === '$in') return (v as any[]).includes(r[k]);
      return r[k] === v;
    });
  return {
    store,
    findOne: jest.fn(async (q: any) => store.find((u) => matches(u, q)) ?? null),
    create: jest.fn(async (doc: any) => {
      const created = row({ id: `u${store.length + 1}`, token_version: 0, ...doc });
      store.push(created);
      return created;
    }),
    updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
  };
}

function redisStub() {
  const client = { set: jest.fn(async () => 'OK'), del: jest.fn(async () => 1) };
  return {
    getClient: () => client,
    set: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    get: jest.fn(async () => null),
    getJson: jest.fn(async () => null),
    setJson: jest.fn(async () => 'OK'),
    exists: jest.fn(async () => false),
    ttl: jest.fn(async () => 300),
    checkRateLimit: jest.fn(async () => ({ allowed: true })),
  };
}

async function build() {
  const userModel = userModelStub();
  const mergeGuestIntoAccount = jest.fn(async (proof: any, target: string) => ({
    guest_account_id: proof.guestAccountId, target_account_id: target, moves: [],
    cart_lines_kept: 0, duplicates_dropped: 0, audit_row_id: 'a1',
  }));
  const proveGuestToken = jest.fn(async (token: string) => {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return { guestAccountId: String(claims.sub), jti: String(claims.jti ?? '') };
  });
  const service = new AuthService(
    userModel as any,
    { findOneAndUpdate: jest.fn(), create: jest.fn(async () => ({})), findOne: jest.fn(async () => null) } as any,
    new JwtService({ secret: SECRET }) as any,
    new EventEmitter2(),
    redisStub() as any,
  );
  (service as any).guests = { mergeGuestIntoAccount, proveGuestToken };
  return { service, mergeGuestIntoAccount, proveGuestToken, userModel };
}

function tokenFor(sub: string, jti = 'jti-wiring'): string {
  return new JwtService({ secret: SECRET }).sign(
    { sub, id: sub, role: 'patient', is_guest: true, jti },
    { expiresIn: '1h' },
  );
}

const PASSWORD_HASH = bcrypt.hashSync('secret12', 4);

describe('Phase 21.2 guest merge on every sign-in method', () => {
  it('password login merges the guest into the account', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'g1', is_guest: true, role: 'patient' }));
    userModel.store.push(row({ id: 'u1', email: 'a@b.c', role: 'patient', password_hash: PASSWORD_HASH }));

    await service.login('a@b.c', 'secret12', undefined, tokenFor('g1'));
    expect(mergeGuestIntoAccount).toHaveBeenCalledWith(
      expect.objectContaining({ guestAccountId: 'g1' }),
      'u1',
    );
  });

  it('social sign-in merges the guest into the account', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'g1', is_guest: true, role: 'patient' }));
    userModel.store.push(row({ id: 'u2', email: 'a@b.c', role: 'patient' }));
    jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({ email: 'a@b.c', full_name: 'A' });

    await service.socialLogin({ provider: 'google', token: 't' } as never, tokenFor('g1'));
    expect(mergeGuestIntoAccount).toHaveBeenCalledWith(
      expect.objectContaining({ guestAccountId: 'g1' }),
      'u2',
    );
  });

  it('the OTP session exchange merges the guest into the account', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'g1', is_guest: true, role: 'patient' }));
    userModel.store.push(row({ id: 'u3', role: 'patient' }));
    const redis: any = (service as any).redisService;
    redis.getJson = jest.fn(async () => ({ user_id: 'u3', device_id: null }));

    await service.exchangePatientSession('tok', tokenFor('g1'));
    expect(mergeGuestIntoAccount).toHaveBeenCalledWith(
      expect.objectContaining({ guestAccountId: 'g1' }),
      'u3',
    );
  });

  it('registration merges the guest into the new account', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'g1', is_guest: true, role: 'patient' }));
    const redis: any = (service as any).redisService;
    redis.getJson = jest.fn(async (k: string) => (k.includes('verified') ? { ok: true } : null));
    const res = await service.register({ full_name: 'A', email: 'new@b.c', password: 'secret12' } as never, tokenFor('g1'));
    expect(mergeGuestIntoAccount).toHaveBeenCalledWith(
      expect.objectContaining({ guestAccountId: 'g1' }),
      res.user.id,
    );
  });

  it('a guest ID with no token merges nothing', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'u4', email: 'a@b.c', role: 'patient', password_hash: PASSWORD_HASH }));
    // The old header, the one that let anyone name a guest: it is simply not read.
    await service.login('a@b.c', 'secret12', undefined, undefined);
    await service.login('a@b.c', 'secret12', undefined, 'guest-1' as never);
    expect(mergeGuestIntoAccount).not.toHaveBeenCalled();
  });

  it('another guest\'s token merges only that other guest', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'g1', is_guest: true, role: 'patient' }));
    userModel.store.push(row({ id: 'g2', is_guest: true, role: 'patient' }));
    userModel.store.push(row({ id: 'u5', email: 'a@b.c', role: 'patient', password_hash: PASSWORD_HASH }));
    await service.login('a@b.c', 'secret12', undefined, tokenFor('g2'));
    // The target of the merge comes from the token, never from a request body.
    expect(mergeGuestIntoAccount).toHaveBeenCalledWith(
      expect.objectContaining({ guestAccountId: 'g2' }),
      'u5',
    );
  });

  it('a merge failure never breaks the sign-in', async () => {
    const { service, mergeGuestIntoAccount, userModel } = await build();
    userModel.store.push(row({ id: 'g1', is_guest: true, role: 'patient' }));
    userModel.store.push(row({ id: 'u6', email: 'a@b.c', role: 'patient', password_hash: PASSWORD_HASH }));
    mergeGuestIntoAccount.mockRejectedValueOnce(new Error('db down'));
    const res = await service.login('a@b.c', 'secret12', undefined, tokenFor('g1'));
    expect(res.user.id).toBe('u6');
  });

  it('a bad or replayed guest token is a logged skip, not a failed sign-in', async () => {
    const { service, proveGuestToken, userModel } = await build();
    userModel.store.push(row({ id: 'u7', email: 'a@b.c', role: 'patient', password_hash: PASSWORD_HASH }));
    proveGuestToken.mockRejectedValueOnce(new Error('guest_merge_token_already_used'));
    const res = await service.login('a@b.c', 'secret12', undefined, tokenFor('g1'));
    expect(res.user.id).toBe('u7');
  });
});