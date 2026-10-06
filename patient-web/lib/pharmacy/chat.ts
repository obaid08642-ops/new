/**
 * The pharmacist negotiation (backend pharmacy-chat.service.ts). A thread belongs to one item of one order and one pharmacy;
 * its messages are `{ sender_role: patient | pharmacy | system, text, substitute_offer, createdAt }`. A thread is `open` until
 * the patient accepts or rejects a substitute, or removes the item (then `resolution` says which). Only what the screen draws
 * is read: the pharmacy's account id and the order item id are not.
 */
export type ChatThread = { id: string; open: boolean; resolution?: "accepted" | "rejected" | "removed" | "other" };
export type ChatOffer = { name?: string; sku?: string; price?: number };
export type ChatMessage = { id: string; from: "patient" | "pharmacy"; text?: string; createdAt?: string; offer?: ChatOffer };

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

function threadFrom(value: unknown): ChatThread | null {
  const thread = row(value);
  const id = text(thread?.id);
  if (!thread || !id) return null;
  const resolution = text(thread.resolution);
  return {
    id,
    open: thread.status === "open",
    resolution: resolution === "accepted" || resolution === "rejected" || resolution === "removed" ? resolution : resolution ? "other" : undefined,
  };
}

/** GET /pharmacy/chat/threads?order_id= answers a bare list of threads. */
export function parseThreads(payload: unknown): ChatThread[] {
  const root = row(payload);
  const list = Array.isArray(payload) ? payload : [root?.data, root?.threads].find(Array.isArray);
  return (Array.isArray(list) ? list : []).flatMap((entry) => {
    const thread = threadFrom(entry);
    return thread ? [thread] : [];
  });
}

/** GET /pharmacy/chat/threads/:id/messages answers `{ thread, messages }`. System lines are not drawn: the backend writes them in Arabic only, and the thread's resolution says the same. */
export function parseThreadMessages(payload: unknown): { thread: ChatThread | null; messages: ChatMessage[] } {
  const root = row(payload);
  const list = Array.isArray(root?.messages) ? root.messages : Array.isArray(payload) ? payload : [];
  const messages = list.flatMap((entry): ChatMessage[] => {
    const message = row(entry);
    const id = text(message?.id);
    const from = message?.sender_role === "patient" || message?.sender_role === "pharmacy" ? message.sender_role : null;
    if (!message || !id || !from) return [];
    const offer = row(message.substitute_offer);
    const price = typeof offer?.price === "number" && Number.isFinite(offer.price) && offer.price > 0 ? offer.price : undefined;
    return [{
      id,
      from,
      text: text(message.text),
      createdAt: text(message.createdAt),
      offer: offer ? { name: text(offer.name), sku: text(offer.sku), price } : undefined,
    }];
  });
  return { thread: threadFrom(root?.thread), messages };
}

/** The backend refuses a message with content it screens out (400 `{ code: "content_blocked" }`). */
export function isBlockedMessage(body: unknown): boolean {
  const root = row(body);
  const inner = row(root?.message);
  return root?.code === "content_blocked" || inner?.code === "content_blocked";
}
