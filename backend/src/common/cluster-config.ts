/**
 * Cluster mode, as decided by environment variables (docs/perf/CLUSTER_MODE.md).
 *
 * `CLUSTER_WORKERS` is the only switch and it defaults to 1: one process, exactly like production today. The old behaviour (cluster
 * on whenever `CLUSTER_MODE` was not "false", one fork per CPU core) is gone, so forgetting a variable can no longer fork a
 * process per core on a host that shares its RAM with MongoDB, Redis and Meilisearch. `CLUSTER_MODE=false` still forces one process.
 *
 * Nothing here turns cluster mode on by itself: the owner sets `CLUSTER_WORKERS=2` together with the RAM upgrade.
 */
export const MAX_CLUSTER_WORKERS = 8;
/** Planning default for the RAM one API worker needs, in MB. NOT a measurement: replace it with the RSS the `cluster_worker_online` log shows. */
export const DEFAULT_WORKER_RAM_MB = 700;
/** Free RAM that must stay untouched for MongoDB, Redis, Meilisearch and the OS, in MB. */
export const DEFAULT_RESERVED_RAM_MB = 1536;

const toInt = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

/** The worker count asked for: `CLUSTER_WORKERS`, 1 when unset, invalid or `CLUSTER_MODE=false`; never above 8 or the CPU count. */
export function requestedClusterWorkers(env: NodeJS.ProcessEnv = process.env, cpus = 1): number {
  if (String(env.CLUSTER_MODE || '').toLowerCase() === 'false') return 1;
  const n = toInt(env.CLUSTER_WORKERS);
  if (n === null || n < 1) return 1;
  return Math.max(1, Math.min(n, MAX_CLUSTER_WORKERS, Math.max(1, cpus)));
}

/**
 * The count that will really run: the request, cut down until the workers fit in the free RAM (keeping `reservedMb` free).
 * Fewer than 2 means "run as one process" and the caller logs why.
 */
export function affordableWorkers(requested: number, freeBytes: number, env: NodeJS.ProcessEnv = process.env): number {
  const perWorker = toInt(env.CLUSTER_WORKER_RAM_MB) ?? DEFAULT_WORKER_RAM_MB;
  const reserved = toInt(env.CLUSTER_RESERVED_RAM_MB) ?? DEFAULT_RESERVED_RAM_MB;
  const room = Math.floor((freeBytes / (1024 * 1024) - reserved) / Math.max(1, perWorker));
  return Math.max(1, Math.min(requested, room));
}

export interface ClusterContext { isPrimary: boolean; nodeEnv?: string; role: 'api' | 'worker' | 'all' }

/** True when this process should fork API workers: production, the primary, not the cron/queue role, and 2 or more workers. */
export function shouldFork(workers: number, ctx: ClusterContext): boolean {
  return workers >= 2 && ctx.nodeEnv === 'production' && ctx.isPrimary && ctx.role !== 'worker';
}

/**
 * Cluster API workers may run only where background work is OFF: with `PROCESS_ROLE=all` every worker would run every cron job and
 * queue consumer N times (docs/perf/CLUSTER_MODE.md). The count is cut to 1 in that case and the caller logs it.
 */
export function clusterAllowedForRole(role: ClusterContext['role']): boolean {
  return role === 'api';
}

/** Socket.IO transports: websocket only when more than one worker serves sockets (a polling handshake spans requests and would hit different workers). */
export function realtimeTransports(env: NodeJS.ProcessEnv = process.env): Array<'websocket' | 'polling'> {
  const effective = toInt(env.CLUSTER_EFFECTIVE_WORKERS);
  return effective !== null && effective >= 2 ? ['websocket'] : ['websocket', 'polling'];
}

/** Delay before re-forking a worker that exited: 0.5 s doubling to 30 s with the number of exits in the last minute, so a boot failure cannot spin. */
export function restartDelayMs(exitsInLastMinute: number): number {
  const n = Math.max(0, Math.floor(exitsInLastMinute));
  return Math.min(30_000, 500 * 2 ** Math.min(n, 6));
}
