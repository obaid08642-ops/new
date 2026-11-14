/** One day of the strip: the calendar date the patient sees as `YYYY-MM-DD`, in the patient's own time zone (not the UTC date of local midnight). */
export type StripDay = { iso: string; date: Date };

export function dayStrip(count: number, from: Date = new Date()): StripDay[] {
  const days: StripDay[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({ iso, date });
  }
  return days;
}
