import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Link from 'next/link';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

type TabKey =
  | 'revenue'
  | 'orders'
  | 'bookings'
  | 'providers'
  | 'patients'
  | 'finance'
  | 'insurance'
  | 'payments'
  | 'refunds'
  | 'payouts'
  | 'loyalty'
  | 'disputes'
  | 'audit'
  | 'ledger'
  | 'labs-turnaround';

const TABS: { key: TabKey; label: string; icon?: string }[] = [
  { key: 'revenue', label: 'الإيرادات' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'bookings', label: 'الحجوزات' },
  { key: 'providers', label: 'المزودون' },
  { key: 'patients', label: 'المرضى' },
  { key: 'finance', label: 'المالية (عمولات/ضريبة)' },
  { key: 'insurance', label: 'التأمين' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'refunds', label: 'الاسترداد' },
  { key: 'payouts', label: 'السحوبات' },
  { key: 'loyalty', label: 'الولاء' },
  { key: 'disputes', label: 'النزاعات' },
  { key: 'audit', label: 'سجل الإدارة' },
  { key: 'ledger', label: 'دفتر الأستاذ' },
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
  payments: ['day', 'gateway', 'status'],
  refunds: ['day', 'method'],
  payouts: ['day', 'state'],
  loyalty: ['day'],
  disputes: ['day', 'category', 'status'],
  audit: ['day', 'action'],
  ledger: ['day', 'type'],
  'labs-turnaround': ['day'],
};

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

export default function ReportsIndexPage() {
  const [tab, setTab] = useState<TabKey>('revenue');
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState('day');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
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

  type Row = {
    bucket?: string;
    kind?: string;
    type?: string;
    count?: number;
    gross?: number;
    refunded?: number;
    net?: number;
    total?: number;
    copay?: number;
    status?: string;
    gateway?: string;
    method?: string;
    state?: string;
    category?: string;
    action?: string;
    avg_hours?: number;
    points?: number;
    discount_sar?: number;
    earned?: number;
    user_id?: string;
    source?: string;
  };

  const valueOf = (r: Row) => r.net ?? r.total ?? r.copay ?? r.gross ?? r.count ?? r.avg_hours ?? 0;

  const csvHref = `/api/admin/admin/reports/${tab}${toQuery({ from, to, group_by: groupBy, format: 'csv' })}`;
  const xlsxHref = `/api/admin/admin/reports/${tab}${toQuery({ from, to, group_by: groupBy, format: 'xlsx' })}`;

  const hasCol = (rows: Row[], key: keyof Row) => rows.some((r) => r[key] !== undefined);

  const renderCell = (r: Row, key: keyof Row) => {
    const val = r[key];
    if (val === undefined) return '—';
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  return (
    <>
      <Head><title>التقارير التشغيلية | نبض بلس</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">التقارير التشغيلية</h1>
            <p className="mt-1 text-sm text-slate-500">تجميعات حية من قاعدة البيانات — بلا ثوابت.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={csvHref} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تصدير CSV</a>
            <a href={xlsxHref} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">تصدير XLSX</a>
            {CONSOLES[tab] && <Link href={CONSOLES[tab]!.href} className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700">{CONSOLES[tab]!.label}</Link>}
          </div>
        </header>

        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 md:pb-0">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap ${tab === t.key ? 'bg-teal-700 text-white' : 'bg-white border'}`}>
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

        {loading ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ إنشاء التقرير…</p>
        ) : (
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
                    {hasCol(rows, 'kind') && <th className="p-2">النوع</th>}
                    {hasCol(rows, 'type') && <th className="p-2">النوع</th>}
                    {hasCol(rows, 'status') && <th className="p-2">الحالة</th>}
                    {hasCol(rows, 'gateway') && <th className="p-2">البوابة</th>}
                    {hasCol(rows, 'method') && <th className="p-2">الطريقة</th>}
                    {hasCol(rows, 'state') && <th className="p-2">الحالة</th>}
                    {hasCol(rows, 'category') && <th className="p-2">الفئة</th>}
                    {hasCol(rows, 'action') && <th className="p-2">الإجراء</th>}
                    <th className="p-2">الفئة</th>
                    {hasCol(rows, 'count') && <th className="p-2">العدد</th>}
                    {hasCol(rows, 'gross') && <th className="p-2">الإجمالي</th>}
                    {hasCol(rows, 'refunded') && <th className="p-2">المسترد</th>}
                    {hasCol(rows, 'net') && <th className="p-2">الصافي</th>}
                    {hasCol(rows, 'total') && <th className="p-2">المجموع</th>}
                    {hasCol(rows, 'copay') && <th className="p-2">كوباي</th>}
                    {hasCol(rows, 'avg_hours') && <th className="p-2">متوسط الساعات</th>}
                    {hasCol(rows, 'points') && <th className="p-2">النقاط</th>}
                    {hasCol(rows, 'discount_sar') && <th className="p-2">خصم ريال</th>}
                    {hasCol(rows, 'earned') && <th className="p-2">مكتسب</th>}
                    {CONSOLES[tab] && <th className="p-2">تفاصيل</th>}
                  </tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        {hasCol(rows, 'kind') && <td className="p-2">{renderCell(r, 'kind')}</td>}
                        {hasCol(rows, 'type') && <td className="p-2">{renderCell(r, 'type')}</td>}
                        {hasCol(rows, 'status') && <td className="p-2">{renderCell(r, 'status')}</td>}
                        {hasCol(rows, 'gateway') && <td className="p-2">{renderCell(r, 'gateway')}</td>}
                        {hasCol(rows, 'method') && <td className="p-2">{renderCell(r, 'method')}</td>}
                        {hasCol(rows, 'state') && <td className="p-2">{renderCell(r, 'state')}</td>}
                        {hasCol(rows, 'category') && <td className="p-2">{renderCell(r, 'category')}</td>}
                        {hasCol(rows, 'action') && <td className="p-2">{renderCell(r, 'action')}</td>}
                        <td className="p-2">{renderCell(r, 'bucket')}</td>
                        {hasCol(rows, 'count') && <td className="p-2">{renderCell(r, 'count')}</td>}
                        {hasCol(rows, 'gross') && <td className="p-2">{renderCell(r, 'gross')}</td>}
                        {hasCol(rows, 'refunded') && <td className="p-2">{renderCell(r, 'refunded')}</td>}
                        {hasCol(rows, 'net') && <td className="p-2">{renderCell(r, 'net')}</td>}
                        {hasCol(rows, 'total') && <td className="p-2">{renderCell(r, 'total')}</td>}
                        {hasCol(rows, 'copay') && <td className="p-2">{renderCell(r, 'copay')}</td>}
                        {hasCol(rows, 'avg_hours') && <td className="p-2">{renderCell(r, 'avg_hours')}</td>}
                        {hasCol(rows, 'points') && <td className="p-2">{renderCell(r, 'points')}</td>}
                        {hasCol(rows, 'discount_sar') && <td className="p-2">{renderCell(r, 'discount_sar')}</td>}
                        {hasCol(rows, 'earned') && <td className="p-2">{renderCell(r, 'earned')}</td>}
                        {CONSOLES[tab] && <td className="p-2"><Link href={CONSOLES[tab]!.href} className="text-teal-700 underline">التفاصيل</Link></td>}
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