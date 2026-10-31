type Api = (endpoint: string, options?: { method?: 'POST'; body?: string }) => Promise<unknown>;

/**
 * Delivered and seen receipts of a doctor thread (POST /chat/threads/:id/delivered, /read with `up_to_message_id`). Best effort:
 * a failure never blocks the thread; the next open or the next incoming message sends them again. True when both were accepted.
 */
export async function sendThreadReceipts(api: Api, threadId: string, upToMessageId?: string | null): Promise<boolean> {
  const base = `/chat/threads/${encodeURIComponent(threadId)}`;
  try {
    await api(`${base}/delivered`, { method: 'POST', body: '{}' });
    if (upToMessageId) await api(`${base}/read`, { method: 'POST', body: JSON.stringify({ up_to_message_id: upToMessageId }) });
    return true;
  } catch {
    return false;
  }
}

/** The newest message from the other party in a chronological list (null when they sent none). */
export function newestFromOther(messages: Array<{ id: string; sender: string }>): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].sender !== 'me') return messages[i].id;
  return null;
}
