/**
 * The stages of a radiology booking, in the server's own state words (the app's RAD_STAGES): the patient sees where the scan is.
 * A lab booking shows the steps the server logged instead (GET /labs/bookings/:id/tracking).
 */
export const RADIOLOGY_STAGES = [
  { key: "PENDING_INSURANCE", label: "status_insurance" },
  { key: "CONFIRMED", label: "status_confirmed" },
  { key: "IN_SCANNING", label: "stageScan" },
  { key: "REPORT_DRAFT", label: "stageReport" },
  { key: "REPORT_READY", label: "stageResult" },
] as const;

/** Before confirmation the booking sits in the first stage; states between two stages count as the earlier one. */
const BEFORE_CONFIRMED = new Set(["PENDING_ACCEPTANCE", "NEW_REQUEST", "PENDING_INSURANCE", "WAITING_COPAY"]);
const EXTRA: Record<string, number> = { ACCEPTED: 1, CHECKED_IN: 1, ARRIVED_CHECKIN: 1, SCANNING_COMPLETED: 2, UNDER_REVIEW: 3, REPORT_UPLOADED: 4 };

/** The index in RADIOLOGY_STAGES of a booking state, or -1 when the state is not a stage (cancelled, unknown). */
export function radiologyStageIndex(state: string | undefined): number {
  const key = (state ?? "").trim().toUpperCase();
  const direct = RADIOLOGY_STAGES.findIndex((stage) => stage.key === key);
  if (direct >= 0) return direct;
  if (BEFORE_CONFIRMED.has(key)) return 0;
  return EXTRA[key] ?? -1;
}

/** The states in which the patient may still cancel (the app's CANCELLABLE list). */
export const CANCELLABLE_STATES = new Set(["NEW_REQUEST", "PENDING_ACCEPTANCE", "PENDING_INSURANCE", "WAITING_COPAY"]);
