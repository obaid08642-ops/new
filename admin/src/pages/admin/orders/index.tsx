import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

type Order = { id: string; kind: string; status: string; patient?: { id?: string; name?: string; phone?: string }; provider?: { id?: string; name?: string }; amount?: number; currency?: string; created_at?: string; sla_due_at?: string };
type OrdersResponse = { data: Order[]; total: number; page: number; pages: number };
const kinds = ['', 'pharmacy', 'lab', 'radiology', 'nursing'];

export default function OrdersConsolePage() {
  const [result, setResult] = useState<OrdersResponse>({ data: [], total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ kind: '', status: '', q: '', from: '', to: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setResult(await adminFetch<OrdersResponse>(`/orders${toQuery({ ...filters, page, limit: 25 })}`)); }
    catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل الطلبات.')); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { void load(); }, [load]);

  function update(name: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }
  function exportUrl() { return `/api/admin/orders/export${toQuery(filters)}`; }

  return <><Head><title>دورة الطلبات | نبض</title></Head><section dir="rtl" className="p-6 md:p-8">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">دورة الطلبات الموحدة</h1><p className="mt-1 text-sm text-slate-500">بحث وفرز وتصفية من الخادم لجميع أنواع الطلبات دون كشف حالات مصطنعة.</p></div><a href={exportUrl()} className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800">تصدير CSV</a></header>
    <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-6"><input value={filters.q} onChange={(e) => update('q', e.target.value)} className="rounded-lg border px-3 py-2 text-sm" placeholder="بحث بالمعرّف أو العميل"/><select value={filters.kind} onChange={(e) => update('kind', e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">كل الأنواع</option>{kinds.slice(1).map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select><input value={filters.status} onChange={(e) => update('status', e.target.value)} className="rounded-lg border px-3 py-2 text-sm" placeholder="الحالة"/><label className="text-xs text-slate-500">من<input type="date" value={filters.from} onChange={(e) => update('from', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label><label className="text-xs text-slate-500">إلى<input type="date" value={filters.to} onChange={(e) => update('to', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label><select value={filters.sort} onChange={(e) => update('sort', e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option><option value="amount_asc">القيمة تصاعدياً</option><option value="amount_desc">القيمة تنازلياً</option></select></div>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="min-w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-4">الطلب</th><th className="p-4">النوع والحالة</th><th className="p-4">المريض</th><th className="p-4">المزوّد</th><th className="p-4">المبلغ</th><th className="p-4">SLA</th><th className="p-4">إجراء</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">جارٍ تحميل الطلبات…</td></tr> : result.data.length ? result.data.map((order) => <tr key={`${order.kind}:${order.id}`} className="border-t"><td className="p-4 font-mono text-xs">{order.id}<p className="mt-1 text-slate-500">{order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : '—'}</p></td><td className="p-4"><p className="font-bold">{order.kind}</p><p className="text-xs text-slate-500">{order.status}</p></td><td className="p-4">{order.patient?.name || order.patient?.id || '—'}<p className="text-xs text-slate-500">{order.patient?.phone || ''}</p></td><td className="p-4">{order.provider?.name || order.provider?.id || '—'}</td><td className="p-4 font-bold">{typeof order.amount === 'number' ? `${order.amount.toLocaleString('ar-SA')} ${order.currency || 'ر.س'}` : '—'}</td><td className="p-4 text-xs">{order.sla_due_at ? new Date(order.sla_due_at).toLocaleString('ar-SA') : '—'}</td><td className="p-4"><Link href={`/admin/orders/${encodeURIComponent(order.kind)}/${encodeURIComponent(order.id)}`} className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">فتح التفاصيل</Link></td></tr>) : <tr><td colSpan={7} className="p-10 text-center text-slate-500">لا توجد طلبات مطابقة للفلاتر الحالية.</td></tr>}</tbody></table></div>
    <footer className="mt-4 flex justify-between text-sm"><span>الإجمالي: {result.total}</span><div className="flex gap-2"><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>السابق</button><span>{result.page} / {result.pages || 1}</span><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page >= (result.pages || 1) || loading} onClick={() => setPage((value) => value + 1)}>التالي</button></div></footer>
  </section></>;
}
