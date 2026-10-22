/**
 * Phase 20.5 — SLOs, kept in the repo as code.
 *
 * 20.5 asks for "API availability 99.9%, checkout success rate, and p95 per
 * route group", with each alert carrying a runbook link. Writing them as data
 * rather than as dashboard clicks means the alert, the runbook link and the
 * number the owner agreed to cannot drift apart.
 */
export interface SloTarget {
  id: string;
  name: string;
  /** e.g. 0.999 for 99.9%. */
  target: number;
  unit: 'ratio' | 'ms' | 'jobs';
  window: string;
  /** Where to read when it fires. */
  runbook: string;
}

export const SLO_TARGETS: SloTarget[] = [
  {
    id: 'api_availability',
    name: 'API availability',
    target: 0.999,
    unit: 'ratio',
    window: '30d',
    runbook: 'docs/runbooks/api-availability.md',
  },
  {
    id: 'checkout_success',
    name: 'Checkout success rate',
    target: 0.99,
    unit: 'ratio',
    window: '7d',
    runbook: 'docs/runbooks/checkout-failures.md',
  },
  {
    id: 'p95_latency',
    name: 'p95 latency per route group',
    target: 500,
    unit: 'ms',
    window: '1h',
    runbook: 'docs/runbooks/slow-api.md',
  },
  {
    // The notification delivery queue: waiting jobs stay at or under 200, and failed jobs grow by at most 20 in 15 minutes.
    id: 'notifications_queue',
    name: 'Notification queue backlog',
    target: 200,
    unit: 'jobs',
    window: '10m',
    runbook: 'docs/runbooks/notifications-queue.md',
  },
  {
    id: 'event_loop_lag',
    name: 'Event-loop delay',
    target: 100,
    unit: 'ms',
    window: '5m',
    runbook: 'docs/runbooks/slow-api.md',
  },
];