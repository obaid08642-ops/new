/**
 * 13.R13 — Failed-propagation log (append-only, in-memory, capped).
 *
 * Purpose: record propagation attempts that failed (event -> target),
 * with error detail + retry accounting, so a later reconciliation job
 * (see ./reconciliation-job.ts) can prioritize retries and report drift.
 *
 * Design constraints (deliberate):
 * - Pure TypeScript, zero framework imports, zero DB wiring.
 * - Append-only: records are never mutated in place; retry accounting
 *   appends a new entry (or returns a new head pointer) — history kept.
 * - Capped size: oldest entries are evicted past MAX_FAILED_PROPAGATIONS
 *   so a poison/flooded target cannot grow memory unboundedly.
 *
 * FOLLOW-UP WIRING (not done here — registration is deferred):
 *   // observation.module.ts (new, follow-up):
 *   //   providers: [{ provide: 'FAILED_PROPAGATION_LOG', useValue: new FailedPropagationLog() }],
 *   // any scheduler/module: inject 'FAILED_PROPAGATION_LOG' and call .record(...)
 */

export interface FailedPropagationEntry {
  /** Logical event name, e.g. 'order.created'. Use EVENTS constants — never raw strings. */
  event: string;
  /** Propagation target, e.g. 'search-index', 'analytics-sink', 'webhook:orders'. */
  target: string;
  /** Short error summary (message only — never secrets/PII). */
  error: string;
  /** 0-based attempt index that failed: 0 = first attempt, N = Nth retry. */
  retryCount: number;
  /** Epoch ms when the failure was recorded. */
  failedAt: number;
  /** Optional correlation key (entity id / idempotency key) for dedupe. */
  key?: string;
}

/** Hard cap on retained entries; oldest-first eviction past this. */
export const MAX_FAILED_PROPAGATIONS = 500;

export class FailedPropagationLog {
  private readonly entries: FailedPropagationEntry[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = MAX_FAILED_PROPAGATIONS) {
    this.maxSize = Math.max(1, Math.floor(maxSize));
  }

  /**
   * Append a failure record. Pure append — never mutates existing entries.
   * Evicts oldest entries when the cap is exceeded.
   */
  record(input: Omit<FailedPropagationEntry, 'failedAt'> & { failedAt?: number }): FailedPropagationEntry {
    const entry: FailedPropagationEntry = {
      ...input,
      failedAt: input.failedAt ?? Date.now(),
    };
    this.entries.push(entry);
    while (this.entries.length > this.maxSize) this.entries.shift();
    return entry;
  }

  /**
   * Retry accounting: append a follow-up failure for the same event/target
   * with retryCount incremented from the latest matching entry
   * (matched by event+target+key). Returns the appended entry.
   */
  recordRetry(
    input: Pick<FailedPropagationEntry, 'event' | 'target' | 'error'> & { key?: string },
  ): FailedPropagationEntry {
    const prior = [...this.entries]
      .reverse()
      .find((e) => e.event === input.event && e.target === input.target && e.key === input.key);
    return this.record({ ...input, retryCount: (prior?.retryCount ?? -1) + 1 });
  }

  /** Snapshot of retained entries, oldest-first. Returns copies (read-only view). */
  list(): ReadonlyArray<Readonly<FailedPropagationEntry>> {
    return this.entries.map((e) => ({ ...e }));
  }

  /** Number of retained entries. */
  get size(): number {
    return this.entries.length;
  }

  /** Count failures for one event/target pair (retry pressure signal). */
  countFor(event: string, target: string): number {
    return this.entries.filter((e) => e.event === event && e.target === target).length;
  }

  /** Distinct targets that currently have failures (reconciliation priority list). */
  failingTargets(): string[] {
    return [...new Set(this.entries.map((e) => e.target))];
  }

  /** Drop all retained entries (used by tests / manual reset — never by the job itself). */
  clear(): void {
    this.entries.length = 0;
  }
}
