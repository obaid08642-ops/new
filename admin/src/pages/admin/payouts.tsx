import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';
import { DataTable } from '@/components/DataTable';
import { useCan } from '@/components/AdminGuard';
import EmptyIcon from '../../components/EmptyIcon';
import { dateLocale } from '../../utils/dates';

/**
 * Provider payouts: the one place a withdrawal request is handled, from request to money sent. The states are the server's
 * (FinanceSuiteService): approve -> (a second, distinct admin from the large-amount threshold) -> transfer done (PAID); a
 * reject from any open state gives the locked balance back to the provider. PAID and REJECTED are final.
 */
type Payout = { id: string; reference?: string; provider_id?: string; provider_name?: string; amount?: number; iban?: string; bank_name?: string; state?: string; createdAt?: string; approved_stage_one_name?: string; approved_by_name?: string; paid_by_name?: string; rejection_reason?: string };
type Queue = { data: Payout[]; dual_approval_threshold_sar: number; by_state: Array<{ state: string; count: number; amount: number }> };

const STAGES: Array<{ state: string; label: string; empty: string }> = [
  { state: 'PENDING_ADMIN_APPROVAL', label: 'بانتظار الاعتماد', empty: 'لا توجد طلبات سحب بانتظار الاعتماد.' },
  { state: 'AWAITING_SECOND_APPROVAL', label: 'بانتظار الاعتماد الثاني', empty: 'لا توجد طلبات بانتظار اعتماد ثانٍ.' },
  { state: 'APPROVED_FOR_PAYOUT', label: 'جاهزة للتحويل', empty: 'لا توجد دفعات معتمدة بانتظار التحويل.' },
  { state: 'PAID', label: 'مدفوعة', empty: 'لا توجد دفعات مدفوعة بعد.' },
  { state: 'REJECTED', label: 'مرفوضة', empty: 'لا توجد دفعات مرفوضة.' },
];
const OPEN = ['PENDING_ADMIN_APPROVAL', 'AWAITING_SECOND_APPROVAL', 'APPROVED_FOR_PAYOUT'];

export default function PayoutsPage() {
  const canPayout = useCan('finance.payout.approve');
  const [stage, setStage] = useState(STAGES[0].state);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setQueue(await adminFetch<Queue>(`/api/admin/admin/finance/payouts?status=${stage}&page=1&limit=50`));
    } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل طلبات السحب.')); } finally { setLoading(false); }
  }, [stage]);
  useEffect(() => { void load(); }, [load]);

  const count = (state: string) => queue?.by_state.find((s) => s.state === state)?.count ?? 0;

  async function act(item: Payout, action: 'approve' | 'execute' | 'reject') {
    const verb = { approve: 'الاعتماد', execute: 'تأكيد التحويل', reject: 'الرفض' }[action];
    const reason = window.prompt(`سبب ${verb} (10 أحرف على الأقل):`);
    if (!reason || reason.trim().length < 10) return;
    const warning = action === 'execute' ? `تأكيد أن ${item.amount} ر.س حُوّلت إلى حساب ${item.provider_name || 'المزود'}؟ لا يمكن التراجع.` : 'هذا قرار مالي مسجل في التدقيق. متابعة؟';
    if (!window.confirm(warning)) return;
    setSaving(true); setError('');
    try {
      await adminMutation(`/api/admin/admin/finance/payouts/${encodeURIComponent(item.id)}/${action}`, 'POST', { reason: reason.trim() });
      await load();
    } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تنفيذ القرار.')); } finally { setSaving(false); }
  }

  const current = STAGES.find((s) => s.state === stage) ?? STAGES[0];
  return (
    <>
      <Head><title>دفعات المزودين | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">دفعات المزودين</h1>
            <p className="mt-1 text-sm text-slate-500">من طلب السحب إلى التحويل في مكان واحد. حد الاعتماد الثنائي: {queue?.dual_approval_threshold_sar ?? '—'} ر.س، ولا يسمح الخادم باعتماد ذاتي ولا باعتمادين من المدير نفسه.</p>
          </div>
          <button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تحديث</button>
        </header>

        <div role="tablist" className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button key={s.state} role="tab" aria-selected={stage === s.state} onClick={() => setStage(s.state)} className={`rounded-full border px-4 py-2 text-sm font-bold ${stage === s.state ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>
              {s.label} <span className="ms-1 text-xs opacity-80">{count(s.state)}</span>
            </button>
          ))}
        </div>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جاري تحميل الدفعات…</p> : (queue?.data ?? []).length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm"><EmptyIcon name="banknote" size={44} color="#0D9488" className="mx-auto mb-3" /><h3 className="text-lg font-bold text-slate-800">{current.empty}</h3></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <DataTable
              bare
              rows={queue?.data ?? []}
              getRowKey={(row) => row.id}
              columns={[
                { key: 'ref', header: 'المرجع', className: 'font-mono text-xs', render: (row) => row.reference || row.id.slice(0, 12) },
                { key: 'provider', header: 'المزوّد', render: (row) => row.provider_name || row.provider_id || '—' },
                { key: 'amount', header: 'المبلغ', className: 'font-bold', render: (row) => `${row.amount ?? '—'} ر.س` },
                { key: 'iban', header: 'الحساب البنكي', className: 'font-mono text-xs', render: (row) => <span dir="ltr">{[row.bank_name, row.iban].filter(Boolean).join(' · ') || '—'}</span> },
                { key: 'who', header: 'القرارات', className: 'text-xs text-slate-600', render: (row) => [row.approved_stage_one_name && `اعتماد أول: ${row.approved_stage_one_name}`, row.approved_by_name && `معتمد: ${row.approved_by_name}`, row.paid_by_name && `حوّل: ${row.paid_by_name}`, row.rejection_reason && `سبب الرفض: ${row.rejection_reason}`].filter(Boolean).join(' · ') || '—' },
                { key: 'date', header: 'تاريخ الطلب', className: 'text-xs text-slate-500', render: (row) => new Date(row.createdAt || Date.now()).toLocaleDateString(dateLocale()) },
                { key: 'actions', header: 'الإجراء', actions: true, render: (row) => (canPayout && OPEN.includes(String(row.state)) ? (
                  <div className="flex gap-2">
                    {row.state === 'APPROVED_FOR_PAYOUT'
                      ? <button disabled={saving} onClick={() => void act(row, 'execute')} className="rounded bg-teal-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">تم التحويل</button>
                      : <button disabled={saving} onClick={() => void act(row, 'approve')} className="rounded bg-teal-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">{row.state === 'AWAITING_SECOND_APPROVAL' ? 'اعتماد ثانٍ' : 'اعتماد'}</button>}
                    <button disabled={saving} onClick={() => void act(row, 'reject')} className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-50">رفض</button>
                  </div>
                ) : null) },
              ]}
            />
          </div>
        )}

      </section>
    </>
  );
}
