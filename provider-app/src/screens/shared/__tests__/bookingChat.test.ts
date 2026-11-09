import { messagesUrl, orderedMessages, sendBody, threadBody, threadIdOf } from '../bookingChat';

describe('provider booking chat (lab, radiology)', () => {
  it('opens the thread of the booking by kind and id', () => {
    expect(threadBody('lab', { id: 'b1' })).toEqual({ booking_kind: 'lab', booking_id: 'b1' });
    expect(threadBody('radiology', { raw: { id: 'r9' } })).toEqual({ booking_kind: 'radiology', booking_id: 'r9' });
    expect(threadBody('lab', {})).toBeNull();
    expect(threadBody('lab', null)).toBeNull();
  });
  it('reads the thread id from either answer shape', () => {
    expect(threadIdOf({ id: 't1' })).toBe('t1');
    expect(threadIdOf({ thread: { id: 't2' } })).toBe('t2');
    expect(threadIdOf({})).toBeNull();
  });
  it('shows messages oldest first and does not change the answer', () => {
    const data = { messages: [{ id: 3 }, { id: 2 }, { id: 1 }] };
    expect(orderedMessages(data).map((m) => m.id)).toEqual([1, 2, 3]);
    expect(data.messages[0].id).toBe(3);
    expect(orderedMessages(undefined)).toEqual([]);
  });
  it('sends trimmed text with a client id, never an empty message', () => {
    expect(sendBody('  hello ', 5)).toEqual({ body: 'hello', client_message_id: 'p_5' });
    expect(sendBody('   ')).toBeNull();
    expect(messagesUrl('a/b')).toBe('/chats/threads/a%2Fb/messages');
  });
});
