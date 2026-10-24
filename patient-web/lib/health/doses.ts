import type { MedicationDoseSummary, MedicationReminderSummary } from "@/lib/api/reminders";
import { CORAL } from "@/lib/health/view";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";

export type DoseRow = { reminder: MedicationReminderSummary; timeKey: string; status: MedicationDoseSummary["status"] };

/**
 * Today's doses: what the server says about today for each reminder, or, for a reminder it sent no dose list for, its
 * times as still to take (the rule the reminders page already used). Sorted by time of day.
 */
export function todayDoses(reminders: MedicationReminderSummary[]): DoseRow[] {
  return reminders
    .flatMap((reminder) =>
      (reminder.todayDoses.length ? reminder.todayDoses : reminder.times.map((timeKey) => ({ timeKey, status: "pending" as const }))).map((dose) => ({ reminder, ...dose })),
    )
    .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}

/** The chip tone of a dose, from the service tones of the handoff: done is mint, still to take is blue, the rest amber and coral. */
export function doseTone(status: MedicationDoseSummary["status"]): ServiceTone {
  switch (status) {
    case "taken":
      return "mint";
    case "skipped":
      return "amber";
    case "missed":
      return CORAL;
    default:
      return "blue";
  }
}

/** "08:00" as the reader's clock shows it (12 or 24 hour, native digits); the raw key if it is not HH:mm. */
export function formatTimeKey(locale: string, timeKey: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeKey);
  if (!match) return timeKey;
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, Number(match[1]), Number(match[2]))));
}

/** The share of today's doses that are taken, as a whole percent (0 when there are none). */
export function takenPercent(doses: DoseRow[]): number {
  return doses.length ? Math.round((doses.filter((dose) => dose.status === "taken").length / doses.length) * 100) : 0;
}
