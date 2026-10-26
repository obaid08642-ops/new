const SESSION_KEY = "nabd-ranking-session";

/** One random id per browser tab session, so the backend counts one visitor's repeat views once (it keeps no personal data). */
function sessionId(): string {
  try {
    const kept = window.sessionStorage.getItem(SESSION_KEY);
    if (kept) return kept;
    const made = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, made);
    return made;
  } catch {
    return crypto.randomUUID();
  }
}

/** Tells the ranking that a medicine was viewed (`product_viewed`) or opened from a search (`product_searched`). Never throws, never blocks. */
export function reportRankingEvent(eventType: "product_viewed" | "product_searched", drugId: string): void {
  if (typeof window === "undefined" || !drugId) return;
  void fetch("/api/pharmacy/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event_type: eventType, drug_id: drugId, session_id: sessionId() }),
    keepalive: true,
  }).catch(() => undefined);
}
