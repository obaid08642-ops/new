/**
 * Owner decision 2026-11-10 (late cancel, option b): inside the last hours before a visit, instead of cancelling for the late refund the
 * patient may move the booking once, free, to a slot within `within_days` days. Lane Z's `GET /care/appointments/:id/refund-preview`
 * answers `free_reschedule: { available, late, within_days }`; the screens offer the choice only when `late` and `available`.
 * Same reader as the app (patient-app/src/utils/lateReschedule.ts).
 */
export function readLateReschedule(payload: unknown): { days: number } | null {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const inner = root && root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const offer = inner && inner.free_reschedule && typeof inner.free_reschedule === "object" ? (inner.free_reschedule as Record<string, unknown>) : null;
  if (!offer || offer.available !== true || offer.late !== true) return null;
  const days = Number(offer.within_days);
  return Number.isInteger(days) && days > 0 && days <= 60 ? { days } : null;
}
