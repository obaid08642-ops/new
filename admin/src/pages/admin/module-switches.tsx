import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { DISABLE_CONSEQUENCE, ENABLE_CONSEQUENCE, moduleRows, type ModuleRow } from '@/utils/module-switches';

type Pending = { row: ModuleRow; next: boolean };

export default function ModuleSwitchesPage() {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(moduleRows(await adminFetch<unknown>('/api/admin/modules')));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل حالة الخدمات.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function ask(row: ModuleRow) {
    setNotice('');
    setReason('');
    setReasonError('');
    setPending({ row, next: !row.enabled });
  }
  const cancel = useCallback(() => { if (!saving) setPending(null); }, [saving]);

  async function confirm() {
    if (!pending) return;
    if (reason.trim().length < 3) { setReasonError('اكتب سبب التغيير (3 أحرف على الأقل).'); return; }
    setSaving(true);
    setReasonError('');
    try {
      await adminMutation(`/api/admin/admin/modules/${encodeURIComponent(pending.row.key)}`, 'PUT', { enabled: pending.next, reason: reason.trim() });
      setRows((list) => list.map((r) => (r.key === pending.row.key ? { ...r, enabled: pending.next } : r)));
      setNotice(`${pending.next ? 'تم تفعيل' : 'تم إيقاف'} خدمة «${pending.row.label}».`);
      setPending(null);
    } catch (cause) {
      setReasonError(apiErrorMessage(cause, 'تعذر حفظ التغيير. لم يتغير شيء.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head><title>مفاتيح الخدمات | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">مفاتيح الخدمات</h1>
          <p className="mt-1 text-sm text-slate-500">إيقاف خدمة يخفيها فوراً من التطبيق والموقع ويرفض طلباتها في الخادم. التغيير مدقق ويحتاج سبباً.</p>
        </header>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-lg bg-teal-50 p-3 text-teal-800">{notice}</p> : null}
        <DataTable
          loading={loading}
          rows={rows}
          getRowKey={(row) => row.key}
          emptyText="لا توجد خدمات لعرضها."
          columns={[
            { key: 'label', header: 'الخدمة', render: (row) => <strong>{row.label}</strong> },
            { key: 'key', header: 'المفتاح', className: 'font-mono text-xs', render: (row) => <span dir="ltr">{row.key}</span> },
            { key: 'state', header: 'الحالة', render: (row) => <span className={row.enabled ? 'font-bold text-teal-700' : 'font-bold text-rose-700'}>{row.enabled ? 'مفعّلة' : 'موقوفة'}</span> },
            {
              key: 'switch',
              header: 'تشغيل',
              actions: true,
              render: (row) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.enabled}
                  aria-label={`${row.enabled ? 'إيقاف' : 'تفعيل'} ${row.label}`}
                  onClick={() => ask(row)}
                  className={`inline-flex min-h-11 min-w-11 items-center rounded-lg border px-4 text-sm font-bold ${row.enabled ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}
                >
                  {row.enabled ? 'إيقاف الخدمة' : 'تفعيل الخدمة'}
                </button>
              ),
            },
          ]}
        />
      </section>
      <ConfirmDialog
        open={!!pending}
        title={pending ? `${pending.next ? 'تفعيل' : 'إيقاف'} خدمة «${pending.row.label}»؟` : ''}
        confirmLabel={pending?.next ? 'نعم، فعّل' : 'نعم، أوقف'}
        busy={saving}
        onConfirm={() => void confirm()}
        onCancel={cancel}
      >
        <p className="font-bold">{pending?.next ? ENABLE_CONSEQUENCE : DISABLE_CONSEQUENCE}</p>
        <label className="block text-sm">
          سبب التغيير
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded border p-2 text-base" />
        </label>
        {reasonError ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-rose-700">{reasonError}</p> : null}
      </ConfirmDialog>
    </>
  );
}
