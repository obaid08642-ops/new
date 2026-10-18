/**
 * Phase 21.7 — sessions. The plan's Verify: "Tests" for: a list of signed-in devices, "sign out other devices",
 * rotating refresh tokens, and a sign-out that removes the push token.
 */
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { PushService } from '../push/push.module';
import { runWithRequestMeta, describeClient, maskIp } from '../../common/request-meta';

class FakeRedis {
  kv = new Map<string, string>();
  sets = new Map<string, Set<string>>();
  async get(k: string) { return this.kv.get(k) ?? null; }
  async set(k: string, v: string) { this.kv.set(k, v); return 'OK'; }
  async del(k: string) { return this.kv.delete(k) ? 1 : 0; }
  async sadd(k: string, v: string) { (this.sets.get(k) ?? this.sets.set(k, new Set()).get(k)!).add(v); return 1; }
  async srem(k: string, v: string) { return this.sets.get(k)?.delete(v) ? 1 : 0; }
  async smembers(k: string) { return [...(this.sets.get(k) ?? [])]; }
  async expire() { return 1; }
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

describe('AuthService sessions (21.7)', () => {
  let service: AuthService;
  let jwt: JwtService;
  let redis: FakeRedis;
  let revoked: Array<Record<string, unknown>>;
  let pushRemoved: Array<{ userId: string; sids: string[]; devices: string[] }>;
  const user = { id: 'u1', role: 'patient', phone: '+966500000001', token_version: 0, active: true };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-sessions';
    redis = new FakeRedis();
    revoked = [];
    pushRemoved = [];
    const db = { collection: () => ({ createIndex: async () => 'ok', updateOne: async (_q: unknown, u: any) => { revoked.push(u.$set); } }) };
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: { findOne: async () => user, db } },
        { provide: 'PatientProfileRepository', useValue: {} },
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret-sessions' }) },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: RedisService, useValue: { getClient: () => redis } },
        { provide: PushService, useValue: { removeForSessions: async (userId: string, sids: string[], devices: string[]) => { pushRemoved.push({ userId, sids, devices }); return sids.length; } } },
      ],
    }).compile();
    service = mod.get(AuthService);
    jwt = mod.get(JwtService);
  });

  /** Sign in from one client: the request meta is what the middleware records. */
  const signIn = async (ua: string, ip: string, deviceId?: string) => {
    const tokens = runWithRequestMeta({ userAgent: ua, ip, deviceId }, () => service.signToken(user, deviceId));
    await new Promise((r) => setImmediate(r)); // signToken stores the session without awaiting
    return { ...tokens, sid: (jwt.decode(tokens.accessToken) as any).sid as string };
  };

  it('the access token carries the sign-in id, and the refresh token the same one', async () => {
    const a = await signIn(IPHONE, '10.1.2.3', 'dev-iphone-0000000001');
    expect((jwt.decode(a.refreshToken) as any).sid).toBe(a.sid);
    expect(a.sid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lists the signed-in devices with a readable label, a masked address, and marks the caller\'s own', async () => {
    const phone = await signIn(IPHONE, '10.1.2.3', 'dev-iphone-0000000001');
    const laptop = await signIn(CHROME, '192.168.5.9');
    const list = await service.listSessions(user.id, { sid: phone.sid });
    expect(list).toHaveLength(2);
    const mine = list.find((d) => d.session_id === phone.sid)!;
    const other = list.find((d) => d.session_id === laptop.sid)!;
    expect(mine).toMatchObject({ current: true, platform: 'ios', ip: '10.1.*.*', device_id: 'dev-iphone-0000000001' });
    expect(other).toMatchObject({ current: false, platform: 'web', label: 'Chrome · Windows', ip: '192.168.*.*' });
    expect(JSON.stringify(list)).not.toContain('10.1.2.3');
    expect(JSON.stringify(list)).not.toContain('Mozilla');
  });

  it('refresh rotates the token: the old one is dead, the sign-in id and start time stay', async () => {
    const a = await signIn(IPHONE, '10.1.2.3', 'dev-iphone-0000000001');
    const before = (await service.listSessions(user.id))[0];
    const next = await service.refreshToken(a.refreshToken, 'dev-iphone-0000000001');
    await new Promise((r) => setImmediate(r));
    expect((jwt.decode(next.accessToken) as any).sid).toBe(a.sid);
    expect(next.refreshToken).not.toBe(a.refreshToken);
    const after = await service.listSessions(user.id);
    expect(after).toHaveLength(1);
    expect(after[0].session_id).toBe(a.sid);
    expect(after[0].created_at).toBe(before.created_at);
    await expect(service.refreshToken(a.refreshToken, 'dev-iphone-0000000001')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a reuse a moment after the rotation fails alone; a reuse later is theft and ends every sign-in', async () => {
    const a = await signIn(IPHONE, '10.1.2.3', 'dev-iphone-0000000001');
    const b = await signIn(CHROME, '192.168.5.9');
    await service.refreshToken(a.refreshToken, 'dev-iphone-0000000001');
    await expect(service.refreshToken(a.refreshToken, 'dev-iphone-0000000001')).rejects.toThrow('refresh_token_rotated');
    expect(await service.listSessions(user.id)).toHaveLength(2); // the lost race signed nobody out
    redis.kv.delete(`refresh_rotated:${(jwt.decode(a.refreshToken) as any).jti}`); // ten seconds later
    await expect(service.refreshToken(a.refreshToken, 'dev-iphone-0000000001')).rejects.toThrow('refresh_token_reused_or_revoked');
    expect(await service.listSessions(user.id)).toHaveLength(0);
    expect(revoked.map((r) => r.sid)).toEqual(expect.arrayContaining([a.sid, b.sid]));
  });

  it('"sign out other devices" ends every sign-in but the caller\'s, marks them revoked and removes their push tokens', async () => {
    const mine = await signIn(IPHONE, '10.1.2.3', 'dev-iphone-0000000001');
    const laptop = await signIn(CHROME, '192.168.5.9', 'dev-laptop-0000000002');
    const tablet = await signIn(CHROME, '172.16.0.4');
    const r = await service.revokeOtherSessions(user.id, { sid: mine.sid });
    expect(r.sessions_revoked).toBe(2);
    expect((await service.listSessions(user.id)).map((d) => d.session_id)).toEqual([mine.sid]);
    expect(revoked.map((x) => x.sid).sort()).toEqual([laptop.sid, tablet.sid].sort());
    expect(pushRemoved).toHaveLength(1);
    expect(pushRemoved[0].sids.sort()).toEqual([laptop.sid, tablet.sid].sort());
    expect(pushRemoved[0].devices).toEqual(['dev-laptop-0000000002']);
    await expect(service.refreshToken(mine.refreshToken, 'dev-iphone-0000000001')).resolves.toBeDefined(); // mine still works
    await expect(service.refreshToken(laptop.refreshToken, 'dev-laptop-0000000002')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('signing out this device removes its push token and leaves the others signed in', async () => {
    const mine = await signIn(IPHONE, '10.1.2.3', 'dev-iphone-0000000001');
    const laptop = await signIn(CHROME, '192.168.5.9');
    const r = await service.logoutDevice(user.id, { sid: mine.sid, deviceId: 'dev-iphone-0000000001' });
    expect(r).toMatchObject({ ok: true, sessions_revoked: 1, push_tokens_removed: 1 });
    expect(pushRemoved[0]).toMatchObject({ sids: [mine.sid], devices: ['dev-iphone-0000000001'] });
    expect((await service.listSessions(user.id)).map((d) => d.session_id)).toEqual([laptop.sid]);
  });

  it('the plain sign-out with the refresh token does the same (what the apps call)', async () => {
    const mine = await signIn(IPHONE, '10.1.2.3');
    const other = await signIn(CHROME, '192.168.5.9');
    expect(await service.revokeRefreshSession(mine.refreshToken)).toBe(true);
    expect(pushRemoved[0].sids).toEqual([mine.sid]);
    expect(revoked.map((x) => x.sid)).toEqual([mine.sid]);
    expect((await service.listSessions(user.id)).map((d) => d.session_id)).toEqual([other.sid]);
    expect(await service.revokeRefreshSession(mine.refreshToken)).toBe(false);
    expect(await service.revokeRefreshSession('not-a-token')).toBe(false);
  });

  it('a sign-out that cannot say which device it is signs nobody out', async () => {
    await signIn(IPHONE, '10.1.2.3');
    await expect(service.logoutDevice(user.id, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.revokeOtherSessions(user.id, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.listSessions(user.id)).toHaveLength(1);
  });

  it('revoking one listed device by id; an unknown id (or another account\'s) is a 404', async () => {
    const a = await signIn(IPHONE, '10.1.2.3');
    const b = await signIn(CHROME, '192.168.5.9');
    await expect(service.revokeSession(user.id, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.revokeSession('someone-else', b.sid)).rejects.toBeInstanceOf(NotFoundException);
    await service.revokeSession(user.id, b.sid);
    expect((await service.listSessions(user.id)).map((d) => d.session_id)).toEqual([a.sid]);
  });

  it('sign out of all devices ends every sign-in and marks them revoked', async () => {
    const a = await signIn(IPHONE, '10.1.2.3');
    const b = await signIn(CHROME, '192.168.5.9');
    await service.logoutAllDevices(user.id);
    expect(await service.listSessions(user.id)).toHaveLength(0);
    expect(revoked.map((x) => x.sid).sort()).toEqual([a.sid, b.sid].sort());
  });
});

describe('request meta helpers (21.7)', () => {
  it('describes a client without exposing the raw user agent', () => {
    expect(describeClient(IPHONE)).toEqual({ platform: 'ios', label: 'Safari · iOS' });
    expect(describeClient(CHROME)).toEqual({ platform: 'web', label: 'Chrome · Windows' });
    expect(describeClient(undefined)).toEqual({ platform: 'unknown', label: 'unknown' });
    expect(describeClient('okhttp/4.12.0').label).toBe('Nabd+ app');
  });
  it('masks the host part of an address', () => {
    expect(maskIp('10.20.30.40')).toBe('10.20.*.*');
    expect(maskIp('::ffff:203.0.113.9')).toBe('203.0.*.*');
    expect(maskIp('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:*');
    expect(maskIp(null)).toBeNull();
  });
});
