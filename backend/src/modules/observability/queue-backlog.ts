/**
 * Phase 20.5 — the notifications delivery queue, as an SLO-style alert rule (kept apart from the service so it can be tested
 * on its own). The queue is the BullMQ queue `notifications-delivery` (notifications.module.ts): the API enqueues, the worker
 * delivers, and a job that keeps failing is retried with backoff and then sits in the failed set.
 *
 * Rules (the service samples the queue once a minute):
 *   queue_failed    the failed set grew by more than 20 jobs in the last 15 minutes
 *   queue_waiting   more than 200 jobs have been waiting in every check of the last 10 minutes
 * A sample that could not be read is not a zero: the rule needs the samples it covers.
 */
export interface QueueSample { at: number; failed: number; waiting: number }

export const QUEUE_FAILED_LIMIT = 20;
export const QUEUE_FAILED_WINDOW_MS = 15 * 60_000;
export const QUEUE_WAITING_LIMIT = 200;
export const QUEUE_WAITING_WINDOW_MS = 10 * 60_000;
/** A sample may be a little older than the window's edge and still count as covering it (checks are a minute apart). */
const EDGE_SLACK_MS = 60_000;

export interface QueueFinding { rule: 'queue_failed' | 'queue_waiting'; key: string; active: boolean; value: number; threshold: number; unit: string; detail: string }

/**
 * Evaluate both queue rules over the samples (oldest first). `now` is the time of the newest check. Returns one finding per
 * rule: `active` says whether it is breached now; a rule whose window the samples do not cover is reported inactive.
 */
export function evaluateQueueBacklog(samples: QueueSample[], now: number): QueueFinding[] {
  const findings: QueueFinding[] = [];
  const newest = samples[samples.length - 1];

  // failed: growth of the failed set across the window; the base is the latest sample at or before the window's start (a check
  // may run up to a minute late, which the slack allows)
  const failedStart = now - QUEUE_FAILED_WINDOW_MS;
  let base: QueueSample | undefined;
  for (const s of samples) { if (s.at <= failedStart + EDGE_SLACK_MS) base = s; else break; }
  const covered = !!base && !!newest && newest.at > base.at && newest.at - base.at >= QUEUE_FAILED_WINDOW_MS - EDGE_SLACK_MS;
  const grown = covered && newest ? newest.failed - (base as QueueSample).failed : 0;
  findings.push({
    rule: 'queue_failed', key: 'queue_failed', active: covered && grown > QUEUE_FAILED_LIMIT, value: grown, threshold: QUEUE_FAILED_LIMIT, unit: 'jobs',
    detail: covered ? `${grown} notification jobs failed in the last 15 minutes (the failed set grew; limit ${QUEUE_FAILED_LIMIT})` : 'Not enough samples yet to judge the failed notification jobs.',
  });

  // waiting: every check in the last 10 minutes is above the limit, and the samples cover the whole window
  const waitStart = now - QUEUE_WAITING_WINDOW_MS;
  const inWindow = samples.filter((s) => s.at > waitStart);
  const oldest = inWindow[0];
  const waitCovered = !!oldest && oldest.at <= waitStart + EDGE_SLACK_MS && inWindow.length >= 2;
  const lowest = inWindow.length ? Math.min(...inWindow.map((s) => s.waiting)) : 0;
  findings.push({
    rule: 'queue_waiting', key: 'queue_waiting', active: waitCovered && lowest > QUEUE_WAITING_LIMIT, value: lowest, threshold: QUEUE_WAITING_LIMIT, unit: 'jobs',
    detail: waitCovered ? `at least ${lowest} notification jobs have been waiting for over 10 minutes (limit ${QUEUE_WAITING_LIMIT})` : 'Not enough samples yet to judge the waiting notification jobs.',
  });
  return findings;
}
