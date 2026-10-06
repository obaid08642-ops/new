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

export type PrescriptionDetailItem = { name: string; dose?: string; everyHours?: number; timesPerDay?: number; durationDays?: number };
export type PrescriptionDetail = { id: string; state?: string; issuedAt?: string; doctorName?: string; doctorSpecialty?: string; items: PrescriptionDetailItem[] };

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function plainText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * GET /prescriptions/:id answers the patient's own bounded view (backend prescriptions.service.ts toPatientWebDto):
 * `{ id, status, items: [{ name, dose, frequency: { every_hours } | { times_per_day }, duration }], issued_at,
 * doctor: { display_name, specialty } }`. Nothing else is read: the diagnosis, the notes and the photo are not in
 * that view, and a field the API did not send is not drawn.
 */
export function extractPrescriptionDetail(payload: unknown): PrescriptionDetail | null {
  const root = asRecord(payload);
  const record = asRecord(root?.data) ?? root;
  const id = prescriptionIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  const items = (Array.isArray(record.items) ? record.items : []).flatMap((value): PrescriptionDetailItem[] => {
    const item = asRecord(value);
    const name = plainText(item?.name);
    if (!item || !name) return [];
    const frequency = asRecord(item.frequency);
    return [{ name, dose: plainText(item.dose), everyHours: positive(frequency?.every_hours), timesPerDay: positive(frequency?.times_per_day), durationDays: positive(item.duration) }];
  });
  const doctor = asRecord(record.doctor);
  return {
    id: id.data,
    state: plainText(record.status) ?? plainText(record.state),
    issuedAt: plainText(record.issued_at),
    doctorName: plainText(doctor?.display_name),
    doctorSpecialty: plainText(doctor?.specialty),
    items,
  };
}

/** The message key (namespace Prescriptions) of each state the backend has; a raw state enum never reaches the screen. */
const STATE_KEYS: Record<string, string> = {
  CREATED_BY_DOCTOR: "stateCreatedByDoctor",
  UPLOADED_BY_PATIENT: "stateUploadedByPatient",
  SENT_TO_PHARMACY: "stateSentToPharmacy",
  PARTIALLY_EDITED: "statePartiallyEdited",
  VERIFIED_BY_PHARMACIST: "stateVerifiedByPharmacist",
  APPROVED: "stateApproved",
  DISPENSED: "stateDispensed",
  ARCHIVED: "stateArchived",
};

export function prescriptionStateKey(state: string | undefined): string {
  return (state && STATE_KEYS[state]) || "stateUnavailable";
}

/** The states in which a prescription can still be ordered from (backend activeForPatient: not dispensed, not archived). */
export function isOrderablePrescriptionState(state: string | undefined): boolean {
  return state !== "DISPENSED" && state !== "ARCHIVED";
}
