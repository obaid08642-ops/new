import { optimistic } from './optimistic';

describe('15.3 optimistic()', () => {
  it('shows the change first, then asks the server; success keeps it and returns the answer', async () => {
    const order: string[] = [];
    const r = await optimistic({ apply: () => order.push('apply'), request: async () => { order.push('request'); return { in_wishlist: true }; }, rollback: () => order.push('rollback'), onFail: () => order.push('fail') });
    expect(order).toEqual(['apply', 'request']);
    expect(r).toEqual({ ok: true, value: { in_wishlist: true } });
  });

  it('a forced 500 rolls back once, then tells the person once, and never throws', async () => {
    const order: string[] = [];
    const error = Object.assign(new Error('Internal Server Error'), { status: 500 });
    const r = await optimistic({ apply: () => order.push('apply'), request: async () => { throw error; }, rollback: (e) => order.push(`rollback:${(e as Error).message}`), onFail: () => order.push('fail') });
    expect(order).toEqual(['apply', 'rollback:Internal Server Error', 'fail']);
    expect(r).toEqual({ ok: false, error });
  });

  it('a network failure is a failure too', async () => {
    const rollback = jest.fn();
    const r = await optimistic({ apply: jest.fn(), request: () => Promise.reject(new TypeError('Network request failed')), rollback });
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false);
  });

  it('a failing toast does not undo the undo', async () => {
    const rollback = jest.fn();
    const r = await optimistic({ apply: jest.fn(), request: async () => { throw new Error('x'); }, rollback, onFail: () => { throw new Error('toast broke'); } });
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false);
  });
});
