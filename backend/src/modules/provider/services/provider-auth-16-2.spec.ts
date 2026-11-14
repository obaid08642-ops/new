/** 16.2 for providers: one answer for a known and an unknown e-mail, one progressive lockout, the account state only after the password. */
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ProviderAuthService } from './provider-auth.service';
import { LoginLockService } from '../../../common/login-lock.service';
import { RedisService } from '../../redis/redis.service';
import { ProviderAccountStatus } from '../provider.enums';

async function build(status = ProviderAccountStatus.APPROVED) {
  const hash = await bcrypt.hash('the-right-passphrase', 4);
  const account: any = { id: 'a1', email: 'doc@example.test', status, failed_login_attempts: 0, provider_type: 'doctor', save: jest.fn(async () => undefined) };
  const user = { id: 'a1', email: 'doc@example.test', password_hash: hash, active: true };
  const accounts: any = { findOne: jest.fn(async (q: any) => (q.email === 'doc@example.test' ? account : null)), model: { db: { collection: () => ({ findOne: async () => user }) } } };
  const svc = new ProviderAuthService(accounts, {} as any, { create: jest.fn() } as any, {} as any, {} as any, {} as any, undefined, new LoginLockService(new RedisService()));
  (svc as any).openSession = jest.fn(async () => ({ session: 'ok' }));
  return { svc, account, accounts };
}
const answer = (p: Promise<unknown>) => p.then(() => 'ok', (e: any) => `${e.getStatus?.()}:${e.message}`);

describe('provider sign-in (16.2)', () => {
  it('a wrong password and an unknown e-mail get the same answer', async () => {
    const { svc } = await build();
    const known = await answer(svc.login({ email: 'doc@example.test', password: 'wrong-passphrase-1', meta: { ip: '1.1.1.1' } }));
    const unknown = await answer(svc.login({ email: 'nobody@example.test', password: 'wrong-passphrase-1', meta: { ip: '1.1.1.1' } }));
    expect(known).toBe(unknown);
    expect(known).toBe('401:invalid credentials');
  });

  it('ten wrong passwords: four 401, then locked with 429 login_locked, for a real and an unknown e-mail', async () => {
    const { svc } = await build();
    for (const email of ['doc@example.test', 'nobody@example.test']) {
      const seen: string[] = [];
      for (let i = 0; i < 10; i += 1) seen.push((await answer(svc.login({ email, password: `wrong-${i}-passphrase`, meta: { ip: '2.2.2.2' } }))).slice(0, 3));
      expect(seen.slice(0, 5).every((x) => x === '401')).toBe(true);
      expect(seen.slice(5).every((x) => x === '429')).toBe(true);
    }
  });

  it('a suspended account answers "suspended" only to somebody who knows the password', async () => {
    const { svc } = await build(ProviderAccountStatus.SUSPENDED);
    expect(await answer(svc.login({ email: 'doc@example.test', password: 'wrong-passphrase-1', meta: { ip: '3.3.3.3' } }))).toBe('401:invalid credentials');
    expect(await answer(svc.login({ email: 'doc@example.test', password: 'the-right-passphrase', meta: { ip: '3.3.3.3' } }))).toBe('403:account_suspended');
  });

  // G6: a rejected applicant must reach the status screen (reason + "fix and resubmit"); only SUSPENDED is blocked at sign-in.
  it('a rejected account signs in with the right password and gets a session (the app then shows the reason)', async () => {
    const { svc } = await build(ProviderAccountStatus.REJECTED);
    expect(await answer(svc.login({ email: 'doc@example.test', password: 'the-right-passphrase', meta: { ip: '6.6.6.6' } }))).toBe('ok');
    expect((svc as any).openSession).toHaveBeenCalledWith(expect.objectContaining({ status: ProviderAccountStatus.REJECTED }), undefined);
  });

  it('the right password signs in, and is not blocked by an earlier failure from another address', async () => {
    const { svc } = await build();
    for (let i = 0; i < 5; i += 1) await answer(svc.login({ email: 'doc@example.test', password: `wrong-${i}-passphrase`, meta: { ip: '4.4.4.4' } }));
    expect(await answer(svc.login({ email: 'doc@example.test', password: 'the-right-passphrase', meta: { ip: '5.5.5.5' } }))).toBe('ok');
  });
});

describe('provider passwords follow the one rule (16.2)', () => {
  it('registration refuses a short or breached password before anything is created', async () => {
    const { svc, accounts } = await build();
    const base = { email: 'new@example.test', confirm_password: '', provider_type: 'doctor' as any };
    await expect(svc.register({ ...base, password: 'Short1', confirm_password: 'Short1' })).rejects.toMatchObject({ response: { code: 'password_too_short' } });
    await expect(svc.register({ ...base, password: 'letmein123', confirm_password: 'letmein123' })).rejects.toBeInstanceOf(BadRequestException);
    expect(accounts.findOne).not.toHaveBeenCalled();
  });
});
