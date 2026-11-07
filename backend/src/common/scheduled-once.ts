import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { hostname } from 'os';
import { registerGauge } from './metrics.service';

/**
 * R3: `@ScheduledOnce()` under `@Cron`/`@Interval` makes a job run on ONE worker at a time, however many workers are started.
 *
 *   @Cron('*\/5 * * * *')
 *   @ScheduledOnce()                       // lease name = ClassName.method
 *   async sweep() { ... }
 *
 * Every worker's scheduler fires at the same tick. Each tries `SET cron:lease:<name> <token> PX <ttl> NX` in the main Redis. The winner runs the
 * job and renews the lease every ttl/3 while it works (a long job keeps it; a worker that dies loses it after `ttlMs`). The others skip silently.
 * When the job ends the key is shortened to `holdMs` (not deleted): a worker whose tick arrives a moment late must not find the key gone and
 * run the job a second time. Keep holdMs well below the job's period (default 2 s; for `@Interval(n)` use about n/2).
 *
 * Redis unavailable (or the in-memory fallback shim, which is per-process): the job RUNS (fail-open, same as today with one worker) and a warning is
 * logged. Set CRON_LEASE_FAIL_CLOSED=1 once more than one worker runs, to skip instead.
 */
export interface ScheduledOnceOptions { name?: string; ttlMs?: number; holdMs?: number }

const RENEW_LUA = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
const RELEASE_LUA = RENEW_LUA; // releasing = shortening the key to the hold time, only if it is still ours

type RedisLike = { set: (...a: any[]) => Promise<any>; eval?: (...a: any[]) => Promise<any>; status?: string };
const logger = new Logger('ScheduledOnce');
let clientProvider: () => RedisLike | null = () => null;
export const cronLeaseStats = { ran: 0, skipped: 0, failedOpen: 0, failedClosed: 0, lost: 0 };
// R5: visible to Prometheus, so a lost lease or a Redis outage under CRON_LEASE_FAIL_CLOSED=1 shows up without reading logs
registerGauge('nabd_cron_lease_ran_total', 'Scheduled job runs that held the Redis lease.', () => cronLeaseStats.ran, 'counter');
registerGauge('nabd_cron_lease_skipped_total', 'Scheduled job ticks skipped because another worker holds the lease.', () => cronLeaseStats.skipped, 'counter');
registerGauge('nabd_cron_lease_unavailable_total', 'Ticks where Redis was unavailable (ran without a lease, or skipped when fail-closed).', () => cronLeaseStats.failedOpen + cronLeaseStats.failedClosed, 'counter');
registerGauge('nabd_cron_lease_lost_total', 'Leases lost while the job was still running.', () => cronLeaseStats.lost, 'counter');

export const CronLease = {
  /** Called once by the Redis module. */
  configure(provider: () => RedisLike | null) { clientProvider = provider; },
};

const failClosed = () => process.env.CRON_LEASE_FAIL_CLOSED === '1';

export async function runWithLease<T>(name: string, fn: () => Promise<T>, opts: ScheduledOnceOptions = {}): Promise<T | undefined> {
  const ttlMs = opts.ttlMs ?? 30_000;
  const holdMs = Math.min(opts.holdMs ?? 2_000, ttlMs);
  const key = `cron:lease:${name}`;
  const token = `${hostname()}:${process.pid}:${randomBytes(6).toString('hex')}`;
  let client: RedisLike | null = null;
  try { client = clientProvider(); } catch { client = null; }
  const usable = client && client.status !== 'fallback' && typeof client.eval === 'function';
  if (!usable) return unavailable(name, 'no_redis', fn);
  try {
    const got = await client!.set(key, token, 'PX', ttlMs, 'NX');
    if (got !== 'OK') { cronLeaseStats.skipped++; return undefined; }
  } catch (e: any) {
    return unavailable(name, e?.message || 'redis_error', fn);
  }
  cronLeaseStats.ran++;
  const timer = setInterval(() => {
    client!.eval!(RENEW_LUA, 1, key, token, ttlMs).then((r: any) => {
      if (Number(r) !== 1) { cronLeaseStats.lost++; logger.error(`cron_lease_lost name=${name}: another worker may now run it`); clearInterval(timer); }
    }).catch(() => undefined);
  }, Math.max(50, Math.floor(ttlMs / 3)));
  timer.unref?.();
  try {
    return await fn();
  } finally {
    clearInterval(timer);
    await client!.eval!(RELEASE_LUA, 1, key, token, holdMs).catch(() => undefined);
  }
}

const lastWarn = new Map<string, number>();
function warnOnce(name: string, msg: string) {   // a 3 s job must not log every 3 s through a Redis outage
  const now = Date.now();
  if (now - (lastWarn.get(name) ?? 0) < 60_000) return;
  lastWarn.set(name, now);
  logger.warn(msg);
}

function unavailable<T>(name: string, why: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (failClosed()) { cronLeaseStats.failedClosed++; warnOnce(name, `cron_lease_unavailable name=${name} why=${why}: skipped (CRON_LEASE_FAIL_CLOSED=1)`); return Promise.resolve(undefined); }
  cronLeaseStats.failedOpen++;
  warnOnce(name, `cron_lease_unavailable name=${name} why=${why}: running without a lease`);
  return fn();
}

export function ScheduledOnce(opts: ScheduledOnceOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    const name = opts.name ?? `${(target as any).constructor?.name}.${String(propertyKey)}`;
    descriptor.value = function (this: unknown, ...args: any[]) {
      return runWithLease(name, async () => original.apply(this, args), opts);
    };
    // @Cron/@Interval above this line read their metadata from the function they decorate: keep the original's, if any, on the wrapper
    for (const k of Reflect.getMetadataKeys(original)) Reflect.defineMetadata(k, Reflect.getMetadata(k, original), descriptor.value);
    Object.defineProperty(descriptor.value, 'name', { value: String(propertyKey) });
    return descriptor;
  };
}
