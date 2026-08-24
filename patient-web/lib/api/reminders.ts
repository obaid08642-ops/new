import { z } from "zod";

const reminderIdSchema = z.string().uuid();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export type MedicationDoseSummary = { timeKey: string; status: "pending" | "taken" | "skipped" | "missed" };
export type MedicationReminderSummary = { id: string; medicineName?: string; dose?: string; times: string[]; frequency?: string; todayDoses: MedicationDoseSummary[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.reminders]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function reminderFrom(value: unknown): MedicationReminderSummary | null {
  const record = asRecord(value);
  const id = reminderIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  const medicineName = typeof record.medicine_name_ar === "string" && record.medicine_name_ar.trim() ? record.medicine_name_ar : typeof record.medicine_name_en === "string" && record.medicine_name_en.trim() ? record.medicine_name_en : undefined;
  const dose = typeof record.dose === "string" && record.dose.trim() ? record.dose : undefined;
  const times = Array.isArray(record.times) ? record.times.flatMap((item) => timeSchema.safeParse(item).success ? [item] : []) : [];
  const frequency = typeof record.frequency === "string" && record.frequency.trim() ? record.frequency : undefined;
  const todayDoses = Array.isArray(record.today_doses) ? record.today_doses.flatMap((item) => {
    const dose = asRecord(item);
    const timeKey = timeSchema.safeParse(dose?.time_key).success ? dose?.time_key as string : null;
    const status = ["pending", "taken", "skipped", "missed"].includes(String(dose?.status)) ? dose?.status as MedicationDoseSummary["status"] : null;
    return timeKey && status ? [{ timeKey, status }] : [];
  }) : [];
  return { id: id.data, medicineName, dose, times, frequency, todayDoses };
}

export function extractMedicationReminderSummaries(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const reminder = reminderFrom(item);
    return reminder ? [reminder] : [];
  });
}
