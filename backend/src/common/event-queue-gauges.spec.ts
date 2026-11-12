import { MetricsService } from './metrics.service';
import { setEventQueueGauges } from './event-queue-gauges';

const gauge = (name: string): number | undefined => {
  const line = new MetricsService().scrape().split('\n').find((l) => l.startsWith(`${name} `));
  return line === undefined ? undefined : Number(line.split(' ')[1]);
};

describe('event queue gauges (launch checklist 6.1)', () => {
  it('are in the scrape, from 0', () => {
    expect(gauge('nabd_event_dlq_dead')).toBe(0);
    expect(gauge('nabd_event_dlq_pending')).toBe(0);
    expect(gauge('nabd_domain_outbox_stuck')).toBe(0);
  });
  it('show what was set', () => {
    setEventQueueGauges({ dead: 3, pending: 12, stuck: 1 });
    expect([gauge('nabd_event_dlq_dead'), gauge('nabd_event_dlq_pending'), gauge('nabd_domain_outbox_stuck')]).toEqual([3, 12, 1]);
  });
  it('a count that could not be read (-1, NaN, a string) keeps the last value, the other counts still update', () => {
    setEventQueueGauges({ dead: 5, pending: 7, stuck: 2 });
    setEventQueueGauges({ dead: -1, pending: Number.NaN, stuck: 0 });
    expect([gauge('nabd_event_dlq_dead'), gauge('nabd_event_dlq_pending'), gauge('nabd_domain_outbox_stuck')]).toEqual([5, 7, 0]);
    setEventQueueGauges({ dead: '9' as unknown as number });
    expect(gauge('nabd_event_dlq_dead')).toBe(5);
  });
});
