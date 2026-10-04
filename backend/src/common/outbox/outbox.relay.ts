import { OutboxRecord } from './outbox.record';

// No scheduler wiring here on purpose: schedulers need app.module edits which
// are out of scope for this task. Call drainOutboxBatch() from the host's own
// scheduler/cron/queue worker when it is ready to own delivery.

export interface OutboxRelayDeps {
  fetchPending: (limit: number) => Promise<OutboxRecord[]>;
  publish: (record: OutboxRecord) => Promise<void>;
  markSent: (id: string, sentAtIso: string) => Promise<void>;
  markFailed: (id: string, errorMessage: string) => Promise<void>;
}

export interface OutboxDrainResult {
  attempted: number;
  sent: number;
  failed: number;
}

/**
 * Pure relay step: drains up to `limit` unsent rows via injected fetchers.
 * No timers, no module state — each row is published exactly once per call and
 * then marked sent/failed so a later tick never redelivers a sent row.
 */
export async function drainOutboxBatch(
  deps: OutboxRelayDeps,
  limit: number,
  nowIso: string = new Date().toISOString(),
): Promise<OutboxDrainResult> {
  const pending = await deps.fetchPending(limit);
  let sent = 0;
  let failed = 0;
  for (const record of pending) {
    try {
      await deps.publish(record);
      await deps.markSent(record.id, nowIso);
      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      await deps.markFailed(record.id, message);
    }
  }
  return { attempted: pending.length, sent, failed };
}
