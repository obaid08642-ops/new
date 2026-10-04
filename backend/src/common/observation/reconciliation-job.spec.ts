import { FailedPropagationLog } from './failed-propagation-log';
import { reconcilePropagatedState } from './reconciliation-job';

interface Widget {
  id: string;
  rev: number;
}

const getId = (w: Widget): string => w.id;

describe('observation: reconciliation + failed-propagation (13.R13)', () => {
  it('detects missing, mismatched, and orphan drift with exact counts', async () => {
    const source: Widget[] = [
      { id: 'a', rev: 1 }, // matched
      { id: 'b', rev: 2 }, // mismatched downstream
      { id: 'c', rev: 1 }, // missing downstream
    ];
    const downstream: Widget[] = [
      { id: 'a', rev: 1 },
      { id: 'b', rev: 1 }, // stale rev
      { id: 'z', rev: 9 }, // orphan
    ];

    const report = await reconcilePropagatedState(
      async () => source,
      async () => downstream,
      { getId },
    );

    expect(report.sourceTotal).toBe(3);
    expect(report.propagatedTotal).toBe(3);
    expect(report.matched).toBe(1);
    expect(report.driftCount).toBe(3);
    expect(report.inSync).toBe(false);
    expect(report.drifts).toEqual(
      expect.arrayContaining([
        { id: 'b', kind: 'mismatched' },
        { id: 'c', kind: 'missing-downstream' },
        { id: 'z', kind: 'orphan-downstream' },
      ]),
    );
  });

  it('reports inSync when source and propagated agree', async () => {
    const rows: Widget[] = [{ id: 'a', rev: 1 }];
    const report = await reconcilePropagatedState(async () => rows, async () => [...rows], { getId });
    expect(report.driftCount).toBe(0);
    expect(report.inSync).toBe(true);
  });

  it('accounts retries with incrementing retryCount and caps retained size', () => {
    const log = new FailedPropagationLog(3);
    log.recordRetry({ event: 'order.created', target: 'search-index', error: 'timeout', key: 'o1' });
    log.recordRetry({ event: 'order.created', target: 'search-index', error: 'timeout', key: 'o1' });
    log.recordRetry({ event: 'order.created', target: 'search-index', error: 'timeout', key: 'o1' });
    // Cap overflow: 4th distinct record evicts the oldest (retryCount 0).
    log.record({ event: 'order.created', target: 'search-index', error: 'boom', retryCount: 0 });

    expect(log.size).toBe(3);
    expect(log.countFor('order.created', 'search-index')).toBe(3);
    expect(log.failingTargets()).toEqual(['search-index']);
    const counts = log.list().map((e) => e.retryCount);
    expect(counts).toEqual([1, 2, 0]); // oldest (0 = first attempt) evicted
  });
});
