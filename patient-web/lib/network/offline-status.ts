/**
 * P15.4 / journeys throttled-network: what the offline banner needs, kept free of React so it can be tested directly.
 *
 * Online or not is the browser's own answer (`navigator.onLine` and its `online` / `offline` events). Before the browser
 * is known (the server render and the first client render) the answer is "online", so the HTML is the same for everyone
 * and hydration never differs.
 *
 * "Last updated" is the time the server made the page now on screen: the locale layout passes its own render time, which
 * for a static/ISR page is the time of the cached copy (owner decision 2026-10-06: during an outage a public page keeps
 * serving its last good copy, so this can be much older than the visit) and for a per-request page is the request.
 * A client navigation does not move it forward: the time shown is never fresher than the oldest data that may be on screen.
 */

export function subscribeOnline(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function getOnlineSnapshot(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return true;
  return navigator.onLine;
}

/** The server and the first client render: online (no banner), so the HTML does not depend on the visitor. */
export function getServerOnlineSnapshot(): boolean {
  return true;
}

/** A usable render time (a finite epoch in ms, not in the future by more than a clock skew), or null. */
export function validRenderedAt(renderedAt: unknown, now: number, skewMs = 5 * 60 * 1000): number | null {
  if (typeof renderedAt !== "number" || !Number.isFinite(renderedAt) || renderedAt <= 0) return null;
  return renderedAt > now + skewMs ? null : renderedAt;
}

/**
 * The time for the label, in the visitor's language and time zone: only the time when it is today, the date and the time
 * otherwise (a copy kept through an outage can be days old).
 */
export function formatLastUpdated(locale: string, at: number, now: number, timeZone?: string): string {
  const options = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat("en-CA", { ...options, year: "numeric", month: "2-digit", day: "2-digit" });
  const sameDay = day.format(at) === day.format(now);
  const format = sameDay
    ? new Intl.DateTimeFormat(locale, { ...options, timeStyle: "short" })
    : new Intl.DateTimeFormat(locale, { ...options, dateStyle: "medium", timeStyle: "short" });
  return format.format(at);
}
