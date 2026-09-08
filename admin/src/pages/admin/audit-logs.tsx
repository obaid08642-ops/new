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
  const [adminId, setAdminId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = { page, limit: 25, action, admin_id: adminId, target_type: targetType, target_id: targetId, from, to };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await adminFetch<AuditResponse>(`/audit${toQuery(filters)}`);
      setData(result);
    } catch (reason) {
      setError(apiErrorMessage(reason, 'تعذر تحميل سجل التدقيق.'));
    } finally {
      setLoading(false);
    }
  }, [action, adminId, targetType, targetId, from, to, page]);

  function exportCsv() {
    const header = ['time', 'actor', 'action', 'target_type', 'target_id', 'reason'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [header.join(',')].concat(data.data.map((row) => [
      row.createdAt || '',
      row.actor?.full_name || row.actor?.email || row.actor?.id || '',
      row.action,
      row.target_type || '',
      row.target_id || '',
      row.reason || '',
    ].map(escape).join(',')));
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audit-log-p${data.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { void load(); }, [load]);

  return <>
    <Head><title>سجل التدقيق | نبض</title></Head>
    <section dir="rtl" className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">سجل التدقيق</h1><p className="mt-1 text-sm text-slate-500">سجل خادمي غير قابل للتلاعب لعمليات الإدارة المؤثرة.</p></div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border px-3 py-2 text-sm" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="تصفية باسم الإجراء" />
          <input className="rounded-lg border px-3 py-2 text-sm" value={adminId} onChange={(e) => { setAdminId(e.target.value); setPage(1); }} placeholder="معرّف المنفّذ" />
          <input className="rounded-lg border px-3 py-2 text-sm" value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }} placeholder="نوع المورد" />
          <input className="rounded-lg border px-3 py-2 text-sm" value={targetId} onChange={(e) => { setTargetId(e.target.value); setPage(1); }} placeholder="معرّف المورد" />
          <label className="text-xs text-slate-500">من<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
          <label className="text-xs text-slate-500">إلى<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
          <button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تحديث</button>
          <button onClick={exportCsv} disabled={!data.data.length} className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-40">تصدير CSV (الصفحة الحالية)</button>
        </div>
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
