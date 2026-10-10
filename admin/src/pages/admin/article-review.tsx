import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { approveErrorMessage, reviewArticle, reviewList, type ReviewArticle } from '@/utils/article-review';

/**
 * Review of doctor articles (D-1, replaces community moderation).
 * GET /admin/articles?status=IN_REVIEW, GET /admin/articles/:id, POST /admin/articles/:id/approve, POST /admin/articles/:id/reject {reason}.
 */
type Action = 'approve' | 'reject';

export default function ArticleReviewPage() {
  const [rows, setRows] = useState<ReviewArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<ReviewArticle | null>(null);
  const [opening, setOpening] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(reviewList(await adminFetch<unknown>('/admin/articles?status=IN_REVIEW')));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل المقالات.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function openArticle(id: string) {
    setOpening(true);
    setError('');
    setNotice('');
    try {
      setOpen(reviewArticle(await adminFetch<unknown>(`/admin/articles/${encodeURIComponent(id)}`)));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر فتح المقال.'));
    } finally {
      setOpening(false);
    }
  }

  function ask(next: Action) {
    setReason('');
    setDialogError('');
    setAction(next);
  }
  const cancel = useCallback(() => { if (!saving) setAction(null); }, [saving]);

  async function confirm() {
    if (!open || !action) return;
    if (action === 'reject' && reason.trim().length === 0) { setDialogError('اكتب سبب الرفض.'); return; }
    setSaving(true);
    setDialogError('');
    try {
      const path = `/admin/articles/${encodeURIComponent(open.id)}/${action}`;
      if (action === 'approve') await adminMutation(path, 'POST');
      else await adminMutation(path, 'POST', { reason: reason.trim() });
      setRows((list) => list.filter((a) => a.id !== open.id));
      setNotice(action === 'approve' ? `تم اعتماد المقال «${open.title}».` : `تم رفض المقال «${open.title}».`);
      setAction(null);
      setOpen(null);
    } catch (cause) {
      setDialogError(action === 'approve' ? approveErrorMessage(cause) : apiErrorMessage(cause, 'تعذر رفض المقال. لم يتغير شيء.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head><title>مراجعة مقالات الأطباء | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">مراجعة مقالات الأطباء</h1>
          <p className="mt-1 text-sm text-slate-500">المقالات المرسلة من الأطباء بانتظار الاعتماد. افتح المقال واقرأه كاملاً ثم اعتمده أو ارفضه مع ذكر السبب.</p>
        </header>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-lg bg-teal-50 p-3 text-teal-800">{notice}</p> : null}
        {open ? (
          <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{open.title}</h2>
                <p className="mt-1 text-sm text-slate-500">الطبيب: <span dir="ltr">{open.doctorId || '—'}</span> · {open.createdAt.slice(0, 10)}</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-lg border px-4 text-sm font-bold text-slate-700">عودة إلى القائمة</button>
            </div>
            <div className="whitespace-pre-wrap text-base leading-8 text-slate-800">{open.body}</div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => ask('approve')} className="min-h-11 rounded-lg bg-teal-700 px-5 text-sm font-bold text-white">اعتماد ونشر</button>
              <button type="button" onClick={() => ask('reject')} className="min-h-11 rounded-lg border border-rose-300 px-5 text-sm font-bold text-rose-700">رفض</button>
            </div>
          </article>
        ) : (
          <DataTable
            loading={loading || opening}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyText="لا توجد مقالات بانتظار المراجعة."
            columns={[
              { key: 'title', header: 'العنوان', render: (row) => <strong>{row.title || '—'}</strong> },
              { key: 'doctor', header: 'الطبيب', className: 'font-mono text-xs', render: (row) => <span dir="ltr">{row.doctorId || '—'}</span> },
              { key: 'date', header: 'التاريخ', render: (row) => row.createdAt.slice(0, 10) },
              {
                key: 'open',
                header: 'مراجعة',
                actions: true,
                render: (row) => (
                  <button type="button" onClick={() => void openArticle(row.id)} className="inline-flex min-h-11 min-w-11 items-center rounded-lg border px-4 text-sm font-bold text-slate-700">فتح المقال</button>
                ),
              },
            ]}
          />
        )}
      </section>
      <ConfirmDialog
        open={action !== null}
        title={action === 'approve' ? 'اعتماد المقال ونشره؟' : 'رفض المقال؟'}
        confirmLabel={action === 'approve' ? 'نعم، اعتمد' : 'نعم، ارفض'}
        busy={saving}
        onConfirm={() => void confirm()}
        onCancel={cancel}
      >
        {action === 'approve' ? (
          <p className="font-bold">سيظهر المقال للمرضى فوراً بعد فحص النص من أسماء الأدوية التي تُصرف بوصفة.</p>
        ) : (
          <label className="block text-sm">
            سبب الرفض (يصل إلى الطبيب)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded border p-2 text-base" />
          </label>
        )}
        {dialogError ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-rose-700">{dialogError}</p> : null}
      </ConfirmDialog>
    </>
  );
}
