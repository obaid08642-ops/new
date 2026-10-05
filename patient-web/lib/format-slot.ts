const TIME_ZONE = "Asia/Riyadh";

function dayNumber(date: Date): number {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/**
 * "Tomorrow 7:30 PM" for the doctor card's next free time (`next_available_at`, an ISO instant): the day word, the date and the
 * time all come from the locale's own formatters, in the service's time zone. null when the value is not a time.
 */
export function formatNextSlot(iso: string | null | undefined, locale: string, now: Date = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const time = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, timeStyle: "short" }).format(at);
  const diff = dayNumber(at) - dayNumber(now);
  if (diff < 0) return null;
  const day = diff <= 1
    ? new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(diff, "day")
    : new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" }).format(at);
  return `${day} ${time}`;
}
