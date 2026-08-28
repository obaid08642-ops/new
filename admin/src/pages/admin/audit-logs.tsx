import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

type AuditLog = {
  id: string;
  action: string;
  actor?: { id?: string; full_name?: string; email?: string };
  target_type?: string;
  target_id?: string;
  reason?: string;
  createdAt?: string;
};

type AuditResponse = { data: AuditLog[]; total: number; page: number; pages: number };

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditResponse>({ data: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await adminFetch<AuditResponse>(`/audit${toQuery({ page, limit: 25, action })}`);
      setData(result);
    } catch (reason) {
      setError(apiErrorMessage(reason, 'تعذر تحميل سجل التدقيق.'));
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => { void load(); }, [load]);

  return <>
    <Head><title>سجل التدقيق | نبض</title></Head>
    <section dir="rtl" className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">سجل التدقيق</h1><p className="mt-1 text-sm text-slate-500">سجل خادمي غير قابل للتلاعب لعمليات الإدارة المؤثرة.</p></div>
        <div className="flex gap-2"><input className="rounded-lg border px-3 py-2 text-sm" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="تصفية باسم الإجراء" /><button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تحديث</button></div>
      </div>
      {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-4">الوقت</th><th className="p-4">المنفّذ</th><th className="p-4">الإجراء</th><th className="p-4">المورد</th><th className="p-4">السبب</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="p-10 text-center text-slate-500">جارٍ تحميل السجل…</td></tr> : data.data.length ? data.data.map((row) => <tr key={row.id} className="border-t"><td className="p-4 text-xs text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString('ar-SA') : '—'}</td><td className="p-4">{row.actor?.full_name || row.actor?.email || row.actor?.id || '—'}</td><td className="p-4 font-medium">{row.action}</td><td className="p-4">{row.target_type || '—'} {row.target_id || ''}</td><td className="p-4 text-slate-600">{row.reason || '—'}</td></tr>) : <tr><td colSpan={5} className="p-10 text-center text-slate-500">لا توجد نتائج مطابقة.</td></tr>}</tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm"><span>إجمالي السجلات: {data.total}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">السابق</button><span className="px-2">{data.page} / {data.pages || 1}</span><button disabled={page >= (data.pages || 1) || loading} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">التالي</button></div></div>
    </section>
  </>;
}
