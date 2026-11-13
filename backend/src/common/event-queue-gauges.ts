import { registerGauge } from './metrics.service';

/**
 * Launch checklist 6.1 (watch the outbox / dead-letter queue in the first weeks): the counts that GET /event-reliability/status already shows an admin, as scrapeable gauges, so an
 * alert (ops/prometheus/nabd-alerts.yml: DeadLetterQueueHasDeadEvents, DeadLetterQueueBacklog, DomainOutboxStuck) fires without anyone opening the admin screen.
 * Each API process refreshes its own copy once a minute (EventReliabilityService.refreshGauges); a count that could not be read keeps the last value.
 */
let dead = 0;
let pending = 0;
let stuck = 0;
registerGauge('nabd_event_dlq_dead', 'Events in the dead-letter queue that failed 5 times and are dead (need a person).', () => dead);
registerGauge('nabd_event_dlq_pending', 'Events in the dead-letter queue waiting for a retry.', () => pending);
registerGauge('nabd_domain_outbox_stuck', 'Domain outbox entries pending for more than 30 minutes (propagation failures outside the dead-letter queue).', () => stuck);

/** Sets the gauges; a negative or non-finite number means "could not be read" and leaves that gauge as it was. */
export function setEventQueueGauges(v: { dead?: number; pending?: number; stuck?: number }): void {
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (ok(v.dead)) dead = v.dead;
  if (ok(v.pending)) pending = v.pending;
  if (ok(v.stuck)) stuck = v.stuck;
}
