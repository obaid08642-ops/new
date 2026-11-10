/**
 * Owner decision 4 (2026-11-10), lane Z's #2589: after the pharmacy has prepared an order only a wrong, damaged or expired item (or one not as
 * described) is refunded, with a photo, after an admin review. A pharmacy return therefore sends `reason_code` (one of the four) and the
 * photo(s) as `attachedDocs`; the server answers 400 `pharmacy_return_needs_a_defect_reason` or `photo_evidence_required` otherwise.
 * Same codes as the web (patient-web/lib/returns/pharmacy-return.ts).
 */
export const PHARMACY_RETURN_REASONS = ['wrongItem', 'damaged', 'expired', 'notAsDescribed'] as const;
export type PharmacyReturnReason = (typeof PHARMACY_RETURN_REASONS)[number];

const CODES: Record<PharmacyReturnReason, string> = { wrongItem: 'wrong_item', damaged: 'damaged', expired: 'expired', notAsDescribed: 'not_as_described' };

/** The server's reason code of a reason chosen on the screen. */
export const pharmacyReasonCode = (reason: PharmacyReturnReason): string => CODES[reason];

/** The locale key for a known server refusal of a return; null for anything else. */
export function returnErrorKey(error: unknown): string | null {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (/pharmacy_return_needs_a_defect_reason/.test(text)) return 'returns.err.defectReason';
  if (/photo_evidence_required/.test(text)) return 'returns.err.photoRequired';
  return null;
}
