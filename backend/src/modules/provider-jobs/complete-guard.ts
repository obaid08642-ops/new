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
