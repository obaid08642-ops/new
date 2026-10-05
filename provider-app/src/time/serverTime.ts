/**
 * P15.9 — server-anchored "now" for provider-app.
 *
 * Same approach as `patient-web/lib/api/net/server-time.ts` (sibling `web`
 * worktree, read as reference): a wrong device clock must change nothing
 * server-derived. Every HTTP response carries a `Date` header stamped by
 * infrastructure the backend team owns, so the client records
 * `offset = serverMs - deviceMs` and derives "now" from it: when the device
 * clock is off by ±1 day, both sides of the subtraction move together and the
 * error cancels out.
 *
 * `src/api/client.ts` feeds every response `Date` header into `noteServerDate`
 * (success and error responses alike — any HTTP response proves the server was
 * reachable), so the anchor is refreshed by ordinary traffic with no extra
 * request. `serverNowMs()` drives OTP-expiry, slot and reminder comparisons
 * via `isPastSlot` in `./providerZone`.
 *
 * Until the first response arrives there is nothing to anchor to, and
 * `serverNowMs()` falls back to the device clock — documented here so no
 * caller mistakes it for server truth before anchoring.
 */

let offsetMs = 0;
let anchored = false;

export function isServerTimeAnchored(): boolean {
  return anchored;
}

/** The last measured device-to-server skew; null before the first response. */
export function getServerTimeOffsetMs(): number | null {
  return anchored ? offsetMs : null;
}

/**
 * Records the skew from one response `Date` header. Returns false (and keeps
 * the previous offset) when the header is missing or unparseable — a broken
 * clock header must never poison the anchor.
 */
export function noteServerDate(dateHeader: string | null | undefined, nowMs: number = Date.now()): boolean {
  if (!dateHeader) return false;
  const serverMs = Date.parse(dateHeader);
  if (!Number.isFinite(serverMs)) return false;
  offsetMs = serverMs - nowMs;
  anchored = true;
  return true;
}

/** "Now" with the device-clock error cancelled out. */
export function serverNowMs(nowMs: number = Date.now()): number {
  return anchored ? nowMs + offsetMs : nowMs;
}

/** Test-only: forgets the anchor so suites start unanchored. */
export function resetServerTimeForTests(): void {
  offsetMs = 0;
  anchored = false;
}
