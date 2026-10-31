import { ServiceDomain, ServiceState } from '../../common/enums';

/**
 * A radiology job is finished by the two-person publish (upload files, send for review, a different radiologist approves: report_status 'ready'),
 * so the generic "complete" cannot reach REPORT_PUBLISHED around it.
 *
 * A lab job is finished by uploading the result (POST /labs/bookings/:id/upload-report), which stores the report and moves the
 * booking to REPORTED. The generic job "complete" must not be a second way to reach REPORTED with nothing for the patient to open.
 * Returns the error code to refuse with, or null when completing is allowed.
 */
export function completionBlocker(kind: ServiceDomain, target: ServiceState, entity: { reports?: unknown; report_status?: unknown }): string | null {
  if (target !== ServiceState.COMPLETED) return null;
  if (kind === 'radiology') return entity?.report_status === 'ready' ? null : 'radiology_report_not_published';
  if (kind !== 'lab') return null;
  const reports = Array.isArray(entity?.reports) ? (entity.reports as Array<Record<string, unknown>>) : [];
  const hasResult = reports.some((r) => !!r && (r.storage_object_id || r.base64 || (Array.isArray(r.entries) && r.entries.length)));
  return hasResult ? null : 'lab_report_required';
}

/**
 * Accepting a lab or radiology booking through the generic job call needs the same payment rule as the dedicated confirm
 * (labs.service / radiology.service `assertConfirmable`, and nursing in this module): card must be paid, insurance goes through
 * the coverage decision (or is already approved), cash is taken at the facility only. Returns the error code, or null.
 */
export function acceptBlocker(kind: ServiceDomain, target: ServiceState, e: { payment_method?: string; payment_status?: string; insurance_status?: string; location_type?: string }): string | null {
  if (target !== ServiceState.CONFIRMED || (kind !== 'lab' && kind !== 'radiology')) return null;
  if (e.payment_method === 'insurance') return e.insurance_status === 'approved' ? null : 'insurance_booking_requires_coverage_decision';
  if (e.payment_method === 'card') return e.payment_status === 'paid' ? null : 'card_payment_not_completed';
  if (e.payment_method === 'cash') {
    const atFacility = kind === 'lab' ? e.location_type === 'facility' : e.location_type !== 'home';
    return atFacility ? null : 'cash_only_at_facility';
  }
  return null;
}
