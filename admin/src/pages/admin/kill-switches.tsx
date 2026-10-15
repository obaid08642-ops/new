import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { formatAdminDate } from '@/utils/dates';
import {
  CONFIRM_WORD_OFF,
  CONFIRM_WORD_ON,
  MIN_REASON,
  confirmationMatches,
  emergencyState,
  killSwitchRows,
  reasonValid,
  type EmergencyState,
  type KillSwitchRow,
} from '@/utils/kill-switches';

// Issues 955 / 995: platform emergency maintenance and the per-action kill switches. Super admin only
// (modules.manage), the same permission the backend routes require.
type Pending =
  | { kind: 'switch'; row: KillSwitchRow; next: boolean }
  | { kind: 'emergency'; next: boolean };

export default function KillSwitchesPage() {
  const [rows, setRows] = useState<KillSwitchRow[]>([]);
  const [emergency, setEmergency] = useState<EmergencyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [switches, state] = await Promise.all([
        adminFetch<unknown>('/api/admin/kill-switches'),
        adminFetch<unknown>('/api/admin/admin/governance/emergency-maintenance'),
      ]);
      setRows(killSwitchRows(switches));
      setEmergency(emergencyState(state));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل مفاتيح الطوارئ.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function open(next: Pending) {
    setNotice('');
    setReason('');
    setTyped('');
    setDialogError('');
    setPending(next);
  }
  const cancel = useCallback(() => { if (!saving) setPending(null); }, [saving]);

  // The emergency command and the dangerous switches need the typed word; the others only a reason.
  const confirmWord = pending?.kind === 'emergency'
    ? (pending.next ? CONFIRM_WORD_ON : CONFIRM_WORD_OFF)
    : pending?.kind === 'switch' && pending.row.danger && !pending.next ? CONFIRM_WORD_ON : null;

  async function confirm() {
    if (!pending) return;
    if (!reasonValid(reason)) { setDialogError(`اكتب سبب التغيير (${MIN_REASON} أحرف على الأقل).`); return; }
    if (confirmWord && !confirmationMatches(typed, confirmWord)) { setDialogError(`اكتب كلمة «${confirmWord}» للتأكيد.`); return; }
    setSaving(true);
    setDialogError('');
    try {
      if (pending.kind === 'switch') {
        const updated = await adminMutation<unknown>(`/api/admin/kill-switches/${encodeURIComponent(pending.row.key)}`, 'POST', { value: pending.next, reason: reason.trim() });
        const list = killSwitchRows(updated);
        setRows(list);
        const saved = list.find((r) => r.key === pending.row.key);
        setNotice(`ردّ الخادم: «${pending.row.name}» ${saved?.value ? 'يعمل' : 'موقوف'} الآن.`);
      } else {
        const answer = await adminMutation<unknown>('/api/admin/admin/governance/trigger-emergency-maintenance', 'PUT', { forceMaintenanceState: pending.next, reason: reason.trim() });
        const state = emergencyState(answer);
        setEmergency(state);
        setNotice(state.active
          ? 'ردّ الخادم: وضع الصيانة الطارئة مفعّل. التطبيقات والموقع تعرض شاشة الصيانة، والخادم يرفض أي تعديل من غير الإدارة.'
          : 'ردّ الخادم: انتهى وضع الصيانة الطارئة وعادت التطبيقات إلى وضعها السابق.');
      }
      setPending(null);
    } catch (cause) {
      setDialogError(apiErrorMessage(cause, 'تعذر حفظ التغيير. لم يتغير شيء.'));
    } finally {
      setSaving(false);
    }
  }

  const dialogTitle = !pending ? ''
    : pending.kind === 'emergency'
      ? (pending.next ? 'تفعيل وضع الصيانة الطارئة للمنصة كلها؟' : 'إنهاء وضع الصيانة الطارئة؟')
      : `${pending.next ? 'تشغيل' : 'إيقاف'} «${pending.row.name}»؟`;
  const consequence = !pending ? ''
    : pending.kind === 'emergency'
      ? (pending.next
        ? 'كل التطبيقات والموقع تعرض شاشة الصيانة فوراً، ويرفض الخادم أي طلب أو حجز أو تعديل من المرضى والمزودين حتى تنهي الوضع. لوحة الإدارة تبقى تعمل.'
        : 'تعود التطبيقات إلى وضع الصيانة الذي كانت عليه قبل التفعيل، ويقبل الخادم الطلبات من جديد.')
      : (pending.next ? 'يعود هذا الإجراء متاحاً فوراً لكل المستخدمين.' : pending.row.description);

  return (
    <>
      <Head><title>مفاتيح الطوارئ | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">مفاتيح الطوارئ</h1>
          <p className="mt-1 text-sm text-slate-500">
            إيقاف إجراء بعينه أو المنصة كلها عند حادث. الخادم يرفض ما يُوقف هنا لكل التطبيقات، وكل تغيير يحتاج سبباً ويُسجّل في سجل التدقيق.
            لإخفاء خدمة كاملة من التطبيق استخدم <Link href="/admin/module-switches" className="font-bold text-teal-700 underline">مفاتيح الخدمات</Link>.
          </p>
        </header>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-lg bg-teal-50 p-3 text-teal-800">{notice}</p> : null}

        <article className={`rounded-2xl border p-6 shadow-sm ${emergency?.active ? 'border-rose-300 bg-rose-50' : 'bg-white'}`}>
          <h2 className="text-xl font-bold">الصيانة الطارئة للمنصة</h2>
          {loading || !emergency ? (
            <p className="mt-3 text-sm text-slate-500">جارٍ التحميل…</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-sm">
                <p className={emergency.active ? 'font-bold text-rose-700' : 'font-bold text-teal-700'}>
                  {emergency.active ? 'مفعّلة: التطبيقات في وضع الصيانة والخادم يرفض التعديلات.' : 'غير مفعّلة: المنصة تعمل.'}
                </p>
                {emergency.reason ? <p className="text-slate-600">آخر سبب: {emergency.reason}{emergency.updatedAt ? ` · ${formatAdminDate(emergency.updatedAt)}` : ''}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => open({ kind: 'emergency', next: !emergency.active })}
                className={`min-h-11 rounded-lg px-5 font-bold text-white ${emergency.active ? 'bg-teal-700' : 'bg-rose-700'}`}
              >
                {emergency.active ? 'إنهاء الصيانة الطارئة' : 'تفعيل الصيانة الطارئة'}
              </button>
            </div>
          )}
        </article>

        <article className="space-y-3">
          <h2 className="text-xl font-bold">مفاتيح الإجراءات</h2>
          <DataTable
            loading={loading}
            rows={rows}
            getRowKey={(row) => row.key}
            emptyText="لا توجد مفاتيح لعرضها."
            columns={[
              { key: 'name', header: 'الإجراء', render: (row) => <div><strong>{row.name}</strong><p className="mt-1 text-xs text-slate-500">{row.description}</p></div> },
              { key: 'state', header: 'الحالة', render: (row) => <span className={row.value ? 'font-bold text-teal-700' : 'font-bold text-rose-700'}>{row.value ? 'يعمل' : 'موقوف'}</span> },
              { key: 'last', header: 'آخر تغيير', className: 'text-xs', render: (row) => (row.reason ? `${row.reason}${row.updatedAt ? ` · ${formatAdminDate(row.updatedAt)}` : ''}` : '—') },
              {
                key: 'switch',
                header: 'تشغيل',
                actions: true,
                render: (row) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.value}
                    aria-label={`${row.value ? 'إيقاف' : 'تشغيل'} ${row.name}`}
                    onClick={() => open({ kind: 'switch', row, next: !row.value })}
                    className={`inline-flex min-h-11 min-w-11 items-center rounded-lg border px-4 text-sm font-bold ${row.value ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}
                  >
                    {row.value ? 'إيقاف' : 'تشغيل'}
                  </button>
                ),
              },
            ]}
          />
        </article>
      </section>
      <ConfirmDialog
        open={!!pending}
        title={dialogTitle}
        confirmLabel={pending?.kind === 'emergency' ? (pending.next ? 'نعم، فعّل الصيانة' : 'نعم، أنهِ الصيانة') : pending?.next ? 'نعم، شغّل' : 'نعم، أوقف'}
        busy={saving}
        onConfirm={() => void confirm()}
        onCancel={cancel}
      >
        <p className="font-bold">{consequence}</p>
        <label className="block text-sm">
          سبب التغيير
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded border p-2 text-base" />
        </label>
        {confirmWord ? (
          <label className="block text-sm">
            للتأكيد اكتب «{confirmWord}»
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 w-full rounded border p-2 text-base" autoComplete="off" />
          </label>
        ) : null}
        {dialogError ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-rose-700">{dialogError}</p> : null}
      </ConfirmDialog>
    </>
  );
}
