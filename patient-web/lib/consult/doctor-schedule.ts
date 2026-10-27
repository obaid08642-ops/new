import { dayStrip } from "./day-strip";

/** One day of the profile's strip: the date the patient sees, and its weekday, number and month in the active locale. */
export type ScheduleDay = { iso: string; weekday: string; dayNumber: string; month: string; relative?: "today" | "tomorrow" };

/** The next `count` days from `from`, formatted with Intl for `locale` (never a hand-written weekday list). */
export function buildScheduleDays(count: number, locale: string, from: Date = new Date()): ScheduleDay[] {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const month = new Intl.DateTimeFormat(locale, { month: "short" });
  const number = new Intl.NumberFormat(locale, { useGrouping: false });
  return dayStrip(count, from).map((day, i) => ({
    iso: day.iso,
    weekday: weekday.format(day.date),
    dayNumber: number.format(day.date.getDate()),
    month: month.format(day.date),
    ...(i === 0 ? { relative: "today" as const } : i === 1 ? { relative: "tomorrow" as const } : {}),
  }));
}

/** The calendar date of an instant in the patient's own time zone, as `YYYY-MM-DD`. */
export function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Slots grouped by the patient's local calendar day, in time order inside each day; a start that cannot be read is dropped. */
export function groupSlotsByDay<T extends { start: string }>(slots: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const readable = slots.map((slot) => ({ slot, time: Date.parse(slot.start) })).filter((x) => !Number.isNaN(x.time)).sort((a, b) => a.time - b.time);
  for (const { slot, time } of readable) {
    const key = localIsoDate(new Date(time));
    const list = groups.get(key);
    if (list) list.push(slot);
    else groups.set(key, [slot]);
  }
  return groups;
}

/** The time on a chip, in the active locale. */
export function slotTimeLabel(locale: string, start: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(start));
}
