/** Whether a YYYY-MM-DD day (the value of a date input) is later than today, by the local calendar day of `now`. */
export function isAfterToday(isoDay: string, now: Date = new Date()): boolean {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return isoDay.trim() > today;
}
