/**
 * Owner decision 4 (2026-11-10), lane Z's #2589: after the pharmacy has prepared an order only a wrong, damaged or expired item (or one not as
 * described) is refunded, with a photo, after an admin review. A pharmacy return therefore sends `reason_code` (one of the four) and
 * `attachedDocs: ["media:<id>"]`; the server answers 400 `pharmacy_return_needs_a_defect_reason` or `photo_evidence_required` otherwise.
 * Same codes as the app (patient-app/src/utils/pharmacyReturn.ts).
 */
export const PHARMACY_RETURN_REASONS = ["wrong_item", "damaged", "expired", "not_as_described"] as const;
export type PharmacyReturnReason = (typeof PHARMACY_RETURN_REASONS)[number];

/** The message key (ReturnsWeb) for a known server refusal; null for anything else. */
export function returnErrorKey(message: unknown): "defectReasonOnly" | "photoRequiredError" | null {
  const text = typeof message === "string" ? message : "";
  if (/pharmacy_return_needs_a_defect_reason/.test(text)) return "defectReasonOnly";
  if (/photo_evidence_required/.test(text)) return "photoRequiredError";
  return null;
}
