import * as bcryptjs from 'bcryptjs';
import { monitorEventLoopDelay } from 'perf_hooks';

/** The module reads these when it is called, so the tests set them before each call and import it once. */
import { compare, hash, stopPasswordWorkers } from './password-hash';

describe('password-hash (bcrypt off the main thread)', () => {
  afterEach(async () => { delete process.env.BCRYPT_FORCE_WORKER; delete process.env.BCRYPT_INLINE; await stopPasswordWorkers(); });

  it('inline (the default under jest): same results as bcryptjs, old hashes verify', async () => {
    const old = await bcryptjs.hash('secret-1', 4);
    expect(await compare('secret-1', old)).toBe(true);
    expect(await compare('other', old)).toBe(false);
    const fresh = await hash('secret-2', 4);
    expect(await bcryptjs.compare('secret-2', fresh)).toBe(true);
  });

  it('in a worker thread: hash and compare round-trip with bcryptjs hashes in both directions', async () => {
    process.env.BCRYPT_FORCE_WORKER = '1';
    const old = await bcryptjs.hash('secret-3', 4);
    expect(await compare('secret-3', old)).toBe(true);
    expect(await compare('nope', old)).toBe(false);
    const fresh = await hash('secret-4', 4);
    expect(fresh).toMatch(/^\$2[aby]\$04\$/);
    expect(await bcryptjs.compare('secret-4', fresh)).toBe(true);
    expect(await compare('secret-4', fresh)).toBe(true);
  });

  it('a malformed hash is a plain false/rejection like bcryptjs, and the pool keeps working', async () => {
    process.env.BCRYPT_FORCE_WORKER = '1';
    expect(await compare('x', 'not-a-bcrypt-hash')).toBe(false);
    await expect(hash('x', 'bad-salt' as never)).rejects.toBeInstanceOf(Error);
    expect(await compare('ok', await hash('ok', 4))).toBe(true);
  });

  it('a worker that dies is replaced on the next call and its pending calls are rejected, not lost', async () => {
    process.env.BCRYPT_FORCE_WORKER = '1';
    expect(await compare('a', await hash('a', 4))).toBe(true);
    await stopPasswordWorkers();   // terminates the live worker
    expect(await compare('b', await hash('b', 4))).toBe(true);   // a new one starts
  });

  it('the event loop keeps ticking while a cost-12 hash runs in the worker (it does not while inline)', async () => {
    const gap = async (): Promise<number> => {
      const h = monitorEventLoopDelay({ resolution: 10 });
      h.enable();
      const p = hash('timing-probe', 12);
      await new Promise((r) => setTimeout(r, 50));   // let the worker start before measuring the busy part
      h.reset();
      await p;
      h.disable();
      return h.max / 1e6;
    };
    process.env.BCRYPT_FORCE_WORKER = '1';
    const inWorker = await gap();
    delete process.env.BCRYPT_FORCE_WORKER;   // inline under jest
    const inline = await gap();
    expect(inWorker).toBeLessThan(60);
    expect(inline).toBeGreaterThan(inWorker);
  }, 30_000);
});
