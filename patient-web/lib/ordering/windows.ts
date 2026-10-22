/** GET /ordering/windows (backend ordering.service.ts `windows`): home = ASAP + 2-hour windows; facility = walk-in or slots. */
export type WindowsAnswer =
  | { kind: "home"; asap: boolean; windows: Array<{ start: string; end: string }> }
  | { kind: "walk_in" }
  | { kind: "slots"; date: string | null; slots: Array<{ id: string; start: string; end: string }> };

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const text = (v: unknown) => (typeof v === "string" && v ? v : null);

export function parseWindows(payload: unknown): WindowsAnswer | null {
  const r = obj(payload);
  if (!r) return null;
  if (r.walk_in === true) return { kind: "walk_in" };
  if (Array.isArray(r.windows)) {
    const rows = r.windows.map(obj).filter((w): w is Raw => !!w);
    const windows = rows.flatMap((w) => { const start = text(w.start); const end = text(w.end); return start && end ? [{ start, end }] : []; });
    return { kind: "home", asap: rows.some((w) => w.asap === true), windows };
  }
  if (Array.isArray(r.slots)) {
    const slots = r.slots.map(obj).flatMap((s) => { const id = s && text(s.id); const start = s && text(s.start); const end = s && text(s.end); return s && id && start && end ? [{ id, start, end }] : []; });
    return { kind: "slots", date: text(r.date), slots };
  }
  return null;
}
