import { z } from "zod";

const prescriptionIdSchema = z.string().uuid();

export type PrescriptionSummary = { id: string; state?: string; itemCount: number; createdAt?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.prescriptions]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function prescriptionFrom(value: unknown): PrescriptionSummary | null {
  const record = asRecord(value);
  const id = prescriptionIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  const state = typeof record.state === "string" && record.state.trim() ? record.state : undefined;
  const createdAt = typeof record.createdAt === "string" && record.createdAt.trim() ? record.createdAt : typeof record.created_at === "string" && record.created_at.trim() ? record.created_at : undefined;
  return { id: id.data, state, itemCount: Array.isArray(record.items) ? record.items.length : 0, createdAt };
}

export function extractPrescriptionSummaries(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const prescription = prescriptionFrom(item);
    return prescription ? [prescription] : [];
  });
}
