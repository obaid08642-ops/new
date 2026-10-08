/**
 * What the maternity hub reads from GET /maternity/profile (one answer, three tabs). Every field is the server's; nothing is
 * invented. A value of the wrong type is dropped, so a malformed answer shows the empty state instead of a wrong number.
 */
export type KickLog = { id: string; count: number; durationSeconds: number | null; date: string | null };
export type ContractionLog = { id: string; intervalSeconds: number | null; durationSeconds: number | null; date: string | null };
export type GrowthEntry = { id: string; month: number; weightKg: number | null; heightCm: number | null; headCm: number | null; date: string | null };

export type MaternityView = {
  ready: boolean;
  pregnant: boolean;
  week: number | null;
  dueDate: string | null;
  lastPeriod: string | null;
  cycleLength: number | null;
  regular: boolean | null;
  kicks: KickLog[];
  contractions: ContractionLog[];
  growth: GrowthEntry[];
};

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.flatMap((item) => { const r = rec(item); return r ? [r] : []; }) : []);

export function parseMaternity(payload: unknown): MaternityView {
  const root = rec(payload);
  const data = rec(root?.data) ?? root;
  const week = num(data?.current_week);
  return {
    ready: data?.profile_ready === true,
    pregnant: data?.is_pregnant === true,
    week: week !== null && week > 0 ? Math.min(Math.round(week), 42) : null,
    dueDate: str(data?.due_date),
    lastPeriod: str(data?.last_period_date),
    cycleLength: num(data?.cycle_length),
    regular: typeof data?.is_regular === "boolean" ? data.is_regular : null,
    kicks: list(data?.kicks_log)
      .flatMap((r, i) => {
        const count = num(r.count);
        return count === null ? [] : [{ id: str(r.id) ?? `kick-${i}`, count, durationSeconds: num(r.duration_seconds), date: str(r.date) }];
      })
      .reverse()
      .slice(0, 10),
    contractions: list(data?.contractions_log)
      .map((r, i) => ({ id: str(r.id) ?? `contraction-${i}`, intervalSeconds: num(r.interval_seconds), durationSeconds: num(r.duration_seconds), date: str(r.date) }))
      .reverse()
      .slice(0, 10),
    growth: list(data?.infant_growth)
      .flatMap((r, i) => {
        const month = num(r.month);
        return month === null ? [] : [{ id: str(r.id) ?? `growth-${i}`, month, weightKg: num(r.weight_kg), heightCm: num(r.height_cm), headCm: num(r.head_circ_cm), date: str(r.date) }];
      })
      .sort((a, b) => b.month - a.month),
  };
}

export function trimesterOf(week: number): 1 | 2 | 3 {
  return week <= 13 ? 1 : week <= 27 ? 2 : 3;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * The estimate the app shows (patient-app/app/maternity/hub.tsx): ovulation = last period + cycle length - 14 days, the fertile
 * window from 5 days before to 1 day after it, the next period = last period + cycle length. Whole days in UTC, so the date
 * a patient entered is the date shown in every time zone. It is always shown as an estimate.
 */
export function cycleWindow(lastPeriod: string, cycleLength: number): { ovulation: Date; start: Date; end: Date; next: Date } | null {
  const last = new Date(lastPeriod);
  if (Number.isNaN(last.getTime()) || !Number.isFinite(cycleLength) || cycleLength < 15 || cycleLength > 90) return null;
  const at = (days: number) => new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()) + days * DAY);
  const ovulation = at(cycleLength - 14);
  return { ovulation, start: new Date(ovulation.getTime() - 5 * DAY), end: new Date(ovulation.getTime() + DAY), next: at(cycleLength) };
}
