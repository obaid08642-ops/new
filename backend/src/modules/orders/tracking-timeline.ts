/**
 * Q30: the order-tracking timeline, built from the history the order really
 * stores. Governed `pharmacy_orders` keep `timeline: [{ ts, event, by, meta }]`;
 * legacy `orders` keep `state_history: [{ from, to, at, by_user_id, reason }]`.
 * Both become `[{ state, at }]` in time order. Actor ids, reasons and meta are
 * internal (pharmacy account ids, allocation ids) and are not returned.
 */
export interface TrackingTimelineEntry {
  state: string;
  at: string | null;
}

type HistoryRecord = Record<string, unknown>;

function isRecord(value: unknown): value is HistoryRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function buildTrackingTimeline(history: unknown, stateKey: 'event' | 'to', timeKey: 'ts' | 'at'): TrackingTimelineEntry[] {
  if (!Array.isArray(history)) return [];
  const entries: TrackingTimelineEntry[] = [];
  for (const raw of history) {
    if (!isRecord(raw)) continue;
    const state = raw[stateKey];
    if (typeof state !== 'string' || !state.trim()) continue;
    entries.push({ state, at: toIso(raw[timeKey]) });
  }
  // Stable sort by time; entries without a time keep their stored order at the end.
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.at && b.entry.at) return a.entry.at.localeCompare(b.entry.at) || a.index - b.index;
      if (a.entry.at) return -1;
      if (b.entry.at) return 1;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}
