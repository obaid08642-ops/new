/**
 * "The doctor did not come": POST /care/appointments/:id/provider-no-show (backend, lane Z). The server allows it for the patient or
 * the person who booked, 10 minutes after the start, and only for a visit that never started (confirmed, checked in, en route); it
 * cancels the visit as a provider no-show and refunds 100% at once. The screen offers the button on the same terms (the server
 * decides; this only keeps the button from appearing where it cannot work).
 */
export const NO_SHOW_AFTER_MINUTES = 10;
const NEVER_STARTED = ["confirmed", "checked_in", "en_route"] as const;

/** Whether the "the doctor did not come" button is offered now. A missing or unreadable start time never offers it. */
export function canReportNoShow(status: string | undefined, slotStart: string | undefined, now: number): boolean {
  if (!(NEVER_STARTED as readonly string[]).includes((status ?? "").toLowerCase())) return false;
  const start = slotStart ? Date.parse(slotStart) : Number.NaN;
  return Number.isFinite(start) && now >= start + NO_SHOW_AFTER_MINUTES * 60_000;
}

/** The moment the button appears, for a timer that wakes the screen up then (null when it never will). */
export function noShowOpensAt(status: string | undefined, slotStart: string | undefined): number | null {
  if (!(NEVER_STARTED as readonly string[]).includes((status ?? "").toLowerCase())) return null;
  const start = slotStart ? Date.parse(slotStart) : Number.NaN;
  return Number.isFinite(start) ? start + NO_SHOW_AFTER_MINUTES * 60_000 : null;
}
