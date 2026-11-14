/**
 * issue 1819: the bell's unread count (GET /notifications/unread-count through the patient proxy: `{ unread: n }`).
 * `null` when the answer is missing or malformed, so the page draws no dot rather than a made-up number.
 */
export function parseUnreadCount(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const n = (body as { unread?: unknown }).unread;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch("/api/patient/notifications/unread-count", { credentials: "same-origin", headers: { "cache-control": "no-cache" }, signal });
    if (!res.ok) return null;
    return parseUnreadCount(await res.json());
  } catch {
    return null;
  }
}
