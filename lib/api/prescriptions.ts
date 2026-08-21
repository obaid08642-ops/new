import { z } from "zod";

const prescriptionIdSchema = z.string().uuid();

export type PrescriptionItem = { name?: string; dose?: string; frequencyHours?: number; durationDays?: number; instructions?: string };
export type PrescriptionSummary = { id: string; state?: string; itemCount: number; createdAt?: string; doctorName?: string; medicationNames: string[]; items: PrescriptionItem[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.prescriptions]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function itemFrom(value: unknown): PrescriptionItem | null {
  if (typeof value === "string" && value.trim()) return { name: value.trim() };
  const row = asRecord(value);
  if (!row) return null;
  const name = [row.name, row.medicine_name, row.medication_name, row.medicine_name_ar, row.medicine_name_en].find((value) => typeof value === "string" && value.trim());
  return {
    name: typeof name === "string" ? name.trim() : undefined,
    dose: typeof row.dose === "string" && row.dose.trim() ? row.dose : undefined,
    frequencyHours: typeof row.frequency_hours === "number" ? row.frequency_hours : undefined,
    durationDays: typeof row.duration_days === "number" ? row.duration_days : undefined,
    instructions: typeof row.instructions === "string" && row.instructions.trim() ? row.instructions : undefined,
  };
}

function prescriptionFrom(value: unknown): PrescriptionSummary | null {
  const record = asRecord(value);
  const id = prescriptionIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  const state = typeof record.state === "string" && record.state.trim() ? record.state : undefined;
  const createdAt = typeof record.createdAt === "string" && record.createdAt.trim() ? record.createdAt : typeof record.created_at === "string" && record.created_at.trim() ? record.created_at : undefined;
  const doctor = asRecord(record.doctor);
  const doctorName = [record.doctorName, record.doctor_name, doctor?.name].find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const items = (Array.isArray(record.medications) ? record.medications : Array.isArray(record.items) ? record.items : []).flatMap((item) => { const parsed = itemFrom(item); return parsed ? [parsed] : []; });
  const medicationNames = items.flatMap((item) => item.name ? [item.name] : []);
  return { id: id.data, state, itemCount: items.length, createdAt, doctorName, medicationNames, items };
}

export function extractPrescriptionSummaries(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const prescription = prescriptionFrom(item);
    return prescription ? [prescription] : [];
  });
}
