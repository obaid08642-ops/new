import { z } from "zod";

const orderIdSchema = z.string().uuid();

export type PatientOrderSummary = { id: string; status?: string; reference?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) if (typeof record[field] === "string" && record[field].trim()) return record[field] as string;
  return undefined;
}

export function parseOrderId(value: string) { return orderIdSchema.safeParse(value); }

export function extractOrderRows(payload: unknown): PatientOrderSummary[] {
  const root = asRecord(payload);
  const candidate = Array.isArray(payload) ? payload : [root?.data, root?.orders, root?.items].find(Array.isArray);
  if (!Array.isArray(candidate)) return [];
  return candidate.flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const id = stringField(record, ["id", "orderId", "uuid"]);
    if (!id) return [];
    return [{ id, status: stringField(record, ["status", "state"]), reference: stringField(record, ["orderNumber", "reference", "code"]) }];
  });
}

export function extractOrderDetail(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  return asRecord(root?.data) ?? root;
}
