// GET /admin/medical-reports/without-seha-number: sick-leave reports issued but still without a Seha number after N days.

export interface SehaMissingRow {
  id: string; serial: string | null; doctor_id: string; doctor_name: string | null; doctor_license_no: string | null;
  issued_at: string; days: number | null; age_hours: number;
}
export interface SehaMissingResult { days: number; count: number; items: SehaMissingRow[] }

export const SEHA_WINDOWS = [3, 7, 14, 30] as const;

/** Defensive read of the answer: a wrong shape is an empty list, never a crash. */
export function readSehaMissing(raw: unknown): SehaMissingResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SehaMissingResult>;
  const items = Array.isArray(r.items) ? r.items.filter((x): x is SehaMissingRow => !!x && typeof x.id === 'string') : [];
  return { days: typeof r.days === 'number' ? r.days : 3, count: items.length, items };
}

/** How long the report has waited, in whole days (never below 0). */
export function waitingDays(row: Pick<SehaMissingRow, 'age_hours'>): number {
  return Math.max(0, Math.floor((Number(row.age_hours) || 0) / 24));
}
