const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  },
}));

import { addIncoming, applyState, confirmSent, fromServer, isOwn, tickOf, type ChatMsg } from '../src/chat/chatState';
import { enqueue, flush, forThread, loadOutbox, remove, type OutboxItem } from '../src/chat/outbox';

const stamp = () => '10:00';
const mine = (over: Partial<ChatMsg> = {}): ChatMsg => ({ id: 'c1', clientId: 'c1', sender: 'me', text: 'hi', time: '10:00', at: 1000, pending: true, ...over });

describe('who wrote it and the ticks', () => {
  it('uses the sender id when known, the role otherwise', () => {
    expect(isOwn({ sender_id: 'u1' }, 'u1')).toBe(true);
    expect(isOwn({ sender_id: 'd1', sender_role: 'patient' }, 'u1')).toBe(false);
    expect(isOwn({ sender_role: 'doctor' })).toBe(false);
  });

  it('read beats delivered beats sent, and the sender alone does not count', () => {
    expect(tickOf({ sender_id: 'u1', delivered_to: ['u1'], read_by: ['u1'] })).toBe('sent');
    expect(tickOf({ sender_id: 'u1', delivered_to: ['u1', 'd1'], read_by: ['u1'] })).toBe('delivered');
    expect(tickOf({ sender_id: 'u1', delivered_to: ['u1', 'd1'], read_by: ['u1', 'd1'] })).toBe('read');
  });
});

describe('no duplicate when the socket echoes my own message', () => {
  it('echo before the POST answer: the local message is replaced, not doubled', () => {
    const echo = fromServer({ id: 's1', sender_id: 'u1', client_message_id: 'c1', body: 'hi', createdAt: '2026-10-30T10:00:00Z' }, 'u1', stamp);
    const afterEcho = addIncoming([mine()], echo);
    expect(afterEcho).toHaveLength(1);
    expect(afterEcho[0]).toMatchObject({ id: 's1', pending: false });
    expect(confirmSent(afterEcho, 'c1', 's1')).toHaveLength(1);
  });

  it('POST answer before the echo: the echo is ignored', () => {
    const confirmed = confirmSent([mine()], 'c1', 's1');
    expect(confirmed[0]).toMatchObject({ id: 's1', pending: false, tick: 'sent' });
    const echo = fromServer({ id: 's1', sender_id: 'u1', body: 'hi' }, 'u1', stamp);
    expect(addIncoming(confirmed, echo)).toHaveLength(1);
  });

  it("the doctor's live message is theirs, not mine", () => {
    const live = fromServer({ id: 'd9', sender_id: 'd1', body: 'hello' }, 'u1', stamp);
    expect(live.sender).toBe('doc');
    expect(addIncoming([], live)).toHaveLength(1);
  });
});

describe('state events', () => {
  const sent = mine({ id: 's1', pending: false, tick: 'sent' });
  const later = mine({ id: 's2', clientId: 'c2', pending: false, tick: 'sent', at: 9_000_000_000_000 });

  it('the other side reading moves earlier ticks up, never later ones, never down', () => {
    const at = new Date(5000).toISOString();
    const out = applyState([sent, later], { kind: 'read', user_id: 'd1', at }, 'u1');
    expect(out[0].tick).toBe('read');
    expect(out[1].tick).toBe('sent');
    expect(applyState(out, { kind: 'delivered', user_id: 'd1', at }, 'u1')[0].tick).toBe('read');
  });

  it('my own read event changes nothing; a failed or pending message keeps no tick', () => {
    expect(applyState([sent], { kind: 'read', user_id: 'u1', at: new Date(5000).toISOString() }, 'u1')[0].tick).toBe('sent');
    const failed = mine({ failed: true, pending: false });
    expect(applyState([failed], { kind: 'read', user_id: 'd1', at: new Date(5000).toISOString() }, 'u1')[0].tick).toBeUndefined();
  });

  it('a deleted event removes the message', () => {
    expect(applyState([sent], { kind: 'deleted', msg_id: 's1' })).toHaveLength(0);
  });
});

describe('offline outbox', () => {
  const item = (id: string, at: number): OutboxItem => ({ clientId: id, threadId: 't1', type: 'text', body: id, createdAt: at, attempts: 0 });
  beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); });

  it('keeps items across a restart, once per client id, in the order written', async () => {
    await enqueue(item('b', 2));
    await enqueue(item('a', 1));
    await enqueue(item('a', 1));
    expect((await loadOutbox()).length).toBe(2);
    expect((await forThread('t1')).map((i) => i.clientId)).toEqual(['a', 'b']);
    expect(await forThread('other')).toEqual([]);
  });

  it('flush sends in order, removes what went out, and stops at the first failure', async () => {
    await enqueue(item('a', 1));
    await enqueue(item('b', 2));
    await enqueue(item('c', 3));
    const seen: string[] = [];
    const failed: string[] = [];
    const sent = await flush('t1', async (i) => { seen.push(i.clientId); if (i.clientId === 'b') throw new Error('x'); }, (i) => failed.push(i.clientId));
    expect(sent).toBe(1);
    expect(seen).toEqual(['a', 'b']);
    expect(failed).toEqual(['b']);
    expect((await forThread('t1')).map((i) => i.clientId)).toEqual(['b', 'c']);
    await remove('b');
    expect((await forThread('t1')).map((i) => i.clientId)).toEqual(['c']);
  });
});
