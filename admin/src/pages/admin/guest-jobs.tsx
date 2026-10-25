import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { DataTable } from '@/components/DataTable';
import { useCan } from '@/components/AdminGuard';

type Status = 'draft' | 'published' | 'closed';
type GuestJob = {
  id: string; title: string; description: string; scfhs_role: string; location: string; salary_range?: string; company?: string;
  contact_phone?: string; post_type?: 'offer' | 'request'; status: Status; review_note?: string; reviewed_by?: string; reviewed_at?: string; createdAt?: string;
};

const STATUS: Record<Status, string> = { draft: 'بانتظار المراجعة', published: 'منشورة', closed: 'مرفوضة' };
const ROLE: Record<string, string> = { doctor: 'طبيب', pharmacist: 'صيدلي', nurse: 'تمريض', lab: 'مختبر', radiology: 'أشعة' };
const when = (v?: string) => (v ? new Date(v).toLocaleString('ar-SA-u-ca-gregory') : '—');

/** Guest job posts (no account) wait here as drafts; an admin publishes or rejects each one, with a reason recorded. */
export default function GuestJobsPage() {
  const canEdit = useCan('facility.edit');
  const [status, setStatus] = useState<Status>('draft');
  const [rows, setRows] = useState<GuestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<GuestJob | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await apiFetch<GuestJob[]>(`/admin/admin/recruitment/guest-jobs?status=${status}`));
    } catch {
      setError('تعذر تحميل إعلانات الزوار.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function decide(decision: 'publish' | 'reject') {
    if (!selected) return;
    if (decision === 'reject' && note.trim().length < 3) { setError('اكتب سبب الرفض (3 أحرف على الأقل).'); return; }
    setBusy(true); setError('');
    try {
      await apiFetch(`/admin/admin/recruitment/guest-jobs/${encodeURIComponent(selected.id)}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, ...(note.trim() ? { note: note.trim() } : {}) }),
      });
      setNotice(decision === 'publish' ? 'نُشر الإعلان.' : 'رُفض الإعلان.');
      setSelected(null); setNote('');
      await load();
    } catch {
      setError('تعذر تنفيذ القرار. قد يكون الإعلان حُسم من مشرف آخر.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head><title>إعلانات وظائف الزوار | نبض بلس</title></Head>
      <section dir="rtl" className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">إعلانات وظائف الزوار</h1>
            <p className="mt-1 text-sm text-slate-500">إعلانات أُرسلت بدون حساب. لا تظهر للعامة حتى تنشرها الإدارة.</p>
          </div>
          <div className="flex gap-2">
            <select aria-label="الحالة" className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as Status); setSelected(null); }}>
              <option value="draft">{STATUS.draft}</option>
              <option value="published">{STATUS.published}</option>
              <option value="closed">{STATUS.closed}</option>
            </select>
            <button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">تحديث</button>
          </div>
        </div>
        {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{notice}</p> : null}
        <DataTable
          rows={rows}
          getRowKey={(row) => row.id}
          loading={loading}
          loadingText="جارٍ التحميل…"
          emptyText={status === 'draft' ? 'لا توجد إعلانات بانتظار المراجعة.' : 'لا توجد إعلانات بهذه الحالة.'}
          columns={[
            { key: 'title', header: 'العنوان', render: (row) => <span className="text-sm font-medium text-slate-900">{row.title}</span> },
            { key: 'role', header: 'التخصص', render: (row) => ROLE[row.scfhs_role] ?? row.scfhs_role },
            { key: 'location', header: 'المدينة', render: (row) => row.location },
            { key: 'type', header: 'النوع', render: (row) => (row.post_type === 'request' ? 'طلب عمل' : 'عرض وظيفة') },
            { key: 'when', header: 'التاريخ', className: 'text-xs text-slate-500', render: (row) => when(row.createdAt) },
            { key: 'open', header: '', render: (row) => <button onClick={() => { setSelected(row); setNote(''); setNotice(''); setError(''); }} className="rounded border px-3 py-1 text-xs font-semibold">التفاصيل</button> },
          ]}
        />
        {selected ? (
          <aside aria-label="تفاصيل الإعلان" className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="rounded border px-3 py-1 text-xs">إغلاق</button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{selected.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><dt className="text-slate-500">الجهة</dt><dd className="font-semibold">{selected.company || '—'}</dd></div>
              <div><dt className="text-slate-500">الراتب</dt><dd className="font-semibold">{selected.salary_range || '—'}</dd></div>
              <div><dt className="text-slate-500">التواصل</dt><dd className="font-semibold" dir="ltr">{selected.contact_phone || '—'}</dd></div>
              <div><dt className="text-slate-500">الحالة</dt><dd className="font-semibold">{STATUS[selected.status]}</dd></div>
            </dl>
            {selected.status === 'draft' && canEdit ? (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">السبب (إلزامي عند الرفض)
                  <textarea className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => void decide('publish')} className="rounded bg-teal-700 px-3 py-2 text-sm font-bold text-white">نشر</button>
                  <button disabled={busy} onClick={() => void decide('reject')} className="rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700">رفض</button>
                </div>
              </div>
            ) : selected.status !== 'draft' ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">القرار: {STATUS[selected.status]} · {when(selected.reviewed_at)} · المشرف {selected.reviewed_by ?? '—'} · السبب: {selected.review_note ?? '—'}</p>
            ) : null}
          </aside>
        ) : null}
      </section>
    </>
  );
}
