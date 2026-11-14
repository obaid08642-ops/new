import { serverMessages } from '../../chat/chatState';

describe('serverMessages (GET /chat/threads/:id/messages)', () => {
  const one = { id: 'm1', body: 'hello' };
  it('reads the answer the backend sends: { messages, has_more }', () => {
    expect(serverMessages({ messages: [one], has_more: false })).toEqual([one]);
  });
  it('still reads a bare array and { data: [...] }', () => {
    expect(serverMessages([one])).toEqual([one]);
    expect(serverMessages({ data: [one] })).toEqual([one]);
    expect(serverMessages({ data: { messages: [one] } })).toEqual([one]);
  });
  it('gives an empty list for anything else', () => {
    expect(serverMessages(null)).toEqual([]);
    expect(serverMessages({})).toEqual([]);
    expect(serverMessages('x')).toEqual([]);
    expect(serverMessages({ messages: 'nope' })).toEqual([]);
  });
});
