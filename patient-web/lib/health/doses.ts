import type { MedicationDoseSummary, MedicationReminderSummary } from "@/lib/api/reminders";
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
      return "coral";
    default:
      return "blue";
  }
}
