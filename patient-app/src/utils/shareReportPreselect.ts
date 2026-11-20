/**
 * "Share with your doctor" from a lab or radiology result opens the share-reports screen, which lists the patient's medical reports
 * (GET /medical-reports/mine). A medical report names the booking it came from (`lab_booking_id` / `radiology_booking_id`), so the report
 * that belongs to the result is ticked for the patient. A result with no medical report yet ticks nothing, as before.
 */
export interface ShareableReport {
  id: string;
  lab_booking_id?: string | null;
  radiology_booking_id?: string | null;
}

export type ResultKindParam = 'lab' | 'radiology';

export const parseResultKind = (value: unknown): ResultKindParam | null => (value === 'lab' || value === 'radiology' ? value : null);

/** The ids of the reports that belong to this booking of this kind of result. */
export function reportIdsForBooking(reports: readonly ShareableReport[], kind: ResultKindParam | null, bookingId: string | null | undefined): string[] {
  if (!kind || !bookingId) return [];
  return reports.filter((r) => (kind === 'lab' ? r.lab_booking_id : r.radiology_booking_id) === bookingId).map((r) => r.id);
}
