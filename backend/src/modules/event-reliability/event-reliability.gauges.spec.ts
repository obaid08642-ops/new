import { MetricsService } from '../../common/metrics.service';
import { EventReliabilityService } from './event-reliability.module';

const gauge = (name: string): number | undefined => {
  const line = new MetricsService().scrape().split('\n').find((l) => l.startsWith(`${name} `));
  return line === undefined ? undefined : Number(line.split(' ')[1]);
};

/** The service with fake models: `dlq` answers by status, `outbox` by the pending-before filter. */
function service(counts: { dead: number | Error; pending: number | Error; stuck: number | Error }) {
  const answer = (v: number | Error) => (v instanceof Error ? Promise.reject(v) : Promise.resolve(v));
  const filters: unknown[] = [];
  const dlq = { countDocuments: jest.fn((f: { status: string }) => answer(f.status === 'dead' ? counts.dead : counts.pending)) };
  const events = { db: { collection: jest.fn((name: string) => ({ countDocuments: jest.fn((f: unknown) => { filters.push([name, f]); return answer(counts.stuck); }) })) } };
  return { svc: new EventReliabilityService(events as never, dlq as never, {} as never, {} as never), filters };
}

describe('EventReliabilityService.refreshGauges', () => {
  it('puts the dead-letter and stuck-outbox counts into the scrape; the outbox is asked for pending entries older than 30 minutes', async () => {
    const { svc, filters } = service({ dead: 2, pending: 14, stuck: 1 });
    const before = Date.now();
    await svc.refreshGauges();
    expect([gauge('nabd_event_dlq_dead'), gauge('nabd_event_dlq_pending'), gauge('nabd_domain_outbox_stuck')]).toEqual([2, 14, 1]);
    const [name, f] = filters[0] as [string, { state: string; created_at: { $lt: Date } }];
    expect(name).toBe('domain_outbox');
    expect(f.state).toBe('pending');
    expect(before - f.created_at.$lt.getTime()).toBeGreaterThanOrEqual(30 * 60_000 - 1000);
    expect(before - f.created_at.$lt.getTime()).toBeLessThan(31 * 60_000);
  });
  it('a count that fails to read keeps its last value and never throws; the others still update', async () => {
    await service({ dead: 4, pending: 9, stuck: 3 }).svc.refreshGauges();
    await expect(service({ dead: new Error('mongo down'), pending: 1, stuck: new Error('no collection') }).svc.refreshGauges()).resolves.toBeUndefined();
    expect([gauge('nabd_event_dlq_dead'), gauge('nabd_event_dlq_pending'), gauge('nabd_domain_outbox_stuck')]).toEqual([4, 1, 3]);
  });
});
