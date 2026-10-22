/**
 * F09: suspended provider accounts cannot log in (403 account_suspended).
 * 16.2: only somebody who knows the password learns that (a suspended account no longer answers "suspended" to anyone who
 * types its e-mail, which told strangers who is registered); everybody else gets the same 401 as for an unknown e-mail.
 */
import * as bcrypt from 'bcryptjs';
import { ProviderAuthService } from '../../src/modules/provider/services/provider-auth.service';
import { ProviderAccountStatus } from '../../src/modules/provider/provider.enums';
import { JwtService } from '@nestjs/jwt';
import { TEST_JWT_SECRET } from './harness';

const PASSWORD = 'the-right-passphrase';

function service(account: any, user: any) {
  const usersCol = { findOne: async ({ id }: any) => (user && id === user.id ? user : null) };
  return new ProviderAuthService(
    { findOne: async ({ email }: any) => (account && email === account.email ? account : null), model: { db: { collection: () => usersCol } } } as any,
    {} as any,
    { create: async () => ({}) } as any,
    {} as any,
    {} as any,
    new JwtService({ secret: TEST_JWT_SECRET }),
  );
}

describe('F09 suspended provider login rejected', () => {
  let hash: string;
  beforeAll(async () => { hash = await bcrypt.hash(PASSWORD, 4); });
  const account = (status: ProviderAccountStatus) => ({ id: 'prov-x', user_id: 'prov-x', email: 'stop@example.com', status, provider_type: 'doctor', failed_login_attempts: 0, save: async () => undefined });

  it('suspended account with the right password → 403 account_suspended, and no session', async () => {
    const svc = service(account(ProviderAccountStatus.SUSPENDED), { id: 'prov-x', active: true, password_hash: hash });
    await expect(svc.login({ email: 'stop@example.com', password: PASSWORD })).rejects.toMatchObject({ status: 403, message: 'account_suspended' });
  });

  it('suspended account with a wrong password → the same 401 as an unknown e-mail (it does not reveal the account)', async () => {
    const svc = service(account(ProviderAccountStatus.SUSPENDED), { id: 'prov-x', active: true, password_hash: hash });
    const wrong = await svc.login({ email: 'stop@example.com', password: 'wrong-passphrase' }).catch((e) => e);
    const unknown = await svc.login({ email: 'nobody@example.com', password: 'wrong-passphrase' }).catch((e) => e);
    expect(wrong.getStatus()).toBe(401);
    expect(wrong.message).toBe(unknown.message);
    expect(unknown.getStatus()).toBe(401);
  });

  it('approved provider whose linked user is banned (users.active=false) → 403 on login with the right password', async () => {
    const svc = service(account(ProviderAccountStatus.APPROVED), { id: 'prov-x', active: false, password_hash: hash });
    await expect(svc.login({ email: 'stop@example.com', password: PASSWORD })).rejects.toMatchObject({ status: 403, message: 'account_suspended' });
  });
});
