import { z } from "zod";

const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(1000);
export type PatientPharmacyThread = { id: string; orderId?: string; orderItemId?: string; status?: string; resolution?: string };
export type PatientPharmacyMessage = { id: string; text?: string; senderRole?: string; createdAt?: string; substitute?: { sku?: string; name?: string; price?: number; notes?: string } };

function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function string(recordValue: Record<string, unknown> | null, keys: string[]) { for (const key of keys) if (typeof recordValue?.[key] === "string" && recordValue[key].trim()) return recordValue[key] as string; return undefined; }
function number(recordValue: Record<string, unknown> | null, keys: string[]) { for (const key of keys) if (typeof recordValue?.[key] === "number" && Number.isFinite(recordValue[key])) return recordValue[key] as number; return undefined; }

export function extractPatientPharmacyThreads(value: unknown): PatientPharmacyThread[] {
  const root = record(value); const source = Array.isArray(root?.data) ? root?.data : Array.isArray(value) ? value : [];
  return source.flatMap((candidate) => { const item = record(candidate); const id = uuid.safeParse(string(item, ["id"])); return id.success ? [{ id: id.data, orderId: string(item, ["order_id", "orderId"]), orderItemId: string(item, ["order_item_id", "orderItemId"]), status: string(item, ["status"]), resolution: string(item, ["resolution"])}] : []; });
}

export function extractPatientPharmacyMessages(value: unknown): PatientPharmacyMessage[] {
  const root = record(value); const source = Array.isArray(root?.messages) ? root.messages : Array.isArray(root?.data) ? root.data : [];
  return source.flatMap((candidate) => { const item = record(candidate); const id = uuid.safeParse(string(item, ["id"])); const substitute = record(item?.substitute_offer); return id.success ? [{ id: id.data, text: string(item, ["text"]), senderRole: string(item, ["sender_role", "senderRole"]), createdAt: string(item, ["createdAt", "created_at"]), substitute: substitute ? { sku: string(substitute, ["sku"]), name: string(substitute, ["name"]), price: number(substitute, ["price"]), notes: string(substitute, ["notes"])} : undefined }] : []; });
}

export function buildNegotiationMessage(textValue: unknown) { const parsed = text.safeParse(textValue); return parsed.success ? { text: parsed.data } : null; }
