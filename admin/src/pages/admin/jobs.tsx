import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage, toQuery } from '@/lib/admin-client';
import { JOB_ACTION_LABELS, jobActionRequest, jobActionsFor, type JobAction } from '@/lib/job-actions';

// Q61: admin review-and-publish for guest job submissions.
// Every action below maps to a real endpoint in
// backend/src/modules/recruitment/recruitment.module.ts (RecruitmentController):
//   list    GET   /api/admin/recruitment/jobs?status=...          (listJobs)
//   detail  GET   /api/admin/recruitment/jobs/:id                 (getJob)
//   publish PUT   /api/admin/recruitment/jobs/:id {status}        (updateJob; UpdateJobDto.status)
//   close   PUT   /api/admin/recruitment/jobs/:id {status:'closed'} (same endpoint)
//   delete  DELETE /api/admin/recruitment/jobs/:id                 (deleteJob; admin-only soft delete)
//   apps    GET   /api/admin/recruitment/jobs/:id/applications    (listJobApplications, admin allowed)
//   decide  PATCH /api/admin/recruitment/applications/:id/status  (updateApplicationStatus)
// The action → request mapping lives in src/lib/job-actions.ts.

type JobRow = {
  id: string;
  title?: string;
  description?: string;
  requirements?: unknown;
  scfhs_role?: string;
  location?: string;
  salary_range?: string;
  facility_id?: string;
  status?: string;
  post_type?: string;
  company?: string;
  contact_phone?: string;
  contact_preference?: string;
  nationality?: string;
  experience_years?: number;
  contract_type?: string;
  guest_device_id?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApplicationRow = {
  id: string;
  job_id?: string;
  candidate_id?: string;
  cover_letter?: string;
  status?: string;
  applied_at?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_device_id?: string;
  candidate?: { id?: string; scfhs_license_number?: string; scfhs_license_status?: string } | null;
};

const STATUS_TABS = [
  { key: 'draft', label: 'مسودات بانتظار النشر' },
  { key: 'published', label: 'منشورة' },
  { key: 'closed', label: 'مغلقة' },
  { key: '', label: 'الكل' },
];

const APP_STATUSES = ['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'];

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    for (const key of ['data', 'items', 'jobs', 'applications']) {
      if (Array.isArray(rec[key])) return rec[key] as any[];
    }
  }
  return [];
}

