const THREAD_ID = /^[0-9a-f-]{36}$/i;

/** The newest message the other party sent (by time): "seen" goes up to it. Null when they sent none. */
export function newestIncomingId(messages: Array<{ id: string; senderRole: string; createdAt?: string }>): string | null {
  let best: { id: string; at: number } | null = null;
  for (const m of messages) {
    if (m.senderRole === "patient") continue;
    const at = m.createdAt ? Date.parse(m.createdAt) : 0;
    if (!best || at >= best.at) best = { id: m.id, at: Number.isFinite(at) ? at : 0 };
  }
  return best?.id ?? null;
}

/**
 * Tells the backend this device received the thread (delivered) and has it open (read up to `upToMessageId`). The two receipts are
 * best effort: a failure never blocks the thread and the next open tries again. Returns whether both were accepted.
 */
export async function sendThreadReceipts(threadId: string, upToMessageId: string | null, send: typeof fetch = fetch): Promise<boolean> {
  if (!THREAD_ID.test(threadId)) return false;
  const base = `/api/patient/chat/threads/${encodeURIComponent(threadId)}`;
  const post = (path: string, body?: unknown) => send(`${base}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "same-origin",
  });
  try {
    const delivered = await post("delivered");
    if (!upToMessageId) return delivered.ok;
    const read = await post("read", { up_to_message_id: upToMessageId });
    return delivered.ok && read.ok;
  } catch {
    return false;
  }
}
