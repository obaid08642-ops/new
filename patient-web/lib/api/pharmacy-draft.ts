import { z } from "zod";

const itemSchema = z.object({ name: z.string().trim().min(1).max(240), quantity: z.number().finite().positive().max(100), sku: z.string().trim().min(1).max(120).optional() });
const orderId = z.string().uuid();
export type PatientPharmacyDraftItem = z.infer<typeof itemSchema>;

export function buildPatientPharmacyDraft(items: unknown) {
  const parsed = z.array(itemSchema).min(1).max(100).safeParse(items);
  if (!parsed.success) return null;
  return { items: parsed.data.map((item) => ({ raw_name: item.name, qty: item.quantity, ...(item.sku ? { sku: item.sku } : {}) })) };
}

export function extractPatientPharmacyOrderId(value: unknown): string | null {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const source = root?.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data as Record<string, unknown> : root;
  const parsed = orderId.safeParse(source?.id);
  return parsed.success ? parsed.data : null;
}
