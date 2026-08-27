import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';

type Detail = { kind: string; kind_label_ar?: string; order: Record<string, any>; timeline: Array<{ at?: string; from?: string; to?: string; note?: string; by_user_id?: string }>; payments: Array<Record<string, any>>; financials: { gross_paid: number; refunded_total: number; refundable_max: number }; refunds: Array<{ amount: number; description?: string; createdAt?: string }> };
type Action = 'cancel' | 'refund' | 'compensate' | 'reassign' | 'sla-extend' | 'note';

const labels: Record<Action, string> = { cancel: 'إلغاء الطلب', refund: 'استرداد إلى المحفظة', compensate: 'تعويض محفظة', reassign: 'إعادة إسناد مزوّد', 'sla-extend': 'تمديد SLA', note: 'إضافة ملاحظة داخلية' };

export default function OrderDetailPage() {
  const router = useRouter();
  const kind = typeof router.query.kind === 'string' ? router.query.kind : '';
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [providerId, setProviderId] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!kind || !id) return;
    setLoading(true); setError('');
    try { setDetail(await adminFetch<Detail>(`/orders/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`)); }
    catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل تفاصيل الطلب.')); }
    finally { setLoading(false); }
  }, [kind, id]);
  useEffect(() => { void load(); }, [load]);

  function open(next: Action) { setAction(next); setReason(''); setAmount(''); setProviderId(''); setHours(''); setNote(''); }
  async function submit() {
    if (!action || !detail) return;
    const requiredReason = action === 'refund' || action === 'compensate' ? 10 : 5;
    const text = action === 'note' ? note : reason;
    if (text.trim().length < requiredReason) { setError(`النص المطلوب يجب ألا يقل عن ${requiredReason} أحرف.`); return; }
    if (['compensate'].includes(action) && !(Number(amount) > 0)) { setError('أدخل مبلغاً صحيحاً.'); return; }
    if (action === 'refund' && amount && (!(Number(amount) > 0) || Number(amount) > detail.financials.refundable_max)) { setError('مبلغ الاسترداد يتجاوز الرصيد القابل للاسترداد.'); return; }
    if (action === 'reassign' && !providerId.trim()) { setError('معرّف المزوّد الجديد مطلوب.'); return; }
    if (action === 'sla-extend' && (!(Number(hours) >= 1) || Number(hours) > 72)) { setError('تمديد SLA يجب أن يكون بين ساعة و72 ساعة.'); return; }
    if (!window.confirm(`سيُنفذ إجراء «${labels[action]}» ويُسجل في سجل التدقيق. متابعة؟`)) return;
    setSubmitting(true); setError('');
    try {
      const body = action === 'note' ? { note: note.trim() } : { reason: reason.trim(), ...(action === 'refund' ? { mode: amount ? 'partial' : 'full', ...(amount ? { amount: Number(amount) } : {}) } : {}), ...(action === 'compensate' ? { amount: Number(amount) } : {}), ...(action === 'reassign' ? { provider_id: providerId.trim() } : {}), ...(action === 'sla-extend' ? { hours: Number(hours) } : {}) };
      await adminMutation(`/orders/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/${action}`, 'POST', body);
      setAction(null); await load();
    } catch (cause) { setError(apiErrorMessage(cause, `تعذر تنفيذ «${labels[action]}».`)); }
    finally { setSubmitting(false); }
  }

  const order = detail?.order || {};
  return <><Head><title>تفاصيل الطلب | نبض</title></Head><section dir="rtl" className="p-6 md:p-8"><div className="mb-6 flex items-center justify-between"><div><Link href="/admin/orders" className="text-sm text-teal-700">العودة إلى الطلبات</Link><h1 className="mt-2 text-3xl font-bold">{detail?.kind_label_ar || kind || 'الطلب'} <span className="font-mono text-lg text-slate-500">{id}</span></h1></div><button onClick={() => void load()} className="rounded-lg border px-4 py-2 text-sm">تحديث</button></div>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل تفاصيل الطلب…</p> : !detail ? null : <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">بيانات الطلب</h2><dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">{Object.entries(order).filter(([key]) => !['_id', '__v', 'state_history', 'internal_notes'].includes(key)).map(([key, value]) => <div key={key} className="border-b pb-2"><dt className="text-xs text-slate-500">{key}</dt><dd className="mt-1 break-words font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</dd></div>)}</dl></article>
      <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">الخط الزمني</h2><ol className="mt-4 space-y-4 border-r pr-5">{detail.timeline.length ? detail.timeline.map((entry, index) => <li key={index} className="relative"><span className="absolute -right-[29px] top-1 h-3 w-3 rounded-full bg-teal-600"/><p className="font-medium">{entry.from || '—'} ← {entry.to || '—'}</p><p className="text-sm text-slate-600">{entry.note || '—'}</p><p className="mt-1 text-xs text-slate-500">{entry.at ? new Date(entry.at).toLocaleString('ar-SA') : '—'} · {entry.by_user_id || '—'}</p></li>) : <li className="text-sm text-slate-500">لا توجد أحداث مسجلة.</li>}</ol></article>
      <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">المدفوعات والاستردادات</h2><dl className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div><dt className="text-slate-500">المدفوع المؤكد</dt><dd className="text-lg font-bold">{detail.financials.gross_paid} ر.س</dd></div><div><dt className="text-slate-500">المسترد</dt><dd className="text-lg font-bold">{detail.financials.refunded_total} ر.س</dd></div><div><dt className="text-slate-500">القابل للاسترداد</dt><dd className="text-lg font-bold text-teal-700">{detail.financials.refundable_max} ر.س</dd></div></dl><div className="mt-4 overflow-x-auto"><table className="min-w-full text-right text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">الحالة</th><th className="p-2">المبلغ</th><th className="p-2">المرجع</th></tr></thead><tbody>{detail.payments.map((payment, index) => <tr key={payment.id || index} className="border-b"><td className="p-2">{payment.status || '—'}</td><td className="p-2">{payment.amount ?? '—'}</td><td className="p-2 font-mono text-xs">{payment.id || payment.payment_id || '—'}</td></tr>)}</tbody></table></div></article></div>
      <aside className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">إجراءات محمية</h2><p className="mt-1 text-xs text-slate-500">كل إجراء يتطلب صلاحية، تأكيداً، وسبباً ويُسجل في audit.</p><div className="mt-4 grid gap-2">{(Object.keys(labels) as Action[]).map((item) => <button key={item} onClick={() => open(item)} className="rounded-lg border px-3 py-2 text-right text-sm font-medium hover:bg-slate-50">{labels[item]}</button>)}</div></aside></div>}
    {action ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="text-xl font-bold">{labels[action]}</h2><div className="mt-4 space-y-4">{action === 'refund' ? <label className="block text-sm">مبلغ جزئي اختياري (اتركه فارغاً لاسترداد كامل)<input type="number" min="0.01" max={detail?.financials.refundable_max} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label> : null}{action === 'compensate' ? <label className="block text-sm">مبلغ التعويض<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label> : null}{action === 'reassign' ? <label className="block text-sm">معرّف المزوّد الجديد<input value={providerId} onChange={(e) => setProviderId(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label> : null}{action === 'sla-extend' ? <label className="block text-sm">ساعات التمديد (1–72)<input type="number" min="1" max="72" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label> : null}{action === 'note' ? <label className="block text-sm">الملاحظة الداخلية<textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-2"/></label> : <label className="block text-sm">سبب الإجراء<textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-2"/></label>}<div className="flex justify-end gap-2"><button onClick={() => setAction(null)} className="rounded border px-4 py-2">إلغاء</button><button disabled={submitting} onClick={() => void submit()} className="rounded bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-50">{submitting ? 'جارٍ التنفيذ…' : 'تأكيد وتدقيق'}</button></div></div></div></div> : null}
  </section></>;
}