function isGuest(job: JobRow): boolean {
  return Boolean(job?.guest_device_id) || String(job?.facility_id ?? '').startsWith('guest:');
}

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    closed: 'bg-gray-200 text-gray-700',
  };
  const labels: Record<string, string> = { draft: 'مسودة', published: 'منشورة', closed: 'مغلقة' };
  const key = String(status ?? '');
  return (
    <span className={`px-2 py-1 text-xs font-bold rounded-full ${map[key] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[key] ?? (key || '—')}
    </span>
  );
}

export default function JobsPage() {
  const [status, setStatus] = useState('draft');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch<unknown>(`/api/admin/recruitment/jobs${toQuery({ status: status || undefined })}`);
      setJobs(asArray(res) as JobRow[]);
    } catch (cause) {
      setJobs([]);
      setError(apiErrorMessage(cause, 'تعذر تحميل الوظائف.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (job: JobRow) => {
    const id = job?.id;
    if (!id) return;
    setSelectedId(id);
    setDetail(job);
    setDetailError('');
    setApps([]);
    setAppsError('');
    setDetailLoading(true);
    setAppsLoading(true);
    try {
      const full = await adminFetch<JobRow>(`/api/admin/recruitment/jobs/${encodeURIComponent(id)}`);
      setDetail(full ?? job);
    } catch (cause) {
      setDetailError(apiErrorMessage(cause, 'تعذر تحميل تفاصيل الوظيفة.'));
    } finally {
      setDetailLoading(false);
    }
    try {
      const list = await adminFetch<unknown>(`/api/admin/recruitment/jobs/${encodeURIComponent(id)}/applications`);
      setApps(asArray(list) as ApplicationRow[]);
    } catch (cause) {
      setApps([]);
      setAppsError(apiErrorMessage(cause, 'تعذر تحميل طلبات التقديم.'));
    } finally {
      setAppsLoading(false);
    }
  }, []);

  async function runJobAction(job: JobRow, action: JobAction) {
    const id = job?.id;
    if (!id) return;
    const verb = JOB_ACTION_LABELS[action];
    const warning = action === 'delete' ? ' ستُخفى الوظيفة من القوائم ويبقى سجلها للتدقيق.' : '';
    if (!window.confirm(`تأكيد ${verb} الوظيفة «${job?.title ?? id}»؟${warning}`)) return;
    setSaving(true);
    try {
      const request = jobActionRequest(id, action);
      await adminMutation(request.path, request.method, request.body);
      await load();
      if (selectedId === id) {
        if (action === 'delete') {
          setSelectedId(null);
          setDetail(null);
          setApps([]);
        } else {
          const full = await adminFetch<JobRow>(`/api/admin/recruitment/jobs/${encodeURIComponent(id)}`).catch(() => null);
          if (full) setDetail(full);
        }
      }
    } catch (cause) {
      setError(apiErrorMessage(cause, `تعذر ${verb} الوظيفة.`));
    } finally {
      setSaving(false);
    }
  }

  async function setAppStatus(app: ApplicationRow, next: string) {
    const id = app?.id;
    if (!id || !selectedId) return;
    setSaving(true);
    try {
      await adminMutation(`/api/admin/recruitment/applications/${encodeURIComponent(id)}/status`, 'PATCH', { status: next });
      const list = await adminFetch<unknown>(
        `/api/admin/recruitment/jobs/${encodeURIComponent(selectedId)}/applications`,
      );
      setApps(asArray(list) as ApplicationRow[]);
    } catch (cause) {
      setAppsError(apiErrorMessage(cause, 'تعذر تحديث حالة الطلب.'));
    } finally {
      setSaving(false);
    }
  }

  const requirements: string[] = Array.isArray(detail?.requirements)
    ? (detail?.requirements as unknown[]).map((r) => String(r ?? '')).filter((r) => r.length > 0)
    : [];

  return (
    <>
      <Head>
        <title>مراجعة الوظائف | نبض بلس</title>
      </Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">مراجعة الوظائف ونشرها</h1>
          <p className="mt-1 text-sm text-slate-500">
            وظائف الضيوف تُحفظ كمسودات بانتظار مراجعة الإدارة — راجع ثم انشر أو أغلق. لا يوجد حذف عبر الواجهة (لا endpoint حذف).
          </p>
        </header>

        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">الحالة:</span>
          {STATUS_TABS.map((t) => (
            <button
              key={t.key || 'all'}
              onClick={() => {
                setStatus(t.key);
                setSelectedId(null);
                setDetail(null);
                setApps([]);
              }}
              className={`rounded px-3 py-1 text-sm ${status === t.key ? 'bg-teal-700 text-white' : 'border'}`}
            >
              {t.label}
            </button>
          ))}
          <button onClick={() => void load()} className="rounded border px-3 py-1 text-sm">
            تحديث
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">لا توجد وظائف بهذه الحالة.</div>
          ) : (
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-4">العنوان</th>
                  <th className="p-4">الدور / المدينة</th>
                  <th className="p-4">المصدر</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={String(job?.id ?? Math.random())} className="border-t hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold">{job?.title ?? '—'}</div>
                      <div className="text-xs text-slate-400">{job?.company ?? ''}</div>
                    </td>
                    <td className="p-4 text-xs">
                      <div>{job?.scfhs_role ?? '—'}</div>
                      <div className="text-slate-400">{job?.location ?? '—'}</div>
                    </td>
                    <td className="p-4 text-xs">{isGuest(job) ? 'ضيف (جهاز)' : 'منشأة'}</td>
                    <td className="p-4">{statusBadge(job?.status)}</td>
                    <td className="p-4 text-xs">
                      {job?.createdAt ? new Date(job.createdAt).toLocaleString('ar-SA') : '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void openDetail(job)}
                          className="rounded bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200"
                        >
                          مراجعة
                        </button>
                        {jobActionsFor(job?.status).map((action) => (
                          <button
                            key={action}
                            disabled={saving}
                            onClick={() => void runJobAction(job, action)}
                            className={
                              action === 'publish'
                                ? 'rounded bg-teal-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50'
                                : action === 'close'
                                  ? 'rounded bg-amber-100 px-3 py-1 text-xs text-amber-800 disabled:opacity-50'
                                  : 'rounded bg-rose-50 px-3 py-1 text-xs text-rose-700 disabled:opacity-50'
                            }
                          >
                            {JOB_ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedId ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">تفاصيل الوظيفة</h2>
            {detailLoading ? (
              <p className="mt-3 text-sm text-slate-500">جاري تحميل التفاصيل...</p>
            ) : detailError ? (
              <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {detailError}
              </p>
            ) : detail ? (
              <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">العنوان</dt>
                  <dd className="font-bold">{detail?.title ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">الشركة</dt>
                  <dd>{detail?.company ?? '—'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-slate-500">الوصف</dt>
                  <dd>{detail?.description ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">الدور الطبي</dt>
                  <dd>{detail?.scfhs_role ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">المدينة</dt>
                  <dd>{detail?.location ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">نوع الإعلان</dt>
                  <dd>{detail?.post_type ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">نوع العقد</dt>
                  <dd>{detail?.contract_type ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">الراتب</dt>
                  <dd>{detail?.salary_range ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">سنوات الخبرة</dt>
                  <dd>{detail?.experience_years != null ? String(detail.experience_years) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">هاتف التواصل</dt>
                  <dd dir="ltr">{detail?.contact_phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">الجنسية</dt>
                  <dd>{detail?.nationality ?? '—'}</dd>
                </div>
                {requirements.length > 0 ? (
                  <div className="md:col-span-2">
                    <dt className="text-slate-500">المتطلبات</dt>
                    <dd>
                      <ul className="list-disc pr-5">
                        {requirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-400">اختر وظيفة للمراجعة.</p>
            )}

            <h3 className="mt-6 text-lg font-bold">طلبات التقديم</h3>
            {appsLoading ? (
              <p className="mt-2 text-sm text-slate-500">جاري تحميل الطلبات...</p>
            ) : appsError ? (
              <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {appsError}
              </p>
            ) : apps.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">لا توجد طلبات تقديم بعد.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-xl border">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="p-3">المتقدم</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الخطاب</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app) => (
                      <tr key={String(app?.id ?? Math.random())} className="border-t">
                        <td className="p-3">{app?.guest_name ?? app?.candidate_id ?? '—'}</td>
                        <td className="p-3 text-xs" dir="ltr">
                          {app?.guest_phone ?? '—'}
                        </td>
                        <td className="p-3 text-xs">{app?.cover_letter ?? '—'}</td>
                        <td className="p-3 text-xs">{app?.status ?? '—'}</td>
                        <td className="p-3">
                          <select
                            disabled={saving}
                            value={APP_STATUSES.includes(String(app?.status ?? '')) ? String(app?.status) : 'submitted'}
                            onChange={(e) => void setAppStatus(app, e.target.value)}
                            className="rounded border p-1 text-xs"
                            aria-label="تغيير حالة الطلب"
                          >
                            {APP_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
