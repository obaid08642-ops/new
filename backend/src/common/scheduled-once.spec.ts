/**
 * R3: `@ScheduledOnce` against a real Redis (throw-away redis-server, as configured-io.adapter.spec.ts does): N workers firing the same tick run a job once;
 * a late tick does not run it again; a long job keeps its lease; a dead worker's lease expires; Redis trouble fails open (or closed on request).
 */
import { spawn, spawnSync, ChildProcess } from 'child_process';
import net from 'net';
import Redis from 'ioredis';
import { Cron } from '@nestjs/schedule';
import { CronLease, ScheduledOnce, cronLeaseStats, runSerialized, runWithLease, serialStats } from './scheduled-once';

const hasRedis = spawnSync('redis-server', ['--version']).status === 0;
const freePort = () => new Promise<number>((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

(hasRedis ? describe : describe.skip)('@ScheduledOnce (Redis lease)', () => {
  jest.setTimeout(30_000);
  let server: ChildProcess;
  let redis: Redis;
  beforeAll(async () => {
    const port = await freePort();
    server = spawn('redis-server', ['--port', String(port), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    await wait(400);
    redis = new Redis(`redis://127.0.0.1:${port}`);
    CronLease.configure(() => redis as any);
  });
  afterAll(async () => { await redis?.quit(); server?.kill(); });
  beforeEach(async () => { await redis.flushall(); delete process.env.CRON_LEASE_FAIL_CLOSED; CronLease.configure(() => redis as any); });

  const counter = () => { const c = { runs: 0 }; return { c, job: async () => { c.runs++; await wait(20); } }; };

  it.each([2, 8])('%i workers firing the same tick: the job runs once', async (n) => {
    const { c, job } = counter();
    await Promise.all(Array.from({ length: n }, () => runWithLease('t.once', job)));
    expect(c.runs).toBe(1);
  });

  it('a late tick right after the job finished does not run it again; after the hold time it does', async () => {
    const { c, job } = counter();
    await runWithLease('t.hold', job, { holdMs: 400 });
    await runWithLease('t.hold', job, { holdMs: 400 });      // the second worker's tick, a moment late
    expect(c.runs).toBe(1);
    await wait(500);
    await runWithLease('t.hold', job, { holdMs: 400 });      // next period
    expect(c.runs).toBe(2);
  });

  it('a job longer than the ttl keeps its lease (renewed), so a second worker never starts it', async () => {
    const { c } = counter();
    const long = async () => { c.runs++; await wait(1500); };
    const first = runWithLease('t.long', long, { ttlMs: 600, holdMs: 100 });
    await wait(1000);                                          // past the original ttl
    await runWithLease('t.long', long, { ttlMs: 600, holdMs: 100 });
    await first;
    expect(c.runs).toBe(1);
  });

  it('a worker that died holding the lease: another worker takes over once the ttl is over, not before', async () => {
    const { c, job } = counter();
    await redis.set('cron:lease:t.dead', 'dead-worker:1:abc', 'PX', 400, 'NX');
    await runWithLease('t.dead', job);
    expect(c.runs).toBe(0);
    await wait(500);
    await runWithLease('t.dead', job);
    expect(c.runs).toBe(1);
  });

  it('a failing job propagates its error and still shortens the lease to the hold time (it is not stuck for the ttl)', async () => {
    await expect(runWithLease('t.fail', async () => { throw new Error('boom'); }, { ttlMs: 20_000, holdMs: 300 })).rejects.toThrow('boom');
    const ttl = await redis.pttl('cron:lease:t.fail');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it('a lease that someone else now owns is not shortened or deleted by the old worker', async () => {
    const job = async () => { await redis.set('cron:lease:t.steal', 'other:2:def', 'PX', 5000); };
    await runWithLease('t.steal', job, { holdMs: 100 });
    expect(await redis.get('cron:lease:t.steal')).toBe('other:2:def');
    expect(await redis.pttl('cron:lease:t.steal')).toBeGreaterThan(1000);
  });

  it('Redis unavailable: fails open (runs) by default and skips with CRON_LEASE_FAIL_CLOSED=1', async () => {
    const { c, job } = counter();
    CronLease.configure(() => null);
    await runWithLease('t.open', job);
    expect(c.runs).toBe(1);
    CronLease.configure(() => ({ status: 'fallback', set: async () => 'OK' }) as any);   // RedisService's per-process shim is not a lease either
    await runWithLease('t.open', job);
    expect(c.runs).toBe(2);
    process.env.CRON_LEASE_FAIL_CLOSED = '1';
    const before = cronLeaseStats.failedClosed;
    await runWithLease('t.open', job);
    expect(c.runs).toBe(2);
    expect(cronLeaseStats.failedClosed).toBe(before + 1);
  });

  it('a Redis error on acquire is treated as unavailable, not as "someone else has it"', async () => {
    const { c, job } = counter();
    CronLease.configure(() => ({ set: async () => { throw new Error('ECONNRESET'); }, eval: async () => 0 }) as any);
    await runWithLease('t.err', job);
    expect(c.runs).toBe(1);
  });

  describe('the decorator', () => {
    class Svc {
      runs = 0;
      @Cron('*/5 * * * *')
      @ScheduledOnce({ holdMs: 200 })
      async sweep(arg = 'x') { this.runs++; await wait(20); return `${arg}:${this.runs}`; }
    }

    it('two instances (two workers) called at once: one runs, `this` and arguments are preserved, the other gets undefined', async () => {
      const a = new Svc(); const b = new Svc();
      const [ra, rb] = await Promise.all([a.sweep('hello'), b.sweep('hello')]);
      expect(a.runs + b.runs).toBe(1);
      expect([ra, rb].filter((r) => r === 'hello:1')).toHaveLength(1);
      expect([ra, rb].filter((r) => r === undefined)).toHaveLength(1);
    });

    it('keeps the @Cron metadata on the wrapped method so the scheduler still registers it, under the same method name', () => {
      const fn = Svc.prototype.sweep;
      expect(fn.name).toBe('sweep');
      expect(Reflect.getMetadataKeys(fn).length).toBeGreaterThan(0);
      expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', fn)).toMatchObject({ cronTime: '*/5 * * * *' });
    });

    it('names the lease after Class.method', async () => {
      const s = new Svc();
      const slow = s.sweep();
      await wait(5);
      expect(await redis.exists('cron:lease:Svc.sweep')).toBe(1);
      await slow;
    });
  });

  describe('runSerialized: heavy jobs of one group run one at a time (2026-11-14: mongod killed by its memory limit while nightly jobs overlapped)', () => {
    const track = () => {
      const t = { running: 0, max: 0, order: [] as string[] };
      const job = (name: string, ms: number) => async () => { t.running++; t.max = Math.max(t.max, t.running); t.order.push(`start:${name}`); await wait(ms); t.order.push(`end:${name}`); t.running--; return name; };
      return { t, job };
    };
    const fast = { serialPollMs: 20, ttlMs: 3_000 };

    it('three jobs of one group started at the same time never overlap, and all three run (they wait, they are not skipped)', async () => {
      const { t, job } = track();
      const out = await Promise.all(['a', 'b', 'c'].map((n) => runSerialized('heavy.t1', n, job(n, 60), fast)));
      expect(out.sort()).toEqual(['a', 'b', 'c']);
      expect(t.max).toBe(1);
      expect(t.order.filter((o) => o.startsWith('start'))).toHaveLength(3);
    });

    it('jobs of different groups run side by side', async () => {
      const { t, job } = track();
      await Promise.all([runSerialized('heavy.g1', 'a', job('a', 80), fast), runSerialized('heavy.g2', 'b', job('b', 80), fast)]);
      expect(t.max).toBe(2);
    });

    it('the turn is released when the job ends (the key is deleted, the next job starts at once), and also when it throws', async () => {
      const { job } = track();
      await runSerialized('heavy.t2', 'a', job('a', 10), fast);
      expect(await redis.exists('cron:serial:heavy.t2')).toBe(0);
      await expect(runSerialized('heavy.t2', 'boom', async () => { throw new Error('x'); }, fast)).rejects.toThrow('x');
      expect(await redis.exists('cron:serial:heavy.t2')).toBe(0);
    });

    it('a job whose turn does not come within the maximum wait is skipped with a count, and the running job is untouched', async () => {
      const { t, job } = track();
      const before = serialStats.gaveUp;
      const first = runSerialized('heavy.t3', 'long', job('long', 400), fast);
      await wait(30);
      const second = await runSerialized('heavy.t3', 'late', job('late', 10), { ...fast, serialMaxWaitMs: 120 });
      expect(second).toBeUndefined();
      expect(serialStats.gaveUp).toBe(before + 1);
      expect(await first).toBe('long');
      expect(t.order).toEqual(['start:long', 'end:long']);
    });

    it('a long job keeps its turn (renewed) past the ttl, so a waiting job never starts beside it', async () => {
      const { t, job } = track();
      const first = runSerialized('heavy.t4', 'long', job('long', 1_200), { serialPollMs: 20, ttlMs: 600 } as any);
      await wait(30);
      const second = runSerialized('heavy.t4', 'next', job('next', 20), { serialPollMs: 20, ttlMs: 600 } as any);
      await Promise.all([first, second]);
      expect(t.max).toBe(1);
      expect(t.order.indexOf('end:long')).toBeLessThan(t.order.indexOf('start:next'));
    });

    it('the decorator option `serial` puts a cron method into the group (and the per-job lease still keeps it to one worker)', async () => {
      const { t } = track();
      class Heavy {
        @ScheduledOnce({ serial: 'heavy.dec', serialPollMs: 20, ttlMs: 3_000 })
        async a() { t.running++; t.max = Math.max(t.max, t.running); await wait(60); t.running--; return 'a'; }
        @ScheduledOnce({ serial: 'heavy.dec', serialPollMs: 20, ttlMs: 3_000 })
        async b() { t.running++; t.max = Math.max(t.max, t.running); await wait(60); t.running--; return 'b'; }
      }
      const h = new Heavy();
      const out = await Promise.all([h.a(), h.b()]);
      expect(out.sort()).toEqual(['a', 'b']);
      expect(t.max).toBe(1);
    });

    it('Redis not available: runs without a turn (fail-open, like the per-job lease); skipped under CRON_LEASE_FAIL_CLOSED=1', async () => {
      CronLease.configure(() => null);
      const { job } = track();
      expect(await runSerialized('heavy.t5', 'a', job('a', 5), fast)).toBe('a');
      process.env.CRON_LEASE_FAIL_CLOSED = '1';
      expect(await runSerialized('heavy.t5', 'b', job('b', 5), fast)).toBeUndefined();
    });
  });
});
