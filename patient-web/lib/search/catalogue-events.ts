/**
 * The ranking signals of the lab, radiology and nursing catalogues (backend CatalogueRankingController, POST /catalogue/ranking/events):
 * a service page viewed (`view`) and a search result opened (`search`). Cart adds and orders are counted by the server and refused there.
 * Fire-and-forget: it never throws and never blocks. A service counts once per signal for as long as the page lives.
 */
export type CatalogueVertical = "lab" | "radiology" | "nursing";
export type CatalogueSignal = "view" | "search";

const SESSION_KEY = "nabd-ranking-session";
const SERVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const sent = new Set<string>();

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

/** The suggestion types that are ranked services (lab packages are not). */
export function verticalOfSuggestionType(type: string): CatalogueVertical | null {
  return type === "lab_test" ? "lab" : type === "radiology" ? "radiology" : type === "nursing" ? "nursing" : null;
}

export function reportCatalogueEvent(vertical: CatalogueVertical, event: CatalogueSignal, serviceId: string): void {
  if (typeof window === "undefined" || !SERVICE_ID.test(serviceId)) return;
  const key = `${vertical}|${event}|${serviceId}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    void fetch("/api/catalogue/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vertical, service_id: serviceId, event, session_id: sessionId() }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* a missed counter costs nothing */
  }
}

/** Test hook: forget what was sent. */
export function resetCatalogueEventsForTests(): void {
  sent.clear();
}
