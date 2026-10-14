import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminFetch, adminMutation, apiErrorMessage, toQuery } from '@/lib/admin-client';
import { DataTable } from '@/components/DataTable';

type Revenue = { granularity: string; range: { from: string; to: string }; series: Array<Record<string, string | number>>; mom: Array<{ vertical: string; current: number; previous: number; delta_pct: number | null }>; refunds: { gateway_refunded: number; wallet_credits_issued: number }; totals: Record<string, number> };
type Commissions = { config_used: { rates: Record<string, number>; vat_rate: number; source: string }; by_vertical: Record<string, { gross: number; commission: number; vat: number; net_to_provider: number; count: number }>; totals: { gross: number; commission: number; vat: number; net_to_provider: number; count: number } };
type Reconciliation = { date: string; gateway_total_sar: number; platform_total_sar: number; variance_sar: number; gateway_rows: Array<{ kind: string; total: number; count: number }>; platform_rows: Array<{ vertical: string; total: number; n: number }>; note: string };
type Payout = { id: string; provider_id?: string; amount?: number; state?: string; createdAt?: string; approved_stage_one_name?: string };
type Payouts = { data: Payout[]; total: number; page: number; pages: number; dual_approval_threshold_sar: number };
type ProviderStatement = { provider_id: string; summary: Record<string, number>; balance_available: number; ledger: Array<Record<string, any>>; payouts: Array<Record<string, any>> };
const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const colors = ['#0f766e', '#0284c7', '#7c3aed', '#d97706', '#db2777', '#475569'];

