import { StaleCache } from './stale-cache';

describe('StaleCache', () => {
  it('loads once for many concurrent callers (single-flight) and keeps the value for the ttl', async () => {
    const load = jest.fn(async () => { await new Promise((r) => setTimeout(r, 20)); return 'a'; });
    const c = new StaleCache(load, () => 1000);
    expect(await Promise.all([c.get(), c.get(), c.get()])).toEqual(['a', 'a', 'a']);
    await c.get();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves the last good value when a reload fails, and when it is too slow', async () => {
    let mode: 'ok' | 'fail' | 'hang' = 'ok';
    const load = jest.fn(async () => {
      if (mode === 'fail') throw new Error('db down');
      if (mode === 'hang') await new Promise(() => undefined);
      return 'good';
    });
    const c = new StaleCache(load, () => 0, 50);
    expect(await c.get()).toBe('good');
    mode = 'fail';
    expect(await c.get()).toBe('good');
    mode = 'hang';
    expect(await c.get()).toBe('good');
  });

  it('with no good value yet, the error reaches the caller; a later success is cached', async () => {
    let fail = true;
    const c = new StaleCache(async () => { if (fail) throw new Error('db down'); return 'x'; }, () => 1000);
    await expect(c.get()).rejects.toThrow('db down');
    fail = false;
    expect(await c.get()).toBe('x');
  });

  it('clear() forces the next read to load', async () => {
    const load = jest.fn(async () => 'v');
    const c = new StaleCache(load, () => 1000);
    await c.get(); c.clear(); await c.get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
