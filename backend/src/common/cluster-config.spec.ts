import {
  affordableWorkers, clusterAllowedForRole, MAX_CLUSTER_WORKERS, realtimeTransports, requestedClusterWorkers, restartDelayMs, shouldFork,
} from './cluster-config';

const GB = 1024 ** 3;

describe('CLUSTER_WORKERS: default is one process', () => {
  it('nothing set → 1 (the old "one fork per core" default is gone)', () => {
    expect(requestedClusterWorkers({}, 16)).toBe(1);
    expect(requestedClusterWorkers({ CLUSTER_MODE: 'true' }, 16)).toBe(1);
  });
  it.each([['abc'], [''], ['0'], ['-3'], ['1.5']])('invalid or below 1 (%p) → 1', (v) => {
    expect(requestedClusterWorkers({ CLUSTER_WORKERS: v }, 16)).toBe(1);
  });
  it('CLUSTER_MODE=false forces 1 even with CLUSTER_WORKERS set', () => {
    expect(requestedClusterWorkers({ CLUSTER_MODE: 'false', CLUSTER_WORKERS: '4' }, 16)).toBe(1);
  });
  it('a valid count is used, capped by the CPU count and by 8', () => {
    expect(requestedClusterWorkers({ CLUSTER_WORKERS: '2' }, 4)).toBe(2);
    expect(requestedClusterWorkers({ CLUSTER_WORKERS: '6' }, 4)).toBe(4);
    expect(requestedClusterWorkers({ CLUSTER_WORKERS: '50' }, 64)).toBe(MAX_CLUSTER_WORKERS);
  });
});

describe('the RAM guard', () => {
  it('2 workers fit with 4 GB free (700 MB each, 1536 MB kept back)', () => {
    expect(affordableWorkers(2, 4 * GB, {})).toBe(2);
  });
  it('1.1 GB free (today\'s host) leaves no room: 1', () => {
    expect(affordableWorkers(2, 1.1 * GB, {})).toBe(1);
  });
  it('cuts the count to what fits', () => {
    expect(affordableWorkers(8, 3 * GB, {})).toBe(2);
  });
  it('the per-worker figure and the reserve come from the environment (replace the planning default with the measured RSS)', () => {
    expect(affordableWorkers(4, 4 * GB, { CLUSTER_WORKER_RAM_MB: '400', CLUSTER_RESERVED_RAM_MB: '1000' })).toBe(4);
    expect(affordableWorkers(4, 4 * GB, { CLUSTER_WORKER_RAM_MB: '1500' })).toBe(1);
  });
  it('never below 1', () => {
    expect(affordableWorkers(2, 0, {})).toBe(1);
  });
});

describe('who forks', () => {
  const prod = { isPrimary: true, nodeEnv: 'production', role: 'api' as const };
  it('only 2+ workers, in production, on the primary, not the cron/queue role', () => {
    expect(shouldFork(2, prod)).toBe(true);
    expect(shouldFork(1, prod)).toBe(false);
    expect(shouldFork(2, { ...prod, isPrimary: false })).toBe(false);
    expect(shouldFork(2, { ...prod, nodeEnv: 'test' })).toBe(false);
    expect(shouldFork(2, { ...prod, role: 'worker' })).toBe(false);
  });
  it('API workers only where background work is off (PROCESS_ROLE=api): otherwise every worker would run every cron job', () => {
    expect(clusterAllowedForRole('api')).toBe(true);
    expect(clusterAllowedForRole('all')).toBe(false);
    expect(clusterAllowedForRole('worker')).toBe(false);
  });
});

describe('sockets with more than one worker', () => {
  it('polling stays on for one process, websocket only once 2+ workers serve sockets', () => {
    expect(realtimeTransports({})).toEqual(['websocket', 'polling']);
    expect(realtimeTransports({ CLUSTER_EFFECTIVE_WORKERS: '1' })).toEqual(['websocket', 'polling']);
    expect(realtimeTransports({ CLUSTER_EFFECTIVE_WORKERS: '2' })).toEqual(['websocket']);
    expect(realtimeTransports({ CLUSTER_EFFECTIVE_WORKERS: 'x' })).toEqual(['websocket', 'polling']);
  });
});

describe('a worker that keeps dying does not spin', () => {
  it('0.5 s, doubling, capped at 30 s', () => {
    expect([0, 1, 2, 3, 6, 20].map(restartDelayMs)).toEqual([500, 1000, 2000, 4000, 30000, 30000]);
  });
  it('a negative or fractional count is safe', () => {
    expect(restartDelayMs(-4)).toBe(500);
    expect(restartDelayMs(1.9)).toBe(1000);
  });
});
