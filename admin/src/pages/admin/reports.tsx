import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

type TabKey = 'revenue' | 'orders' | 'bookings' | 'providers' | 'patients' | 'finance' | 'insurance' | 'payments' | 'refunds' | 'payouts' | 'loyalty' | 'disputes' | 'audit' | 'ledger' | 'labs-turnaround';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'revenue', label: 'الإيرادات' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'bookings', label: 'الحجوزات' },
  { key: 'providers', label: 'المزودون' },
  { key: 'patients', label: 'المرضى' },
  { key: 'finance', label: 'المالية' },
  { key: 'insurance', label: 'التأمين' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'refunds', label: 'الاسترداد' },
  { key: 'payouts', label: 'السحوبات' },
  { key: 'loyalty', label: 'الولاء' },
  { key: 'disputes', label: 'النزاعات' },
  { key: 'audit', label: 'سجل الإدارة' },
  { key: 'ledger', label: 'الدفتر' },
  { key: 'labs-turnaround', label: 'زمن التحاليل' },
];
const GROUPS: Record<TabKey, string[]> = {
  revenue: ['day', 'service', 'gateway'],
  orders: ['day', 'status'],
  bookings: ['day', 'service', 'status'],
  providers: ['type', 'day'],
  patients: ['day'],
  finance: ['day'],
  insurance: ['state', 'day'],
  payments: ['day'],
  refunds: ['day'],
  payouts: ['day'],
  loyalty: ['day'],
  disputes: ['day'],
  audit: ['day'],
  ledger: ['day'],
  'labs-turnaround': ['day'],
};

/** P6.x-1: operational reports over live aggregates + CSV export. */
/** B2: every report tab links to the console where a row drills into its entity. */
const CONSOLES: Partial<Record<TabKey, { href: string; label: string }>> = {
  orders: { href: '/admin/orders', label: 'فتح سجل الطلبات' },
  bookings: { href: '/admin/appointments-oversight', label: 'فتح المواعيد' },
  providers: { href: '/admin/provider-moderation', label: 'فتح المزودين' },
  patients: { href: '/admin/users-management', label: 'فتح المستخدمين' },
  finance: { href: '/admin/finance-suite', label: 'فتح المالية' },
  payouts: { href: '/admin/payouts', label: 'فتح السحوبات' },
  refunds: { href: '/admin/returns', label: 'فتح الإرجاع' },
  insurance: { href: '/admin/insurance-queue', label: 'فتح التأمين' },
  disputes: { href: '/admin/disputes', label: 'فتح النزاعات' },
  loyalty: { href: '/admin/loyalty-config', label: 'فتح الولاء' },
  audit: { href: '/admin/audit-logs', label: 'فتح سجل الإدارة' },
};
export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('revenue');
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState('day');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // On a tab switch groupBy still holds the previous tab's value for one render; never send it.
      const g = GROUPS[tab].includes(groupBy) ? groupBy : GROUPS[tab][0];
      const r: any = await adminFetch(`/api/admin/admin/reports/${tab}${toQuery({ from, to, group_by: g })}`);
      setRows(Array.isArray(r?.rows) ? r.rows : []);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل التقرير.'));
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, groupBy]);

  useEffect(() => { setGroupBy(GROUPS[tab][0]); }, [tab]);
  useEffect(() => { void load(); }, [load]);

  type Row = { bucket?: string; kind?: string; type?: string; count?: number; gross?: number; refunded?: number; net?: number; total?: number; copay?: number };
  const valueOf = (r: Row) => r.net ?? r.total ?? r.copay ?? r.gross ?? r.count ?? 0;
  const csvHref = `/api/admin/admin/reports/${tab}${toQuery({ from, to, group_by: groupBy, format: 'csv' })}`;
  const xlsxHref = `/api/admin/admin/reports/${tab}${toQuery({ from, to, group_by: groupBy, format: 'xlsx' })}`;

  return (
    <>
      <Head><title>التقارير | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">التقارير التشغيلية</h1>
            <p className="mt-1 text-sm text-slate-500">تجميعات حية من قاعدة البيانات — بلا ثوابت.</p>
          </div>
          <a href={csvHref} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تصدير CSV</a>
          <a href={xlsxHref} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">تصدير XLSX</a>
          {CONSOLES[tab] ? <a href={CONSOLES[tab]!.href} className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700">{CONSOLES[tab]!.label}</a> : null}
        </header>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === t.key ? 'bg-teal-700 text-white' : 'bg-white border'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4">
          <label className="text-xs text-slate-500">من<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
          <label className="text-xs text-slate-500">إلى<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
          <label className="text-xs text-slate-500">تجميع حسب
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">
              {GROUPS[tab].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <button onClick={() => void load()} className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">تحديث</button>
        </div>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ إنشاء التقرير…</p> : (
          <>
            <article className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.map((r) => ({ name: r.kind ? `${r.kind}/${r.bucket}` : r.bucket, value: valueOf(r) }))}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="value" fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead><tr className="border-b text-slate-500">
                    {rows.some((r) => r.kind !== undefined || r.type !== undefined) && <th className="p-2">النوع</th>}
                    <th className="p-2">الفئة</th>
                    {rows.some((r) => r.count !== undefined) && <th className="p-2">العدد</th>}
                    {rows.some((r) => r.gross !== undefined) && <th className="p-2">الإجمالي</th>}
                    {rows.some((r) => r.refunded !== undefined) && <th className="p-2">المسترد</th>}
                    {rows.some((r) => r.net !== undefined) && <th className="p-2">الصافي</th>}
                    {rows.some((r) => r.total !== undefined) && <th className="p-2">المجموع</th>}
                    {rows.some((r) => r.copay !== undefined) && <th className="p-2">كوباي</th>}
                  </tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b">
                        {rows.some((x) => x.kind !== undefined || x.type !== undefined) && <td className="p-2">{r.kind || r.type || '—'}</td>}
                        <td className="p-2">{r.bucket || '—'}</td>
                        {rows.some((x) => x.count !== undefined) && <td className="p-2">{r.count ?? '—'}</td>}
                        {rows.some((x) => x.gross !== undefined) && <td className="p-2">{r.gross ?? '—'}</td>}
                        {rows.some((x) => x.refunded !== undefined) && <td className="p-2">{r.refunded ?? '—'}</td>}
                        {rows.some((x) => x.net !== undefined) && <td className="p-2">{r.net ?? '—'}</td>}
                        {rows.some((x) => x.total !== undefined) && <td className="p-2">{r.total ?? '—'}</td>}
                        {rows.some((x) => x.copay !== undefined) && <td className="p-2">{r.copay ?? '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}
      </section>
    </>
  );
}
