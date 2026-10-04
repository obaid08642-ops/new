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

  it('a re-check disconnects a socket whose token the guard now refuses, and keeps the rest', async () => {
    let revoked = false;
    const guard = { canActivate: jest.fn(async (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      if (revoked && req.headers.authorization === 'Bearer banned') throw new Error('token_revoked');
      req.user = { id: req.headers.authorization === 'Bearer banned' ? 'u-banned' : 'u-ok', role: 'patient' };
      return true;
    }) };
    const [j, r, a, c, l] = realtimeDeps();
    const gw = new RealtimeGateway(j as never, r as never, a as never, c as never, l as never, undefined, guard as never);
    (gw as any).trackSocket = jest.fn();
    (gw as any).replayOfflineQueue = jest.fn();
    const mk = (token: string) => ({ id: token, handshake: { auth: { token }, query: {}, headers: {}, address: '10.0.0.1' }, data: {} as Record<string, unknown>, join: jest.fn(), disconnect: jest.fn(), broadcast: { emit: jest.fn() } });
    const banned = mk('banned');
    const ok = mk('fine');
    await gw.handleConnection(banned as never);
    await gw.handleConnection(ok as never);
    expect(banned.disconnect).not.toHaveBeenCalled();
    (gw as any).server = { sockets: { sockets: new Map([[banned.id, banned], [ok.id, ok]]) } };
    revoked = true;
    await gw.revalidateSockets();
    expect(banned.disconnect).toHaveBeenCalledWith(true);
    expect(ok.disconnect).not.toHaveBeenCalled();
  });
});
