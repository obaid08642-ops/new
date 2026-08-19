import { z } from "zod";

const reminderIdSchema = z.string().uuid();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export type MedicationReminderSummary = { id: string; medicineName?: string; dose?: string; times: string[]; frequency?: string };

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
  return { id: id.data, medicineName, dose, times, frequency };
}

export function extractMedicationReminderSummaries(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const reminder = reminderFrom(item);
    return reminder ? [reminder] : [];
  });
}
