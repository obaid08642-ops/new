/**
 * PT-54: the patient hides a finished visit from their own history, and shows it again (backend, lane V):
 *   POST /unified-bookings/:kind/:id/hide and /unhide   (kind: pharmacy | lab | radiology | nursing | consultation)
 *   GET  /unified-bookings/mine?kind=...&include_hidden=1   every visit of the kind, each with `hidden: boolean`
 * The list screens read their rows from their own endpoints (not filtered by the server), so they ask the timeline which visits are
 * hidden and filter themselves. Only a COMPLETED or CANCELLED visit can be hidden (the server answers 400 `visit_not_finished`).
 */
export type VisitKind = "pharmacy" | "lab" | "radiology" | "nursing" | "consultation";

/** `kind:id` of a visit. */
export const visitKey = (kind: VisitKind, id: string): string => `${kind}:${id}`;

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);

/** The visits of the timeline answer that the patient hid, as a set of `kind:id`. The answer is a list or `{ data: [...] }`; rows without a kind and an id are skipped. */
export function readHiddenVisits(payload: unknown): Set<string> {
  const root = row(payload);
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? (root?.data as unknown[]) : Array.isArray(root?.items) ? (root?.items as unknown[]) : [];
  const hidden = new Set<string>();
  for (const entry of list) {
    const r = row(entry);
    const kind = typeof r?.kind === "string" ? r.kind : "";
    const id = typeof r?.id === "string" ? r.id : "";
    if (r?.hidden === true && kind && id) hidden.add(`${kind}:${id}`);
  }
  return hidden;
}

/** A finished visit (the only kind that can be hidden): completed or cancelled. */
export const canHideStatus = (status: string | undefined): boolean => ["completed", "cancelled"].includes((status ?? "").toLowerCase());

export type VisitState = { hidden: boolean; status: string };

/** Every visit of the timeline answer (called with `include_hidden=1`) by `kind:id` with whether it is hidden and its status, so a list can tell which of its rows can be hidden. */
export function readVisitStates(payload: unknown): Map<string, VisitState> {
  const root = row(payload);
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? (root?.data as unknown[]) : Array.isArray(root?.items) ? (root?.items as unknown[]) : [];
  const states = new Map<string, VisitState>();
  for (const entry of list) {
    const r = row(entry);
    const kind = typeof r?.kind === "string" ? r.kind : "";
    const id = typeof r?.id === "string" ? r.id : "";
    if (kind && id) states.set(`${kind}:${id}`, { hidden: r?.hidden === true, status: typeof r?.status === "string" ? r.status : "" });
  }
  return states;
}
