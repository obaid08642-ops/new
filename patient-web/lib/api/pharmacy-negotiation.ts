// No validation library: the reply form (a client component) imports buildNegotiationMessage from here, and a schema
// library would put its whole runtime into the browser bundle (QUALITY_STANDARDS §2, JS budget).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | undefined => (typeof value === "string" && UUID.test(value) ? value : undefined);
/** #525: the pharmacy's public name (per language) and a preview of the newest message come with each thread. */
export type PatientPharmacyThread = { id: string; orderId?: string; orderItemId?: string; status?: string; resolution?: string; pharmacyNameAr?: string; pharmacyNameEn?: string; lastText?: string; lastFrom?: string };
export type PatientPharmacyMessage = { id: string; text?: string; senderRole?: string; systemCode?: string; createdAt?: string; substitute?: { sku?: string; name?: string; price?: number; notes?: string } };

function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function string(recordValue: Record<string, unknown> | null, keys: string[]) { for (const key of keys) if (typeof recordValue?.[key] === "string" && recordValue[key].trim()) return recordValue[key] as string; return undefined; }
function number(recordValue: Record<string, unknown> | null, keys: string[]) { for (const key of keys) if (typeof recordValue?.[key] === "number" && Number.isFinite(recordValue[key])) return recordValue[key] as number; return undefined; }

export function extractPatientPharmacyThreads(value: unknown): PatientPharmacyThread[] {
  const root = record(value); const source = Array.isArray(root?.data) ? root?.data : Array.isArray(value) ? value : [];
  return source.flatMap((candidate) => { const item = record(candidate); const id = uuid(string(item, ["id"])); const last = record(item?.last_message); return id ? [{ id, orderId: string(item, ["order_id", "orderId"]), orderItemId: string(item, ["order_item_id", "orderItemId"]), status: string(item, ["status"]), resolution: string(item, ["resolution"]), pharmacyNameAr: string(item, ["pharmacy_name_ar"]), pharmacyNameEn: string(item, ["pharmacy_name_en"]), lastText: string(last, ["text"])?.slice(0, 120), lastFrom: string(last, ["from"]) }] : []; });
}

export function extractPatientPharmacyMessages(value: unknown): PatientPharmacyMessage[] {
  const root = record(value); const source = Array.isArray(root?.messages) ? root.messages : Array.isArray(root?.data) ? root.data : [];
  return source.flatMap((candidate) => { const item = record(candidate); const id = uuid(string(item, ["id"])); const substitute = record(item?.substitute_offer); return id ? [{ id, text: string(item, ["text"]), senderRole: string(item, ["sender_role", "senderRole"]), systemCode: string(item, ["system_code"]), createdAt: string(item, ["createdAt", "created_at"]), substitute: substitute ? { sku: string(substitute, ["sku"]), name: string(substitute, ["name"]), price: number(substitute, ["price"]), notes: string(substitute, ["notes"])} : undefined }] : []; });
}

/**
 * One conversation as `GET /pharmacy/chat/threads/:id/messages` sends it: `{ thread, messages }`. The thread's own
 * status is what says whether the conversation is still open: the screen must not offer a decision on a closed one.
 */
export function extractPatientPharmacyThreadDetail(value: unknown): { thread: PatientPharmacyThread | null; messages: PatientPharmacyMessage[] } {
  const root = record(value);
  const raw = record(root?.thread);
  const id = uuid(string(raw, ["id"]));
  const thread = id ? { id, orderId: string(raw, ["order_id", "orderId"]), orderItemId: string(raw, ["order_item_id", "orderItemId"]), status: string(raw, ["status"]), resolution: string(raw, ["resolution"]) } : null;
  return { thread, messages: extractPatientPharmacyMessages(value) };
}

export function buildNegotiationMessage(textValue: unknown) { const trimmed = typeof textValue === "string" ? textValue.trim() : ""; return trimmed.length >= 1 && trimmed.length <= 1000 ? { text: trimmed } : null; }
