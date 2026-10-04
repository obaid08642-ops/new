// R11 §5: the realtime socket accepted any token signed with JWT_SECRET
// (refresh, QR) as the user. Only access tokens connect.
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway accepts only access tokens (R11 §5)', () => {
  const gateway = (payload: Record<string, unknown>) => new RealtimeGateway(
    { verifyAsync: jest.fn().mockResolvedValue(payload) } as never,
    { setServer: jest.fn(), setUserOnline: jest.fn().mockResolvedValue(undefined), setUserOffline: jest.fn() } as never,
    {} as never, {} as never, {} as never,
  );
  const socket = () => ({ id: 's1', handshake: { auth: { token: 't' }, query: {}, headers: {} }, data: {} as Record<string, unknown>, join: jest.fn(), disconnect: jest.fn() });

  it.each([
    ['refresh', { sub: 'u1', type: 'refresh', jti: 'j' }],
    ['health QR', { sub: 'u1', scope: 'health_passport', type: 'qr' }],
    ['chat realtime', { sub: 'u1', purpose: 'chat_rt', thread_id: 't1' }],
  ])('a %s token is disconnected before joining any room', async (_k, payload) => {
    const s = socket();
    await gateway(payload).handleConnection(s as never);
    expect(s.disconnect).toHaveBeenCalled();
    expect(s.join).not.toHaveBeenCalled();
  });
});

describe('RealtimeGateway runs the REST auth guard on the handshake (R11 independent check)', () => {
  const socket = () => ({ id: 's2', handshake: { auth: { token: 't' }, query: {}, headers: {}, address: '10.0.0.9' }, data: {} as Record<string, unknown>, join: jest.fn(), disconnect: jest.fn() });
  const build = (guard: unknown) => new RealtimeGateway(
    { verifyAsync: jest.fn().mockResolvedValue({ id: 'adm', role: 'admin', tv: 0 }) } as never,
    { setServer: jest.fn(), setUserOnline: jest.fn().mockResolvedValue(undefined), setUserOffline: jest.fn() } as never,
    {} as never, {} as never, {} as never, undefined, guard as never,
  );

  it('an admin token without the gate / enrolled device never joins role:admin', async () => {
    const s = socket();
    await build({ canActivate: jest.fn(async () => { throw new Error('admin_gate_required'); }) }).handleConnection(s as never);
    expect(s.disconnect).toHaveBeenCalled();
    expect(s.join).not.toHaveBeenCalled();
  });

  it('a token the guard accepts joins with the guard\'s user', async () => {
    const s = socket();
    const guard = { canActivate: jest.fn(async (ctx: any) => { ctx.switchToHttp().getRequest().user = { id: 'p1', role: 'patient' }; return true; }) };
    const gw = build(guard);
    (gw as any).trackSocket = jest.fn();
    (gw as any).replayOfflineQueue = jest.fn();
    (gw as any).server = undefined;
    Object.assign(s, { broadcast: { emit: jest.fn() } });
    await gw.handleConnection(s as never);
    expect(s.join).toHaveBeenCalledWith('user:p1');
    expect(s.join).toHaveBeenCalledWith('role:patient');
  });
});
