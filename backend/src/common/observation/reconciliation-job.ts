/**
 * 13.R13 — Reconciliation job (pure function over injected fetchers, no DB wiring).
 *
 * Compares source-of-truth state vs propagated (downstream) state for a
 * generic entity pair and reports drift: entities missing downstream,
 * entities present but unequal, and entities only downstream (orphans).
 *
 * Design constraints (deliberate):
 * - Pure function: all I/O arrives via injected async fetchers.
 * - No imports from persistence layers, no scheduler decorators.
 * - Generic over entity type T; identity via `getId`, equality via `isEqual`.
 *
 * FOLLOW-UP WIRING (not done here — registration is deferred):
 *   Create some.scheduler.ts in a follow-up that calls
 *   reconcilePropagatedState(fetchSource, fetchDownstream, { getId })
 *   on a 5-minute cron schedule.
 */

export interface ReconciliationOptions<T> {
  /** Stable identity for an entity (e.g. (o) => o.id). */
  getId: (entity: T) => string;
  /**
   * Equality check between source and propagated copies.
   * Defaults to JSON deep-equal; supply a domain comparator to ignore
   * propagated-only metadata (e.g. syncedAt, downstream version stamps).
   */
  isEqual?: (source: T, propagated: T) => boolean;
  /** Cap on reported drift ids (report is truncated past this; counts stay exact). */
  maxDriftIds?: number;
}

export interface DriftDetail {
  id: string;
  kind: 'missing-downstream' | 'mismatched' | 'orphan-downstream';
}

export interface ReconciliationReport {
  /** Entities seen in source. */
  sourceTotal: number;
  /** Entities seen downstream. */
  propagatedTotal: number;
  /** Source entities with an equal downstream copy. */
  matched: number;
  /** Total drifted entities (missing + mismatched + orphan). */
  driftCount: number;
  /** Per-id drift breakdown (truncated to maxDriftIds; counts unaffected). */
  drifts: DriftDetail[];
  /** True when driftCount === 0. */
  inSync: boolean;
}

const DEFAULT_MAX_DRIFT_IDS = 100;

function defaultEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function reconcilePropagatedState<T>(
  fetchSource: () => Promise<ReadonlyArray<T>>,
  fetchPropagated: () => Promise<ReadonlyArray<T>>,
  options: ReconciliationOptions<T>,
): Promise<ReconciliationReport> {
  const { getId, isEqual = defaultEqual, maxDriftIds = DEFAULT_MAX_DRIFT_IDS } = options;
  const [source, propagated] = await Promise.all([fetchSource(), fetchPropagated()]);

  const downstreamById = new Map<string, T>();
  for (const entity of propagated) downstreamById.set(getId(entity), entity);

  const sourceIds = new Set<string>();
  const drifts: DriftDetail[] = [];
  let matched = 0;

  for (const entity of source) {
    const id = getId(entity);
    sourceIds.add(id);
    const downstream = downstreamById.get(id);
    if (!downstream) {
      drifts.push({ id, kind: 'missing-downstream' });
    } else if (!isEqual(entity, downstream)) {
      drifts.push({ id, kind: 'mismatched' });
    } else {
      matched += 1;
    }
  }

  for (const entity of propagated) {
    const id = getId(entity);
    if (!sourceIds.has(id)) drifts.push({ id, kind: 'orphan-downstream' });
  }

  const driftCount = drifts.length;
  return {
    sourceTotal: source.length,
    propagatedTotal: propagated.length,
    matched,
    driftCount,
    drifts: drifts.slice(0, Math.max(0, maxDriftIds)),
    inSync: driftCount === 0,
  };
}
