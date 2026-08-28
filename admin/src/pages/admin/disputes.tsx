import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage, toQuery } from '@/lib/admin-client';

type Dispute = { id: string; tracking_id?: string | null; patient: { id: string; name?: string | null; phone?: string | null }; category: string; subject?: string; message?: string; status: string; priority?: string; refunded_so_far: number; created_at?: string };
type DisputeResponse = { data: Dispute[]; total: number; page: number; pages: number };
type Decision = 'refund_full' | 'refund_partial' | 'reject' | 'close_no_action';

export default function DisputesPage() {
  const [result, setResult] = useState<DisputeResponse>({ data: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Dispute | null>(null);
  const [decision, setDecision] = useState<Decision>('reject');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setResult(await adminFetch<DisputeResponse>(`/disputes${toQuery({ status: 'open', q: query, page, limit: 25 })}`)); }
    catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل قائمة النزاعات.')); }
    finally { setLoading(false); }
  }, [page, query]);
  useEffect(() => { void load(); }, [load]);

  const financial = decision === 'refund_full' || decision === 'refund_partial';
  async function resolve() {
    if (!active) return;
    if (reason.trim().length < (financial ? 10 : 5)) { setError(financial ? 'سبب القرار المالي يجب أن يتكون من 10 أحرف على الأقل.' : 'سبب القرار يجب أن يتكون من 5 أحرف على الأقل.'); return; }
    if (financial && decision === 'refund_partial' && !(Number(amount) > 0)) { setError('أدخل مبلغ الاسترداد الجزئي.'); return; }
    if (!window.confirm('سيُسجّل القرار في سجل التدقيق وقد يضيف رصيداً حقيقياً إلى محفظة المريض. هل تريد المتابعة؟')) return;
    setSubmitting(true); setError('');
    try {
      await adminMutation(`/disputes/${active.id}/resolve`, 'POST', { decision, reason: reason.trim(), ...(decision === 'refund_partial' ? { amount: Number(amount) } : {}) });
      setActive(null); setReason(''); setAmount('');
      await load();
    } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تنفيذ قرار النزاع.')); }
    finally { setSubmitting(false); }
  }

  return <><Head><title>النزاعات | نبض</title></Head><section dir="rtl" className="p-6 md:p-8">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">مركز حل النزاعات</h1><p className="mt-1 text-sm text-slate-500">قرارات محمية بالصلاحيات ومُدققة؛ لا تُنفذ أي عملية مالية دون سبب موثق.</p></div><div className="flex gap-2"><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm" placeholder="بحث في العميل أو الموضوع"/><button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تحديث</button></div></header>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="min-w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-4">المعرّف</th><th className="p-4">المريض</th><th className="p-4">الموضوع</th><th className="p-4">التصنيف</th><th className="p-4">استرداد سابق</th><th className="p-4">الإجراء</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">جارٍ تحميل النزاعات…</td></tr> : result.data.length ? result.data.map((item) => <tr className="border-t" key={item.id}><td className="p-4 font-mono text-xs">{item.tracking_id || item.id}</td><td className="p-4">{item.patient.name || item.patient.id}<p className="text-xs text-slate-500">{item.patient.phone || ''}</p></td><td className="max-w-sm p-4"><p className="font-medium">{item.subject || '—'}</p><p className="truncate text-xs text-slate-500">{item.message || ''}</p></td><td className="p-4">{item.category}</td><td className="p-4">{item.refunded_so_far.toLocaleString('ar-SA')} ر.س</td><td className="p-4"><button onClick={() => { setActive(item); setDecision('reject'); setReason(''); setAmount(''); }} className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">مراجعة</button></td></tr>) : <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد نزاعات مفتوحة مطابقة.</td></tr>}</tbody></table></div>
    <div className="mt-4 flex justify-between text-sm"><span>الإجمالي: {result.total}</span><div className="flex gap-2"><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>السابق</button><span>{result.page} / {result.pages || 1}</span><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page >= (result.pages || 1) || loading} onClick={() => setPage((value) => value + 1)}>التالي</button></div></div>
    {active ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">قرار النزاع</h2><p className="mt-1 text-sm text-slate-500">{active.subject || active.id}</p><div className="mt-5 space-y-4"><label className="block text-sm font-medium">القرار<select value={decision} onChange={(event) => setDecision(event.target.value as Decision)} className="mt-1 w-full rounded-lg border p-2"><option value="reject">رفض الاعتراض</option><option value="close_no_action">إغلاق بلا إجراء مالي</option><option value="refund_full">استرداد كامل إلى المحفظة</option><option value="refund_partial">استرداد جزئي إلى المحفظة</option></select></label>{decision === 'refund_partial' ? <label className="block text-sm font-medium">المبلغ (ر.س)<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-lg border p-2" /></label> : null}<label className="block text-sm font-medium">سبب القرار<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-2" required /></label><div className="flex justify-end gap-2"><button onClick={() => setActive(null)} className="rounded border px-4 py-2">إلغاء</button><button disabled={submitting} onClick={() => void resolve()} className="rounded bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-50">{submitting ? 'جارٍ الحفظ…' : 'تأكيد القرار'}</button></div></div></div></div> : null}
  </section></>;
}