export default function FinanceSuitePage() {
  const [from, setFrom] = useState(monthAgo); const [to, setTo] = useState(today); const [granularity, setGranularity] = useState('day');
  const [revenue, setRevenue] = useState<Revenue | null>(null); const [commissions, setCommissions] = useState<Commissions | null>(null); const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null); const [payouts, setPayouts] = useState<Payouts | null>(null);
  const [providerId, setProviderId] = useState(''); const [statement, setStatement] = useState<ProviderStatement | null>(null); const [reason, setReason] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [ratesText, setRatesText] = useState('{}'); const [vatRate, setVatRate] = useState('0.15');

  const load = useCallback(async () => { setLoading(true); setError(''); try { const [r, c, recon, p] = await Promise.all([adminFetch<Revenue>(`/api/admin/admin/finance/revenue${toQuery({ from, to, granularity })}`), adminFetch<Commissions>(`/api/admin/admin/finance/commissions${toQuery({ from, to })}`), adminFetch<Reconciliation>(`/api/admin/admin/finance/reconciliation${toQuery({ date: to })}`), adminFetch<Payouts>('/api/admin/admin/finance/payouts?status=PENDING_ADMIN_APPROVAL&page=1&limit=25')]); setRevenue(r); setCommissions(c); setReconciliation(recon); setPayouts(p); setRatesText(JSON.stringify(c.config_used?.rates ?? {}, null, 2)); setVatRate(String(c.config_used?.vat_rate ?? 0.15)); } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل بيانات المالية.')); } finally { setLoading(false); } }, [from, to, granularity]);
  useEffect(() => { void load(); }, [load]);
  const seriesKeys = useMemo(() => revenue ? [...new Set(revenue.series.flatMap((row) => Object.keys(row).filter((key) => key !== 'bucket' && key !== 'total')))] : [], [revenue]);

  async function saveConfig(event: React.FormEvent) { event.preventDefault(); if (reason.trim().length < 10) { setError('سبب تغيير الإعدادات المالية يجب ألا يقل عن عشرة أحرف.'); return; } let rates: Record<string, number>; try { rates = JSON.parse(ratesText); } catch { setError('صيغة نسب العمولات يجب أن تكون JSON صالحاً.'); return; } setSaving(true); try { await adminMutation('/api/admin/admin/finance/commissions/config', 'POST', { rates, vat_rate: Number(vatRate), reason: reason.trim() }); setReason(''); await load(); } catch (cause) { setError(apiErrorMessage(cause, 'تعذر حفظ إعدادات العمولات.')); } finally { setSaving(false); } }
  async function payoutDecision(item: Payout, decision: 'approve' | 'reject') { const decisionReason = window.prompt(`سبب ${decision === 'approve' ? 'الاعتماد' : 'الرفض'} (10 أحرف على الأقل):`); if (!decisionReason || decisionReason.trim().length < 10) return; if (!window.confirm('هذا قرار مالي مسجل في التدقيق. متابعة؟')) return; setSaving(true); try { await adminMutation(`/api/admin/admin/finance/payouts/${encodeURIComponent(item.id)}/${decision}`, 'POST', { reason: decisionReason.trim() }); await load(); } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تنفيذ قرار الدفعة.')); } finally { setSaving(false); } }
  async function loadStatement(event: React.FormEvent) { event.preventDefault(); if (!providerId.trim()) return; setSaving(true); try { setStatement(await adminFetch<ProviderStatement>(`/api/admin/admin/finance/providers/${encodeURIComponent(providerId.trim())}/statement${toQuery({ from, to })}`)); } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل كشف المزود.')); } finally { setSaving(false); } }

  return <><Head><title>المالية والتسويات | نبض</title></Head><section dir="rtl" className="space-y-6 p-6 md:p-8"><header><h1 className="text-3xl font-bold">المالية والتسويات</h1><p className="mt-1 text-sm text-slate-500">كل مبالغ VAT والعمولات والتسويات مصدرها تجميعات وإعدادات الخادم.</p></header>
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"><label className="text-xs text-slate-500">من<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs text-slate-500">إلى<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs text-slate-500">التجميع<select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="day">يومي</option><option value="week">أسبوعي</option><option value="month">شهري</option></select></label><button onClick={() => void load()} className="self-end rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تحديث</button></div>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل المؤشرات المالية…</p> : <><article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">الإيراد حسب العمودي</h2><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenue?.series || []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="bucket"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={3}/>{seriesKeys.map((key, index) => <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} />)}</LineChart></ResponsiveContainer></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3 text-sm">استرداد البوابة: <strong>{revenue?.refunds.gateway_refunded ?? 0} ر.س</strong></div><div className="rounded-lg bg-slate-50 p-3 text-sm">رصيد محفظة صادر: <strong>{revenue?.refunds.wallet_credits_issued ?? 0} ر.س</strong></div><div className="rounded-lg bg-slate-50 p-3 text-sm">الفترة: <strong>{from} — {to}</strong></div></div></article>
    <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">مقارنة الفترة السابقة</h2><div className="mt-4 overflow-x-auto"><DataTable
  bare
  dense
  rows={revenue?.mom || []}
  getRowKey={(row) => row.vertical}
  columns={[
    { key: 'v', header: 'العمودي', render: (row) => row.vertical },
    { key: 'cur', header: 'الحالي', render: (row) => `${row.current} ر.س` },
    { key: 'prev', header: 'السابق', render: (row) => `${row.previous} ر.س` },
    { key: 'delta', header: 'التغير', render: (row) => (row.delta_pct === null ? 'لا توجد مقارنة' : `${row.delta_pct}%`) },
  ]}
/></div></article>
    <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">العمولات وVAT</h2><p className="mt-1 text-xs text-slate-500">المصدر: {commissions?.config_used.source || '—'}</p><div className="mt-4 overflow-x-auto"><DataTable
  bare
  dense
  rows={Object.entries(commissions?.by_vertical || {})}
  getRowKey={([name]) => name}
  columns={[
    { key: 'v', header: 'العمودي', render: ([name]) => name },
    { key: 'gross', header: 'الإجمالي', render: ([, row]) => row.gross },
    { key: 'comm', header: 'العمولة', render: ([, row]) => row.commission },
    { key: 'vat', header: 'VAT', render: ([, row]) => row.vat },
    { key: 'net', header: 'صافي المزود', render: ([, row]) => row.net_to_provider },
  ]}
/></div><form onSubmit={saveConfig} className="mt-5 grid gap-3 rounded-xl bg-amber-50 p-4 md:grid-cols-2"><label className="text-sm">نسب العمولات (JSON)<textarea value={ratesText} onChange={(e) => setRatesText(e.target.value)} className="mt-1 min-h-28 w-full rounded border p-2 font-mono text-xs"/></label><div className="space-y-3"><label className="block text-sm">نسبة VAT<input value={vatRate} onChange={(e) => setVatRate(e.target.value)} type="number" min="0" max="0.5" step="0.001" className="mt-1 w-full rounded border p-2"/></label><label className="block text-sm">سبب التغيير<textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={10} className="mt-1 min-h-20 w-full rounded border p-2"/></label><button disabled={saving} className="rounded bg-amber-700 px-4 py-2 font-bold text-white disabled:opacity-50">حفظ وتدقيق الإعدادات</button></div></form></article>
    <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">تسوية Moyasar مقابل المنصة</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3">Moyasar: <strong>{reconciliation?.gateway_total_sar ?? 0} ر.س</strong></div><div className="rounded-lg bg-slate-50 p-3">المنصة: <strong>{reconciliation?.platform_total_sar ?? 0} ر.س</strong></div><div className={`rounded-lg p-3 ${reconciliation?.variance_sar ? 'bg-rose-50 text-rose-800' : 'bg-teal-50 text-teal-800'}`}>الفرق: <strong>{reconciliation?.variance_sar ?? 0} ر.س</strong></div></div><p className="mt-3 text-xs text-slate-500">{reconciliation?.note}</p></article>
    <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">دفعات المزودين</h2><p className="mt-1 text-xs text-slate-500">حد الاعتماد الثنائي: {payouts?.dual_approval_threshold_sar ?? '—'} ر.س. لا يسمح backend بالاعتماد الذاتي أو اعتمادين من نفس المدير.</p><div className="mt-4 overflow-x-auto"><DataTable
  bare
  dense
  rows={payouts?.data ?? []}
  getRowKey={(row) => row.id}
  emptyText="لا توجد دفعات معلقة."
  columns={[
    { key: 'id', header: 'الدفعة', className: 'font-mono text-xs', render: (row) => row.id },
    { key: 'provider', header: 'المزوّد', render: (row) => row.provider_id || '—' },
    { key: 'amount', header: 'المبلغ', render: (row) => `${row.amount ?? '—'} ر.س` },
    { key: 'state', header: 'الحالة', render: (row) => `${row.state || '—'} ${row.approved_stage_one_name ? `· ${row.approved_stage_one_name}` : ''}` },
    { key: 'actions', header: 'الإجراء', actions: true, render: (row) => (
      <div className="flex gap-2"><button disabled={saving} onClick={() => void payoutDecision(row, 'approve')} className="rounded bg-teal-700 px-2 py-1 text-xs text-white">اعتماد</button><button disabled={saving} onClick={() => void payoutDecision(row, 'reject')} className="rounded border px-2 py-1 text-xs">رفض</button></div>
    ) },
  ]}
/></div></article>
    <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">كشف حساب مزود</h2><form onSubmit={loadStatement} className="mt-3 flex flex-wrap gap-2"><input value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="معرّف المزوّد" dir="ltr" className="rounded-lg border px-3 py-2 text-sm"/><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">عرض الكشف</button></form>{statement ? <div className="mt-4"><p className="font-bold">الرصيد المتاح: {statement.balance_available} ر.س</p><div className="mt-3 grid gap-2 text-sm md:grid-cols-4">{Object.entries(statement.summary).map(([key, value]) => <div key={key} className="rounded bg-slate-50 p-3"><span className="text-slate-500">{key}</span><strong className="block">{value} ر.س</strong></div>)}</div></div> : null}</article></>}
  </section></>;
}
