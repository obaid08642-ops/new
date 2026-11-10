/**
 * PT-54: the patient hides a finished visit from their own history and shows it again (backend, lane V):
 *   POST /unified-bookings/:kind/:id/hide and /unhide   (kind: pharmacy | lab | radiology | nursing | consultation)
 *   GET  /unified-bookings/mine?kind=...&include_hidden=1   every visit of the kind, each with `hidden: boolean`
 * The list screens read their rows from their own endpoints (not filtered by the server), so they ask the timeline which visits are
 * hidden and filter themselves. Only a COMPLETED or CANCELLED visit can be hidden. Same readers as the web (patient-web/lib/history).
 */
export type VisitKind = 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null);

/** The ids of the visits of `kind` that the patient hid, from the timeline answer (a list or `{ data: [...] }`). */
export function readHiddenIds(payload: unknown, kind: VisitKind): Set<string> {
  const root = row(payload);
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? (root?.data as unknown[]) : Array.isArray(root?.items) ? (root?.items as unknown[]) : [];
  const ids = new Set<string>();
  for (const entry of list) {
    const r = row(entry);
    if (r?.hidden === true && r.kind === kind && typeof r.id === 'string' && r.id) ids.add(r.id);
  }
  return ids;
}

/** A finished visit (the only kind that can be hidden): completed or cancelled. */
export const canHideStatus = (status: unknown): boolean => ['completed', 'cancelled'].includes(String(status ?? '').toLowerCase());

export const hideVisitPath = (kind: VisitKind, id: string, hide: boolean): string => `/unified-bookings/${kind}/${encodeURIComponent(id)}/${hide ? 'hide' : 'unhide'}`;
