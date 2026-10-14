// No zod and no other import: client screens use these two functions, and a client bundle that pulls in zod makes the page's CSP report an `eval` probe.

/** The message key (namespace Prescriptions) of each state the backend has; a raw state enum never reaches the screen. */
const STATE_KEYS: Record<string, string> = {
  CREATED_BY_DOCTOR: "stateCreatedByDoctor",
  UPLOADED_BY_PATIENT: "stateUploadedByPatient",
  SENT_TO_PHARMACY: "stateSentToPharmacy",
  PARTIALLY_EDITED: "statePartiallyEdited",
  VERIFIED_BY_PHARMACIST: "stateVerifiedByPharmacist",
  APPROVED: "stateApproved",
  DISPENSED: "stateDispensed",
  ARCHIVED: "stateArchived",
};

export function prescriptionStateKey(state: string | undefined): string {
  return (state && STATE_KEYS[state]) || "stateUnavailable";
}

/** The states in which a prescription can still be ordered from (backend activeForPatient: not dispensed, not archived). */
export function isOrderablePrescriptionState(state: string | undefined): boolean {
  return state !== "DISPENSED" && state !== "ARCHIVED";
}
