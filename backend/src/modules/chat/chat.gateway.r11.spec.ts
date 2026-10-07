// R11 §5 lead 11: the legacy ChatGateway accepted any JWT signed with the
// secret (refresh, QR) and relayed typing / messages / calls / receipts into
// any thread room, joined or not.
import { ChatGateway } from './chat.gateway';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

describe('ChatGateway token kinds and room membership (R11 §5)', () => {
  const secret = 'gateway-unit-secret';
  const env = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = secret; });
  afterAll(() => { process.env.JWT_SECRET = env; });

  const socketWith = (token: string) => ({
    id: `s-${Math.random()}`, handshake: { auth: { token }, headers: {} },
    join: jest.fn(), disconnect: jest.fn(), rooms: new Set<string>(),
    to: jest.fn(() => ({ emit: jest.fn() })),
  });

  it.each([
    ['refresh', { sub: 'u1', type: 'refresh', jti: 'j' }],
    ['health QR', { sub: 'u1', scope: 'health_passport', type: 'qr' }],
  ])('a %s token is refused at connection', async (_k, payload) => {
    const gw = new ChatGateway({} as never);
    const s = socketWith(jwt.sign(payload, secret));
    await gw.handleConnection(s as never);
    expect(s.disconnect).toHaveBeenCalled();
  });

  it('an access token and a chat_rt token are accepted', async () => {
    const gw = new ChatGateway({} as never);
    const a = socketWith(jwt.sign({ sub: 'u1', id: 'u1', role: 'patient' }, secret));
    await gw.handleConnection(a as never);
    expect(a.disconnect).not.toHaveBeenCalled();
    const rt = socketWith(jwt.sign({ sub: 'u1', purpose: 'chat_rt', thread_id: 't1' }, secret, { audience: 'chat-rt' }));
    await gw.handleConnection(rt as never);
    expect(rt.disconnect).not.toHaveBeenCalled();
  });

  it('relays only into a room the socket joined', async () => {
    const gw = new ChatGateway({} as never);
    const s = socketWith('');
    (gw as unknown as { activeUsers: Map<string, string> }).activeUsers.set(s.id, 'u1');
    for (const send of [
      () => gw.handleTyping(s as never, { threadId: 'foreign', isTyping: true }),
      () => gw.handleSendMessage(s as never, { threadId: 'foreign', content: 'x', state: 'OPEN' }),
      () => gw.handleInitiateCall(s as never, { threadId: 'foreign', state: 'OPEN' }),
      () => gw.handleMarkSeen(s as never, { threadId: 'foreign' }),
    ]) {
      await expect(send()).resolves.toEqual({ error: 'not_joined' });
    }
    expect(s.to).not.toHaveBeenCalled();
    s.rooms.add('thread_mine');
    await gw.handleSendMessage(s as never, { threadId: 'mine', content: 'x', state: 'OPEN' });
    expect(s.to).toHaveBeenCalledWith('thread_mine');
  });
});

describe('ChatGateway runs the REST auth guard for access tokens (R11 independent check)', () => {
  const secret = 'gateway-unit-secret-2';
  const env = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = secret; });
  afterAll(() => { process.env.JWT_SECRET = env; });

  it('a revoked or ungated access token is refused', async () => {
    const gw = new ChatGateway({} as never);
    const s = { id: 'sx', handshake: { auth: { token: jwt.sign({ id: 'u1', role: 'patient', tv: 0 }, secret) }, headers: {} }, join: jest.fn(), disconnect: jest.fn(), rooms: new Set<string>() };
    await gw.handleConnection(s as never);
    expect(s.disconnect).toHaveBeenCalled();
    expect(s.join).not.toHaveBeenCalled();
  });
});
