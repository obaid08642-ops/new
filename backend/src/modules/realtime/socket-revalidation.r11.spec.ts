// Second review of R11 (713a2fc6): (1) the auth guard was injected as
// @Optional, so if it ever failed to resolve both gateways silently went back
// to bare JWT verification; (2) a socket was checked only at connect, so a ban
// or session revoke (token_version bump) kept an open socket alive.
// Now a missing guard refuses every access token, and open sockets are
// re-checked through the same guard on a timer.
import { RealtimeGateway } from './realtime.gateway';
import { ChatGateway } from '../chat/chat.gateway';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

const realtimeDeps = () => [
  { verifyAsync: jest.fn().mockResolvedValue({ id: 'p1', role: 'patient', tv: 0 }) },
  { setServer: jest.fn(), setUserOnline: jest.fn().mockResolvedValue(undefined), setUserOffline: jest.fn() },
  {}, {}, {},
] as const;

describe('socket auth fails closed and is re-checked (R11 second review)', () => {
  const secret = 'reval-secret';
  const env = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = secret; });
  afterAll(() => { process.env.JWT_SECRET = env; });

  it('RealtimeGateway with no guard refuses a valid access token', async () => {
    const [j, r, a, c, l] = realtimeDeps();
    const gw = new RealtimeGateway(j as never, r as never, a as never, c as never, l as never, undefined, undefined);
    const s = { id: 's1', handshake: { auth: { token: 't' }, query: {}, headers: {} }, data: {} as Record<string, unknown>, join: jest.fn(), disconnect: jest.fn() };
    await gw.handleConnection(s as never);
    expect(s.disconnect).toHaveBeenCalled();
    expect(s.join).not.toHaveBeenCalled();
  });

  it('ChatGateway with no guard refuses a valid access token', async () => {
    const gw = new ChatGateway({} as never);
    const s = { id: 's2', handshake: { auth: { token: jwt.sign({ sub: 'u1', id: 'u1', role: 'patient' }, secret) }, headers: {} }, join: jest.fn(), disconnect: jest.fn(), rooms: new Set<string>() };
    await gw.handleConnection(s as never);
    expect(s.disconnect).toHaveBeenCalled();
  });

  // Second review of the re-check: (1) a gateway on namespace '/' gets a
  // Namespace, whose `.sockets` is already the Map, so `.sockets.sockets` saw
  // nothing; (2) re-running the guard on the token captured at connect would
  // drop every socket once that 1-hour token expired; (3) a lookup error read
  // as "revoked". The re-check now asks only "was this session revoked?".
  describe('periodic re-check', () => {
    const store: Record<string, any> = {};
    const conn = { collection: (name: string) => ({ findOne: async (q: any) => {
      if (store.__throw) throw new Error('mongo blip');
      return store[`${name}:${q.id ?? q.user_id}`] ?? null;
    } }) };
    const build = () => {
      const [j, r, , c, l] = realtimeDeps();
      const gw = new RealtimeGateway(j as never, r as never, { db: conn } as never, c as never, l as never, undefined, { canActivate: async () => true } as never);
      return gw;
    };
    const sock = (id: string, user: Record<string, unknown>) => ({ id, data: { user }, disconnect: jest.fn() });
    beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

    it('reads the namespace socket map and drops a revoked session only', async () => {
      store['users:u-banned'] = { token_version: 2 };
      store['users:u-ok'] = { token_version: 0 };
      const banned = sock('a', { id: 'u-banned', role: 'patient', tv: 1 });
      const ok = sock('b', { id: 'u-ok', role: 'patient', tv: 0, exp: Math.floor(Date.now() / 1000) - 3600 });
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', banned], ['b', ok]]) }; // a Namespace
      expect(await gw.revalidateSockets()).toBe(1);
      expect(banned.disconnect).toHaveBeenCalledWith(true);
      expect(ok.disconnect).not.toHaveBeenCalled(); // an expired token is not a revoke
    });

    it('drops a deactivated user and a provider no longer approved', async () => {
      store['users:u-off'] = { token_version: 0, active: false };
      store['provider_accounts:p1'] = { token_version: 0, status: 'suspended' };
      const off = sock('a', { id: 'u-off', role: 'patient', tv: 0 });
      const prov = sock('b', { id: 'p1', role: 'provider', scope: 'provider', tv: 0 });
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', off], ['b', prov]]) };
      expect(await gw.revalidateSockets()).toBe(2);
    });

    it('a lookup error keeps the socket', async () => {
      store.__throw = true;
      const s1 = sock('a', { id: 'u1', role: 'patient', tv: 3 });
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', s1]]) };
      expect(await gw.revalidateSockets()).toBe(0);
      expect(s1.disconnect).not.toHaveBeenCalled();
    });

    // Fourth review: impersonation tokens carry no tv; the sweep must read the
    // durable session (and the impersonator), and a staff socket its device.
    it('drops an impersonation socket whose session ended or expired, or whose impersonator was disabled', async () => {
      store['users:pat-1'] = { token_version: 0 };
      store['users:agent-1'] = { active: true, role: 'support_agent' };
      store['impersonation_sessions:s-ended'] = { status: 'ended', expiresAt: new Date(Date.now() + 60_000), impersonator_id: 'agent-1' };
      store['impersonation_sessions:s-old'] = { status: 'active', expiresAt: new Date(Date.now() - 1000), impersonator_id: 'agent-1' };
      store['impersonation_sessions:s-live'] = { status: 'active', expiresAt: new Date(Date.now() + 60_000), impersonator_id: 'agent-1' };
      const imp = (sid: string) => sock(sid, { id: 'pat-1', role: 'patient', scope: 'impersonation', impersonation_session_id: sid });
      const ended = imp('s-ended'); const old = imp('s-old'); const live = imp('s-live');
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', ended], ['b', old], ['c', live]]) };
      expect(await gw.revalidateSockets()).toBe(2);
      expect(live.disconnect).not.toHaveBeenCalled();
      store['users:agent-1'] = { active: false };
      expect(await gw.revalidateSockets()).toBe(3);
    });

    it('drops a staff socket whose enrolled device was revoked', async () => {
      store['users:adm'] = { token_version: 0 };
      store['admin_devices:adm'] = { revoked: true };
      const s1 = { id: 'a', data: { user: { id: 'adm', role: 'admin', tv: 0 }, adminDeviceHash: 'h1' }, disconnect: jest.fn() };
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', s1]]) };
      expect(await gw.revalidateSockets()).toBe(1);
    });

    it('two sweeps never run at once', async () => {
      store['users:u1'] = { token_version: 0 };
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', sock('a', { id: 'u1', role: 'patient', tv: 0 })]]) };
      const first = gw.revalidateSockets();
      expect(await gw.revalidateSockets()).toBe(0);
      await first;
      expect((gw as any).sweeping).toBe(false);
    });
  });

  it('ChatGateway records the authenticated user on the socket for the re-check', async () => {
    const guard = { canActivate: jest.fn(async (ctx: any) => { ctx.switchToHttp().getRequest().user = { id: 'u7', role: 'patient', tv: 0 }; return true; }) };
    const gw = new ChatGateway({} as never, guard as never);
    const s = { id: 'c1', handshake: { auth: { token: jwt.sign({ sub: 'u7', id: 'u7', role: 'patient' }, secret) }, headers: {} }, join: jest.fn(), disconnect: jest.fn(), rooms: new Set<string>() } as any;
    await gw.handleConnection(s);
    expect(s.data.user).toEqual(expect.objectContaining({ id: 'u7', tv: 0 }));
  });

  // Fifth review: the impersonator's permission, the gateway storing the
  // device hash, staff via a roles array, and a staff socket with no hash.
  describe('fifth review', () => {
    const store: Record<string, any> = {};
    const conn = { collection: (name: string) => ({
      findOne: async (q: any) => store[`${name}:${q.id ?? q.user_id ?? q.key}`] ?? null,
      find: () => ({ toArray: async () => [] }),
    }) };
    const [j, r, , c, l] = realtimeDeps();
    const build = () => new RealtimeGateway(j as never, r as never, { db: conn } as never, c as never, l as never, undefined, { canActivate: async () => true } as never);
    beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

    it('drops an impersonation socket once the impersonator no longer holds user.impersonate', async () => {
      store['users:pat-1'] = { token_version: 0 };
      store['users:agent-1'] = { id: 'agent-1', role: 'patient', active: true }; // a role without user.impersonate
      store['impersonation_sessions:s1'] = { status: 'active', expiresAt: new Date(Date.now() + 60_000), impersonator_id: 'agent-1' };
      const s1 = { id: 'a', data: { user: { id: 'pat-1', role: 'patient', scope: 'impersonation', impersonation_session_id: 's1' } }, disconnect: jest.fn() };
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', s1]]) };
      expect(await gw.revalidateSockets()).toBe(1);
    });

    it('a staff socket (role or roles array) with no stored device hash is dropped', async () => {
      store['users:adm'] = { token_version: 0 };
      store['users:hadm'] = { token_version: 0 };
      const noHash = { id: 'a', data: { user: { id: 'adm', role: 'admin', tv: 0 } }, disconnect: jest.fn() };
      const viaRoles = { id: 'b', data: { user: { id: 'hadm', role: 'patient', roles: ['super_admin'], tv: 0 } }, disconnect: jest.fn() };
      const gw = build();
      (gw as any).server = { sockets: new Map([['a', noHash], ['b', viaRoles]]) };
      expect(await gw.revalidateSockets()).toBe(2);
    });
  });

  it('the realtime gateway stores the staff device hash at connect', async () => {
    const guard = { canActivate: jest.fn(async (ctx: any) => { ctx.switchToHttp().getRequest().user = { id: 'adm', role: 'admin', tv: 0 }; return true; }) };
    const [j, r, a, c, l] = realtimeDeps();
    const gw = new RealtimeGateway(j as never, r as never, a as never, c as never, l as never, undefined, guard as never);
    (gw as any).trackSocket = jest.fn(); (gw as any).replayOfflineQueue = jest.fn();
    const s = { id: 's9', handshake: { auth: { token: 't' }, query: {}, headers: { 'x-admin-device': 'd'.repeat(32) }, address: '' }, data: {} as Record<string, unknown>, join: jest.fn(), disconnect: jest.fn(), broadcast: { emit: jest.fn() } };
    await gw.handleConnection(s as never);
    expect(s.data.adminDeviceHash).toBe(require('crypto').createHash('sha256').update('d'.repeat(32)).digest('hex'));
  });
});
