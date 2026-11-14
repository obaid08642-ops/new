import { runOnce, serverMessage } from './singleFlight';

describe('runOnce', () => {
  it('a second tap while the first is running does nothing; after it ends the user can try again', async () => {
    let release: () => void = () => {};
    const work = jest.fn(() => new Promise<string>((r) => { release = () => r('done'); }));
    const first = runOnce('accept:1', work);
    expect(await runOnce('accept:1', work)).toBeUndefined();
    expect(work).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toBe('done');
    const again = runOnce('accept:1', async () => 'second');
    expect(await again).toBe('second');
  });
  it('different keys do not block each other, and a failure releases the key', async () => {
    const a = runOnce('a', async () => { throw new Error('boom'); });
    await expect(a).rejects.toThrow('boom');
    expect(await runOnce('a', async () => 'ok')).toBe('ok');
    expect(await runOnce('b', async () => 'b')).toBe('b');
  });
});

describe('serverMessage', () => {
  it('prefers the server text, joins a list, falls back otherwise', () => {
    expect(serverMessage({ response: { data: { message: 'card_payment_not_completed' } } }, 'x')).toBe('card_payment_not_completed');
    expect(serverMessage({ response: { data: { message: ['a', 'b'] } } }, 'x')).toBe('a, b');
    expect(serverMessage(new Error('Request failed with status code 400'), 'Could not accept')).toBe('Could not accept');
  });
});
