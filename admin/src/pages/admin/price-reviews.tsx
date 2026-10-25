import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { DataTable } from '@/components/DataTable';
import { useCan } from '@/components/AdminGuard';

type Status = 'open' | 'catalogue_updated' | 'pharmacy_actioned' | 'dismissed';
type Review = {
  id: string; pharmacy_id: string; pharmacy_name_ar?: string | null; pharmacy_name_en?: string | null; order_id: string; offer_id: string;
  medicine_id: string | null; name_ar?: string | null; name_en?: string | null; catalogue_price: number; offered_price: number; percent_above: number;
  status: Status; action: string | null; note: string | null; admin_id: string | null; acted_at?: string | null; created_at: string; suspended_until?: string | null; penalty_amount_sar?: number | null;
  history?: Array<{ id: string; status: Status; action: string | null; percent_above: number; offered_price: number; created_at: string }>;
};
type Page = { items: Review[]; total: number; page: number; limit: number };

const STATUS: Record<Status, string> = { open: 'مفتوحة', catalogue_updated: 'حُدّث الكتالوج', pharmacy_actioned: 'إجراء على الصيدلية', dismissed: 'مرفوضة (السعر مبرَّر)' };
const ACTION: Record<string, string> = { catalogue_updated: 'تحديث سعر الكتالوج', dismissed: 'رفض المراجعة', warning: 'تحذير', suspend_temporary: 'إيقاف مؤقت', block: 'حظر', penalty: 'غرامة' };
const sar = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(2)} ر.س` : '—');
const when = (v?: string | null) => (v ? new Date(v).toLocaleString('ar-SA-u-ca-gregory') : '—');

/**
 * Price reviews (owner decision 2026-10-25, supersedes OD-12): a pharmacy may offer a price above the catalogue (SFDA) price, and every such
 * offer line is a review here. The admin either updates the catalogue price to the offered one, dismisses it (the price is justified), or acts on
 * the pharmacy (warning, temporary suspension, block, or a penalty). Every decision needs a reason and is recorded with who and when.
 */
export default function PriceReviewsPage() {
  const canPrice = useCan('catalog.price.write');
  const canFacility = useCan('facility.edit');
  const canFinance = useCan('finance.config.edit');
  const [status, setStatus] = useState<'all' | Status>('open');
  const [pharmacy, setPharmacy] = useState('');
  const [minPercent, setMinPercent] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Review | null>(null);
  const [note, setNote] = useState('');
  const [until, setUntil] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ status, page: String(page), limit: '25', ...(pharmacy.trim() ? { pharmacy_id: pharmacy.trim() } : {}), ...(Number(minPercent) > 0 ? { min_percent: minPercent } : {}) });
      setData(await apiFetch<Page>(`/admin/admin/pharmacy/price-reviews?${q.toString()}`));
    } catch {
      setError('تعذر تحميل مراجعات الأسعار.');
    } finally {
      setLoading(false);
    }
  }, [status, page, pharmacy, minPercent]);

  useEffect(() => { void load(); }, [load]);

  async function open(row: Review) {
    setError(''); setNotice(''); setNote(''); setUntil(''); setAmount('');
    try { setSelected(await apiFetch<Review>(`/admin/admin/pharmacy/price-reviews/${encodeURIComponent(row.id)}`)); } catch { setSelected(row); }
  }

  async function act(path: string, body: Record<string, unknown>, confirmText?: string) {
    if (!selected) return;
    if (note.trim().length < 3) { setError('اكتب سبب القرار (3 أحرف على الأقل).'); return; }
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError('');
    try {
      await apiFetch(`/admin/admin/pharmacy/price-reviews/${encodeURIComponent(selected.id)}/${path}`, { method: 'POST', body: JSON.stringify({ note: note.trim(), ...body }) });
      setNotice('سُجّل القرار.');
      setSelected(null);
      await load();
    } catch {
      setError('تعذر تنفيذ الإجراء. قد تكون المراجعة قد حُسمت من مشرف آخر.');
    } finally {
      setBusy(false);
    }
  }

  const pharmacyName = (r: Review) => r.pharmacy_name_ar || r.pharmacy_name_en || r.pharmacy_id;
  const isOpen = selected?.status === 'open';

  return (
    <>
      <Head><title>مراجعات الأسعار | نبض بلس</title></Head>
      <section dir="rtl" className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">مراجعات الأسعار</h1>
            <p className="mt-1 text-sm text-slate-500">كل سطر في عرض صيدلية بسعر أعلى من سعر الكتالوج (SFDA). الصيدلي مسموح له بذلك، والإدارة تراجع كل حالة وتقرر.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="الحالة" className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as 'all' | Status); setPage(1); }}>
              <option value="open">مفتوحة</option>
              <option value="all">الكل</option>
              <option value="catalogue_updated">{STATUS.catalogue_updated}</option>
              <option value="pharmacy_actioned">{STATUS.pharmacy_actioned}</option>
              <option value="dismissed">{STATUS.dismissed}</option>
            </select>
            <input aria-label="رقم حساب الصيدلية" placeholder="الصيدلية (المعرّف)" className="rounded-lg border px-3 py-2 text-sm" value={pharmacy} onChange={(e) => { setPharmacy(e.target.value); setPage(1); }} />
            <input aria-label="أقل نسبة ارتفاع" placeholder="% أعلى من" inputMode="decimal" className="w-28 rounded-lg border px-3 py-2 text-sm" value={minPercent} onChange={(e) => { setMinPercent(e.target.value); setPage(1); }} />
            <button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">تحديث</button>
          </div>
        </div>
        {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{notice}</p> : null}
        <DataTable
          rows={data?.items ?? []}
          getRowKey={(row) => row.id}
          loading={loading}
          loadingText="جارٍ التحميل…"
          emptyText={status === 'open' ? 'لا توجد مراجعات أسعار مفتوحة.' : 'لا توجد مراجعات بهذه المعايير.'}
          columns={[
            { key: 'pharmacy', header: 'الصيدلية', render: (row) => <span className="text-sm font-medium text-slate-900">{pharmacyName(row)}</span> },
            { key: 'medicine', header: 'الصنف', render: (row) => <span className="text-sm">{row.name_ar || row.name_en || row.medicine_id || '—'}</span> },
            { key: 'catalogue', header: 'الكتالوج', render: (row) => sar(row.catalogue_price) },
            { key: 'offered', header: 'المعروض', render: (row) => sar(row.offered_price) },
            { key: 'percent', header: 'أعلى بـ', render: (row) => <span className="font-bold text-rose-700">{row.percent_above}%</span> },
            { key: 'status', header: 'الحالة', render: (row) => <span className="text-xs">{STATUS[row.status]}{row.action ? ` · ${ACTION[row.action] ?? row.action}` : ''}</span> },
            { key: 'when', header: 'التاريخ', className: 'text-xs text-slate-500', render: (row) => when(row.created_at) },
            { key: 'open', header: '', render: (row) => <button onClick={() => void open(row)} className="rounded border px-3 py-1 text-xs font-semibold">التفاصيل</button> },
          ]}
        />
        {data && data.total > data.limit ? (
          <div className="mt-4 flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 text-sm">السابق</button>
            <button disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 text-sm">التالي</button>
          </div>
        ) : null}

        {selected ? (
          <aside aria-label="تفاصيل المراجعة" className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">{pharmacyName(selected)} · {selected.name_ar || selected.name_en || selected.medicine_id}</h2>
              <button onClick={() => setSelected(null)} className="rounded border px-3 py-1 text-xs">إغلاق</button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><dt className="text-slate-500">سعر الكتالوج</dt><dd className="font-semibold">{sar(selected.catalogue_price)}</dd></div>
              <div><dt className="text-slate-500">السعر المعروض</dt><dd className="font-semibold">{sar(selected.offered_price)}</dd></div>
              <div><dt className="text-slate-500">أعلى بـ</dt><dd className="font-semibold text-rose-700">{selected.percent_above}%</dd></div>
              <div><dt className="text-slate-500">الطلب / العرض</dt><dd className="font-mono text-xs">{selected.order_id.slice(0, 8)} / {selected.offer_id.slice(0, 8)}</dd></div>
            </dl>
            {selected.history && selected.history.length > 0 ? (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-700">نفس الصيدلية ونفس الصنف سابقًا</h3>
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {selected.history.map((h) => <li key={h.id}>{when(h.created_at)} · {sar(h.offered_price)} ({h.percent_above}%) · {STATUS[h.status]}{h.action ? ` · ${ACTION[h.action] ?? h.action}` : ''}</li>)}
                </ul>
              </div>
            ) : null}
            {isOpen ? (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">سبب القرار (إلزامي)
                  <textarea className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="flex flex-wrap gap-2">
                  {canPrice ? <button disabled={busy || !selected.medicine_id} onClick={() => void act('update-catalogue', {})} className="rounded bg-teal-700 px-3 py-2 text-sm font-bold text-white">تحديث سعر الكتالوج إلى {sar(selected.offered_price)}</button> : null}
                  {canPrice ? <button disabled={busy} onClick={() => void act('dismiss', {})} className="rounded border px-3 py-2 text-sm font-semibold">رفض: السعر مبرَّر</button> : null}
                  {canFacility ? <button disabled={busy} onClick={() => void act('warn', {})} className="rounded border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-800">تحذير الصيدلية</button> : null}
                  {canFacility ? <button disabled={busy} onClick={() => void act('block', {}, 'حظر الصيدلية وإيقاف حسابها. متابعة؟')} className="rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700">حظر</button> : null}
                </div>
                {canFacility ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm font-semibold text-slate-700">إيقاف مؤقت حتى
                      <input type="datetime-local" className="mr-2 rounded border px-2 py-1 text-sm font-normal" value={until} onChange={(e) => setUntil(e.target.value)} />
                    </label>
                    <button disabled={busy || !until} onClick={() => void act('suspend', { until: new Date(until).toISOString() }, 'إيقاف حساب الصيدلية مؤقتًا. متابعة؟')} className="rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700">إيقاف مؤقت</button>
                  </div>
                ) : null}
                {canFinance ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm font-semibold text-slate-700">غرامة (ر.س)
                      <input inputMode="decimal" className="mr-2 w-28 rounded border px-2 py-1 text-sm font-normal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </label>
                    <button disabled={busy || !(Number(amount) > 0)} onClick={() => void act('penalty', { amount_sar: Number(amount) }, `خصم ${amount} ر.س من رصيد الصيدلية. متابعة؟`)} className="rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700">فرض غرامة</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                القرار: {ACTION[selected.action ?? ''] ?? '—'} · {when(selected.acted_at)} · المشرف {selected.admin_id ?? '—'} · السبب: {selected.note ?? '—'}
                {selected.suspended_until ? ` · الإيقاف حتى ${when(selected.suspended_until)} (يُرفع من شاشة المزودين: إعادة التفعيل)` : ''}
                {selected.penalty_amount_sar ? ` · الغرامة ${sar(selected.penalty_amount_sar)}` : ''}
              </p>
            )}
          </aside>
        ) : null}
      </section>
    </>
  );
}
