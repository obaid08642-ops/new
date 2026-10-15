import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch } from '@/lib/admin-client';

/**
 * Provider proposals waiting for an admin (provider-journeys 28): a lab's or radiology centre's new test, scan or
 * bundle, and price or detail edits to its catalogue items, and a pharmacy's new product. They are sent through
 * POST /approval-workflow/requests by the provider app; here the admin reads each one with who proposed it and approves
 * (the item is created or updated and published; a new lab or radiology item belongs to the proposer) or rejects it
 * with a reason (POST /approval-workflow/requests/:id/decide).
 */

type Proposal = {
  id: string;
  entity_type: 'medicine' | 'provider' | 'facility' | 'service';
  entity_id?: string | null;
  change_data: Record<string, unknown>;
  submitter_name?: string | null;
  submitter_type?: string | null;
  createdAt?: string;
};

const KIND: Record<string, string> = { medicine: 'صنف دواء', provider: 'ملف مزود', facility: 'منشأة', service: 'خدمة' };
const SERVICE: Record<string, string> = { lab: 'تحليل', laboratory: 'تحليل', radiology: 'أشعة', home_care: 'تمريض', nursing: 'تمريض' };

const FIELD: Record<string, string> = {
  name_ar: 'الاسم (عربي)', name_en: 'الاسم (إنجليزي)', name: 'الاسم', price: 'السعر', old_price: 'السعر قبل الخصم',
  is_package: 'حزمة', included_services: 'التحاليل في الحزمة', home_drawing_fee: 'رسوم السحب المنزلي',
  insurance_covered: 'مغطى بالتأمين', available: 'متاح', fasting_required: 'يتطلب صياماً', turnaround_hours: 'مدة النتيجة (ساعات)',
  reference_ranges: 'المدى المرجعي', category: 'الفئة', barcode: 'الباركود', type: 'النوع',
};

function show(value: unknown): string {
  if (value === true) return 'نعم';
  if (value === false) return 'لا';
  if (Array.isArray(value)) return value.map(String).join('، ');
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join('، ');
  return String(value ?? '');
}

function title(p: Proposal): string {
  const d = p.change_data || {};
  const kind = p.entity_type === 'service' ? (d.is_package ? 'حزمة' : SERVICE[String(d.type || '').toLowerCase()] || KIND.service) : KIND[p.entity_type];
  const name = String(d.name_ar || d.name_en || d.name || '');
  return `${p.entity_id ? 'تعديل' : 'جديد'}: ${kind}${name ? ` — ${name}` : ''}`;
}

export default function ServiceProposalsPage() {
  const [rows, setRows] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await adminFetch<Proposal[] | { data?: Proposal[] }>('/approval-workflow/requests/pending');
      setRows(Array.isArray(list) ? list : list.data || []);
    } catch {
      setError('تعذر تحميل الاقتراحات');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(p: Proposal, decision: 'approved' | 'rejected') {
    const note = (notes[p.id] || '').trim();
    if (decision === 'rejected' && !note) { setError('اكتب سبب الرفض ليصل إلى المزود'); return; }
    setBusy(p.id);
    setError(null);
    try {
      await adminFetch(`/approval-workflow/requests/${encodeURIComponent(p.id)}/decide`, { method: 'POST', body: JSON.stringify(note ? { decision, notes: note } : { decision }) });
      setRows((list) => (list || []).filter((r) => r.id !== p.id));
    } catch {
      setError('تعذر حفظ القرار');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Head><title>اقتراحات المزودين | نبض</title></Head>
      <section dir="rtl" className="space-y-5 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">اقتراحات المزودين</h1>
            <p className="mt-1 text-sm text-slate-500">تحاليل وأشعة وحزم جديدة، وتعديلات الأسعار، وأصناف الصيدليات الجديدة.</p>
          </div>
          <button onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">تحديث</button>
        </header>
        {error ? <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {rows === null ? <p className="text-sm text-slate-500">جارٍ التحميل…</p> : rows.length === 0 ? (
          <p className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">لا اقتراحات بانتظار قرار.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((p) => (
              <li key={p.id} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold">{title(p)}</p>
                  <p className="text-xs text-slate-500">{p.submitter_name || 'مزود'}{p.createdAt ? ` · ${new Date(p.createdAt).toLocaleString('ar-SA-u-ca-gregory')}` : ''}</p>
                </div>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  {Object.entries(p.change_data || {}).map(([k, v]) => (
                    <div key={k} className="flex gap-2"><dt className="text-slate-500">{FIELD[k] || k}:</dt><dd className="font-medium">{show(v)}</dd></div>
                  ))}
                </dl>
                <div className="flex flex-wrap items-center gap-2">
                  <input aria-label="سبب الرفض أو ملاحظة" placeholder="سبب الرفض أو ملاحظة" value={notes[p.id] || ''} maxLength={500}
                    onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))} className="min-h-11 min-w-0 flex-1 rounded-lg border px-3 text-sm" />
                  <button onClick={() => void decide(p, 'approved')} disabled={busy === p.id} className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">اعتماد</button>
                  <button onClick={() => void decide(p, 'rejected')} disabled={busy === p.id} className="min-h-11 rounded-lg border border-rose-300 px-4 text-sm font-bold text-rose-700 disabled:opacity-50">رفض</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
