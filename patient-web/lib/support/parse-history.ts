export type ChatMsg = { id: string; from: "user" | "agent"; text: string; time: string };

/** HH:MM in the reader's time zone, like the stamp of a message sent in this session; an unreadable value gives "". */
function clock(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * The thread from GET /api/patient/support/chat: a top-level array `[{id, from, text, time, isBot}]` (backend
 * support-chat.controller.ts bareList), or the same list under `data`, `messages` or `history`. `from` is "user" or
 * "agent"; the bot's own lines (`isBot`) sit on the agent side. Order is the server's.
 */
export function parseHistory(payload: unknown): ChatMsg[] {
  const keyed = payload && typeof payload === "object" && !Array.isArray(payload)
    ? [(payload as Record<string, unknown>).data, (payload as Record<string, unknown>).messages, (payload as Record<string, unknown>).history].find(Array.isArray)
    : undefined;
  const list = Array.isArray(payload) ? payload : keyed;
  if (!Array.isArray(list)) return [];
  return list.flatMap((m, i) => {
    if (!m || typeof m !== "object") return [];
    const o = m as Record<string, unknown>;
    if (typeof o.text !== "string" || !o.text) return [];
    const from = o.isBot === true || o.from === "agent" || o.role === "agent" ? "agent" : "user";
    return [{ id: String(o.id ?? `h-${i}`), from, text: o.text, time: clock(o.time ?? o.created_at) }];
  });
}
