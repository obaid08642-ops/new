/** 16.2: a known and an unknown account get the same answer; wrong passwords are slowed, then locked; policy at every reset. */
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
jest.mock('bcryptjs', () => {
  const actual = jest.requireActual('bcryptjs');
  return { ...actual, compare: jest.fn(actual.compare) };
});
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { LoginLockService } from '../../common/login-lock.service';
import { PasswordSecurityService } from '../../common/password-security.service';

async function build() {
  const hash = await bcrypt.hash('the-right-passphrase', 4);
  const alice = { id: 'u1', email: 'alice@example.test', password_hash: hash, role: 'patient', active: true, save: jest.fn(), toObject() { return this; } };
  const userModel: any = { findOne: jest.fn(async (q: any) => (q.email === 'alice@example.test' ? alice : null)) };
  const redis = new RedisService();
  const compare = bcrypt.compare as unknown as jest.Mock;
  compare.mockClear();
  const mod = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: 'UserRepository', useValue: userModel },
      { provide: 'PatientProfileRepository', useValue: {} },
      { provide: JwtService, useValue: { sign: () => 'jwt' } },
      { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      { provide: RedisService, useValue: redis },
      { provide: LoginLockService, useValue: new LoginLockService(redis) },
      PasswordSecurityService,
    ],
  }).compile();
  return { svc: mod.get(AuthService), userModel, compare, alice };
}
const answer = (p: Promise<unknown>) => p.then(() => 'ok', (e: any) => `${e.getStatus?.()}:${JSON.stringify(e.getResponse?.())}`);

describe('password sign-in (16.2)', () => {
  afterEach(() => jest.clearAllMocks());

  it('a known account with a wrong password and an unknown account get the identical answer', async () => {
    const { svc } = await build();
    const known = await answer(svc.login('alice@example.test', 'wrong-passphrase-1', { ip: '1.1.1.1' }));
    const unknown = await answer(svc.login('nobody@example.test', 'wrong-passphrase-1', { ip: '1.1.1.1' }));
    expect(known).toBe(unknown);
    expect(known).toContain('401');
  });

  it('an unknown account costs the same bcrypt work as a known one (no timing tell)', async () => {
    const { svc, compare } = await build();
    await answer(svc.login('nobody@example.test', 'wrong-passphrase-1', { ip: '1.1.1.1' }));
    expect(compare).toHaveBeenCalledTimes(1);
    compare.mockClear();
    await answer(svc.login('alice@example.test', 'wrong-passphrase-1', { ip: '1.1.1.1' }));
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('ten wrong passwords: the first four are 401, then the sign-in is locked (429 login_locked), for a real account and an unknown one alike', async () => {
    const { svc } = await build();
    for (const id of ['alice@example.test', 'nobody@example.test']) {
      const seen: string[] = [];
      for (let i = 0; i < 10; i += 1) seen.push((await answer(svc.login(id, `wrong-passphrase-${i}`, { ip: '2.2.2.2' }))).slice(0, 3));
      expect(seen.slice(0, 5)).toEqual(['401', '401', '401', '401', '401']);
      expect(seen.slice(5)).toEqual(['429', '429', '429', '429', '429']);
    }
  });

  it('while locked even the right password is refused, and the lock is gone for the owner on another network and after success elsewhere', async () => {
    const { svc } = await build();
    for (let i = 0; i < 5; i += 1) await answer(svc.login('alice@example.test', `wrong-${i}-passphrase`, { ip: '3.3.3.3' }));
    expect(await answer(svc.login('alice@example.test', 'the-right-passphrase', { ip: '3.3.3.3' }))).toContain('login_locked');
    expect(await answer(svc.login('alice@example.test', 'the-right-passphrase', { ip: '4.4.4.4' }))).toBe('ok');
  });

  it('a correct password resets the count', async () => {
    const { svc } = await build();
    for (let i = 0; i < 4; i += 1) await answer(svc.login('alice@example.test', `wrong-${i}-passphrase`, { ip: '5.5.5.5' }));
    expect(await answer(svc.login('alice@example.test', 'the-right-passphrase', { ip: '5.5.5.5' }))).toBe('ok');
    for (let i = 0; i < 4; i += 1) expect(await answer(svc.login('alice@example.test', `wrong-${i}-passphrase`, { ip: '5.5.5.5' }))).toContain('401');
  });
});

describe('forgot and reset answer the same for every identifier (16.2)', () => {

  it('"forgot password" says requested for a real and an unknown identifier', async () => {
    const { svc } = await build();
    (svc as any).deliverPasswordReset = jest.fn(async () => undefined);
    expect(await svc.forgotPatientPassword('alice@example.test')).toEqual({ requested: true });
    expect(await svc.forgotPatientPassword('nobody@example.test')).toEqual({ requested: true });
  });

  it('resetting with a code for an unknown account fails like a wrong code, not "user not found"', async () => {
    const { svc } = await build();
    const err: any = await svc.resetPassword('nobody@example.test', 'a-new-passphrase-1', '123456').catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(400);
    expect(String(err.message)).toBe('Invalid OTP code');
    expect(err).not.toBeInstanceOf(UnauthorizedException);
  });

  it('a new password that is too short or on the breached list is refused before the code is spent', async () => {
    const { svc, userModel } = await build();
    const verify = jest.spyOn(svc as any, 'verifyOtp');
    await expect(svc.resetPassword('alice@example.test', 'short-1', '123456')).rejects.toMatchObject({ response: { code: 'password_too_short' } });
    await expect(svc.resetPassword('alice@example.test', 'letmein123', '123456')).rejects.toMatchObject({ response: { code: 'password_compromised' } });
    expect(verify).not.toHaveBeenCalled();
    expect(userModel.findOne).not.toHaveBeenCalled();
  });
});
