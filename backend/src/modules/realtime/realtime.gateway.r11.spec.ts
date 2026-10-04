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
