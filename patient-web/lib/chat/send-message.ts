/**
 * Sending one text message in the doctor's thread (issue 806): POST /chat/threads/:id/messages through the patient proxy
 * (/api/patient, narrow allowlist entry). No validation library: the composer is a client component.
 *
 * - The body is the trimmed text, 1 to MAX_MESSAGE_LENGTH characters. Nothing else is sent: no attachment, no voice (those
 *   are other items), no type (the server's default for a body-only message is `text`).
 * - The message is shown only after the server answers 2xx (no optimistic bubble).
 * - A retry of the SAME text after an unknown outcome (the network dropped, a 5xx) reuses the same idempotency key and the
 *   same `client_message_id`, so the server cannot store it twice; the key is renewed once the server answered for good.
 */
export const MAX_MESSAGE_LENGTH = 2000;

export type ChatSendError = "invalid" | "signedOut" | "forbidden" | "network" | "generic";
export type ChatSendResult = { ok: true } | { ok: false; kind: ChatSendError };

const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The request body for a typed text, or null when it is empty or too long. */
export function buildChatMessage(text: unknown, clientMessageId?: string): { body: string; client_message_id?: string } | null {
  const body = typeof text === "string" ? text.trim() : "";
  if (body.length < 1 || body.length > MAX_MESSAGE_LENGTH) return null;
  return clientMessageId ? { body, client_message_id: clientMessageId } : { body };
}

/** What the screen says for an HTTP outcome. A 403 is the server closing the thread or the window: the page re-reads the rules. */
export function classifySendFailure(status: number): ChatSendError {
  if (status === 401) return "signedOut";
  if (status === 403) return "forbidden";
  if (status === 400 || status === 413 || status === 422) return "invalid";
  if (status === 0 || status === 502 || status === 503 || status === 504) return "network";
  return "generic";
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createChatSender(send: typeof fetch = globalThis.fetch.bind(globalThis), makeKey: () => string = newKey) {
  const keys = new Map<string, string>();
  let busy = false;
  return {
    get busy() { return busy; },
    /** `null` when a message is already in flight (nothing was sent). */
    async send(threadId: string, text: string): Promise<ChatSendResult | null> {
      if (busy) return null;
      if (!THREAD_ID.test(threadId)) return { ok: false, kind: "invalid" };
      const trimmed = text.trim();
      const key = keys.get(trimmed) ?? makeKey();
      const body = buildChatMessage(trimmed, key);
      if (!body) return { ok: false, kind: "invalid" };
      keys.set(trimmed, key);
      busy = true;
      try {
        const response = await send(`/api/patient/chat/threads/${encodeURIComponent(threadId)}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json", "idempotency-key": key },
          body: JSON.stringify(body),
          credentials: "same-origin",
        });
        if (response.ok) {
          keys.delete(trimmed);
          return { ok: true };
        }
        // a 5xx may or may not have been applied: keep the key so the retry is the same request
        if (response.status < 500) keys.delete(trimmed);
        return { ok: false, kind: classifySendFailure(response.status) };
      } catch {
        return { ok: false, kind: "network" };
      } finally {
        busy = false;
      }
    },
  };
}
