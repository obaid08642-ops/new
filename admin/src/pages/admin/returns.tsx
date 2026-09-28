import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

type ReturnRow = {
  id: string;
  patient_id: string;
  order_id: string;
  booking_kind?: string;
  service_type: string;
  reason: string;
  details?: string;
  items?: Array<{ medicine_id?: string; name_ar?: string; qty?: number; price?: number }>;
  amount: number;
  status: string;
  createdAt?: string;
};

const labels: Record<string, string> = {
  pharmacy: 'صيدلية', consultation: 'استشارة', diagnostics: 'تحاليل أو أشعة', nursing: 'تمريض', insurance: 'تأمين',
};
const statusLabels: Record<string, string> = { processing: 'قيد المراجعة', completed: 'مكتمل', rejected: 'مرفوض' };

export default function ReturnsAdminPage() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [status, setStatus] = useState('processing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result: any = await apiFetch(`/api/admin/admin/returns?status=${encodeURIComponent(status)}`);
      setRows(Array.isArray(result) ? result : result?.data || []);
    } catch (cause: any) {
      setError(cause?.message || 'تعذر تحميل طلبات الإرجاع');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [status]);

  async function decide(row: ReturnRow, decision: 'approved' | 'rejected') {
    const note = window.prompt(decision === 'approved' ? 'ملاحظة اعتماد الإرجاع' : 'سبب رفض الإرجاع');
    if (note === null || (decision === 'rejected' && note.trim().length < 5)) return;
    setWorkingId(row.id);
    setError('');
    try {
      await apiFetch(`/api/admin/admin/returns/${encodeURIComponent(row.id)}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, note: note.trim() }),
      });
      await load();
    } catch (cause: any) {
      setError(cause?.message || 'تعذر حفظ القرار');
    } finally {
      setWorkingId('');
    }
  }

  return (
    <>
      <Head><title>طلبات الإرجاع والاسترداد | نبض</title></Head>
      <main className="space-y-5 p-4 sm:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">طلبات الإرجاع والاسترداد</h1>
            <p className="mt-1 text-sm text-slate-500">راجع عناصر الطلب والمبلغ المحسوب من سجل الحجز قبل اتخاذ القرار.</p>
          </div>
          <div className="flex gap-2" role="group" aria-label="تصفية الطلبات">
            {['processing', 'completed', 'rejected'].map((value) => (
              <button key={value} type="button" onClick={() => setStatus(value)} aria-pressed={status === value}
                className={`rounded-lg border px-3 py-2 text-sm ${status === value ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                {statusLabels[value]}
              </button>
            ))}
          </div>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {loading ? <p className="rounded-xl border bg-white p-8 text-center text-slate-500">جارٍ تحميل الطلبات…</p>
          : rows.length === 0 ? <p className="rounded-xl border bg-white p-8 text-center text-slate-500">لا توجد طلبات في هذه الحالة.</p>
            : <div className="space-y-3">
              {rows.map((row) => (
                <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <h2 className="font-semibold text-slate-900">{labels[row.service_type] || row.service_type} · {row.reason}</h2>
                      <p className="text-xs text-slate-500">طلب {row.id} · حجز {row.order_id} · مريض {row.patient_id}</p>
                      {row.details && <p className="text-sm text-slate-700">{row.details}</p>}
                      {row.items?.length ? <ul className="list-inside list-disc text-sm text-slate-600">
                        {row.items.map((item, index) => <li key={`${item.medicine_id || 'item'}-${index}`}>
                          {item.name_ar || item.medicine_id || 'عنصر'} · {item.qty || 1} × {item.price || 0} ر.س
                        </li>)}
                      </ul> : null}
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-lg font-bold text-emerald-700">{Number(row.amount || 0).toFixed(2)} ر.س</p>
                      <p className="text-xs text-slate-500">{row.booking_kind || labels[row.service_type] || row.service_type} · {row.status}</p>
                    </div>
                  </div>
                  {status === 'processing' && <div className="mt-4 flex gap-2 border-t pt-3">
                    <button type="button" disabled={workingId === row.id} onClick={() => void decide(row, 'approved')}
                      className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">اعتماد الاسترداد</button>
                    <button type="button" disabled={workingId === row.id} onClick={() => void decide(row, 'rejected')}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">رفض الطلب</button>
                  </div>}
                </article>
              ))}
            </div>}
      </main>
    </>
  );
}
