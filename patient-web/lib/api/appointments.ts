import { z } from "zod";

const appointmentIdSchema = z.string().uuid();

export type AppointmentRow = {
  id: string;
  status?: string;
  serviceType?: string;
  slotStart?: string;
  doctorName?: string;
  specialty?: string;
  paymentMethod?: string;
  insuranceRequestId?: string;
  insuranceReviewState?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function rowsFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.appointments)) return root.appointments;
  return [];
}

function firstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function appointmentFrom(value: unknown): AppointmentRow | null {
  const record = asRecord(value);
  const id = appointmentIdSchema.safeParse(record?.id);
  if (!id.success) return null;
  return {
    id: id.data,
    status: firstText(record as Record<string, unknown>, ["status"]),
    serviceType: firstText(record as Record<string, unknown>, ["service_type", "serviceType"]),
    slotStart: firstText(record as Record<string, unknown>, ["slot_start", "slotStart"]),
    doctorName: firstText(record as Record<string, unknown>, ["doctor_name", "doctorName"]),
    specialty: firstText(record as Record<string, unknown>, ["specialty_ar", "specialty"]),
    paymentMethod: firstText(record as Record<string, unknown>, ["payment_method", "paymentMethod"]),
    insuranceRequestId: firstText(record as Record<string, unknown>, ["insurance_request_id", "insuranceRequestId"]),
    insuranceReviewState: firstText(record as Record<string, unknown>, ["insurance_review_state", "insuranceReviewState"]),
  };
}

export function parseAppointmentId(value: string) {
  return appointmentIdSchema.safeParse(value);
}

export function extractAppointmentRows(payload: unknown) {
  return rowsFrom(payload).flatMap((item) => {
    const appointment = appointmentFrom(item);
    return appointment ? [appointment] : [];
  });
}

export function extractAppointmentDetail(payload: unknown) {
  const root = asRecord(payload);
  return appointmentFrom(asRecord(root?.data) ?? root);
}
