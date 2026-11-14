import { newestFromOther, sendThreadReceipts } from '../src/chat/receipts';

describe('chat receipts', () => {
  it('posts delivered, then read up to the given message', async () => {
    const api = jest.fn(async () => ({}));
    expect(await sendThreadReceipts(api, 't1', 'm9')).toBe(true);
    expect(api.mock.calls).toEqual([
      ['/chat/threads/t1/delivered', { method: 'POST', body: '{}' }],
      ['/chat/threads/t1/read', { method: 'POST', body: JSON.stringify({ up_to_message_id: 'm9' }) }],
    ]);
  });
  it('only delivered when there is nothing from the doctor', async () => {
    const api = jest.fn(async () => ({}));
    await sendThreadReceipts(api, 't1', null);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('a failure is quiet', async () => {
    expect(await sendThreadReceipts(jest.fn(async () => { throw new Error('offline'); }), 't1', 'm')).toBe(false);
  });
  it('newest from the other party', () => {
    expect(newestFromOther([{ id: 'a', sender: 'them' }, { id: 'b', sender: 'me' }, { id: 'c', sender: 'them' }, { id: 'd', sender: 'me' }])).toBe('c');
    expect(newestFromOther([{ id: 'a', sender: 'me' }])).toBeNull();
  });
});
