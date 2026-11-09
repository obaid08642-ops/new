/**
 * "The doctor did not come": POST /care/appointments/:id/provider-no-show (backend). Allowed 10 minutes after the start and only for a
 * visit that never started (confirmed, checked in, en route); it cancels as a provider no-show and refunds 100% at once. Same terms as
 * the web (patient-web/lib/consult/provider-no-show.ts); the server decides again.
 */
export const NO_SHOW_AFTER_MINUTES = 10;
const NEVER_STARTED = ['confirmed', 'checked_in', 'en_route'];

/** The moment the button appears, or null when it never will (a status that cannot, or no readable start time). */
export function noShowOpensAt(status: string | undefined, slotStart: string | undefined): number | null {
  if (!NEVER_STARTED.includes(String(status ?? '').toLowerCase())) return null;
  const start = slotStart ? Date.parse(slotStart) : Number.NaN;
  return Number.isFinite(start) ? start + NO_SHOW_AFTER_MINUTES * 60_000 : null;
}

export function canReportNoShow(status: string | undefined, slotStart: string | undefined, now: number): boolean {
  const opens = noShowOpensAt(status, slotStart);
  return opens !== null && now >= opens;
}
