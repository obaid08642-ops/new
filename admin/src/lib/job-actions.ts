// Q61: job moderation actions on /admin/jobs, each mapped to a real route in
// backend/src/modules/recruitment/recruitment.module.ts (RecruitmentController):
//   publish PUT    /recruitment/jobs/:id {status:'published'}  (updateJob)
//   close   PUT    /recruitment/jobs/:id {status:'closed'}     (updateJob)
//   delete  DELETE /recruitment/jobs/:id                       (deleteJob, admin-only soft delete, audited)
export type JobAction = 'publish' | 'close' | 'delete';

export type JobActionRequest = { path: string; method: 'PUT' | 'DELETE'; body?: { status: 'published' | 'closed' } };

export function jobActionsFor(status: string | undefined): JobAction[] {
  if (!status || status === 'draft') return ['publish', 'delete'];
  if (status === 'published') return ['close', 'delete'];
  return ['delete'];
}

export function jobActionRequest(id: string, action: JobAction): JobActionRequest {
  const path = `/api/admin/recruitment/jobs/${encodeURIComponent(id)}`;
  if (action === 'delete') return { path, method: 'DELETE' };
  return { path, method: 'PUT', body: { status: action === 'publish' ? 'published' : 'closed' } };
}

export const JOB_ACTION_LABELS: Record<JobAction, string> = { publish: 'نشر', close: 'إغلاق', delete: 'حذف' };
