/**
 * The dates of the maternity setup are typed as text. The server accepts anything JavaScript can parse ("1", "Sept 20"), so the screen checks
 * the form first: year-month-day, a day that exists on the calendar (2026-02-30 is not one).
 */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day as YYYY-MM-DD when the text is one real calendar day, else null. */
export function parseIsoDay(value: string): string | null {
  const text = value.trim();
  const match = ISO_DAY.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? text : null;
}

/** Whether a YYYY-MM-DD day is later than today (local calendar day of `now`). */
export function isAfterToday(isoDay: string, now: Date = new Date()): boolean {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return isoDay > today;
}

export type MaternityDateProblem = 'invalid' | 'lmpFuture' | null;

/** The first problem of the typed dates: a date that is not a real day, or a last period in the future. The due date is optional and may be in the future. */
export function maternityDateProblem(lmp: string, dueDate: string, now: Date = new Date()): MaternityDateProblem {
  const last = parseIsoDay(lmp);
  if (last === null) return 'invalid';
  if (isAfterToday(last, now)) return 'lmpFuture';
  if (dueDate.trim() && parseIsoDay(dueDate) === null) return 'invalid';
  return null;
}
