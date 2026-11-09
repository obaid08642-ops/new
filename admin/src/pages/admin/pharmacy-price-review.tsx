import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { DataTable } from '@/components/DataTable';
import { useCan } from '@/components/AdminGuard';

type ReviewLine = { order_item_id: string; medicine_id: string | null; sku: string | number | null; name_ar: string | null; reason: 'price_above_catalogue' | 'not_verified'; catalogue_price: number | null; offered_price: number | null };
type Review = { id: string; order_id: string; offer_id?: string; pharmacy_account_id?: string; offer_status?: string; status: 'open' | 'closed'; lines: ReviewLine[]; updatedAt?: string; resolution?: string; resolution_note?: string | null; resolved_at?: string };
type ReviewPage = { items: Review[]; total: number; page: number; limit: number };

const REASON: Record<ReviewLine['reason'], string> = { price_above_catalogue: 'أعلى من سعر الكتالوج', not_verified: 'غير مطابق للكتالوج' };
const RESOLUTION: Record<string, string> = { catalogue_updated: 'حُدّث سعر الكتالوج', price_confirmed: 'السعر المعروض مؤكَّد' };
const sar = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(2)} ر.س` : '—');

/**
 * Decision 12 (issue 331, revised 2026-10-10): a pharmacy may offer a line above the catalogue (SFDA) price; the line is
 * accepted and flagged, and the admin is told. This page lists those offers (GET /admin/pharmacy/price-review): each
 * flagged line with the catalogue and offered price. The admin either updates the catalogue price of the medicine
 * (PATCH /medicines/admin/catalog/:id { sfda_price }, audit-logged) or confirms the offered price, then closes the review
 * (POST /admin/pharmacy/price-review/:id/resolve).
 */
export default function PharmacyPriceReviewPage() {
  const canWritePrice = useCan('catalog.price.write');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [reason, setReason] = useState<'' | ReviewLine['reason']>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ status, page: String(page), limit: '25', ...(reason ? { reason } : {}) });
      setData(await apiFetch<ReviewPage>(`/admin/admin/pharmacy/price-review?${q.toString()}`));
    } catch (e: any) {
      setError(e?.message ? `تعذر تحميل قائمة مراجعة الأسعار: ${e.message}` : 'تعذر تحميل قائمة مراجعة الأسعار.');
    } finally {
      setLoading(false);
    }
  }, [status, reason, page]);

  useEffect(() => { void load(); }, [load]);

  async function updateCatalogue(line: ReviewLine) {
    if (!line.medicine_id) return;
    const value = Number(prices[line.order_item_id]);
    if (!Number.isFinite(value) || value <= 0) { setError('أدخل سعر كتالوج صحيحًا أكبر من صفر.'); return; }
    setBusy(line.order_item_id);
    setError('');
    try {
      await apiFetch(`/medicines/admin/catalog/${encodeURIComponent(line.medicine_id)}`, { method: 'PATCH', body: JSON.stringify({ sfda_price: value, reason: 'مراجعة سعر عرض صيدلية (قرار 12)' }) });
      setNotice(`حُدّث سعر الكتالوج إلى ${sar(value)}.`);
    } catch (e: any) {
      setError(e?.message ? `تعذر تحديث سعر الكتالوج: ${e.message}` : 'تعذر تحديث سعر الكتالوج.');
    } finally {
      setBusy('');
    }
  }

  async function resolve(review: Review, resolution: 'catalogue_updated' | 'price_confirmed') {
    setBusy(review.id);
    setError('');
    try {
      await apiFetch(`/admin/admin/pharmacy/price-review/${encodeURIComponent(review.id)}/resolve`, { method: 'POST', body: JSON.stringify({ resolution }) });
      setNotice('أُغلقت المراجعة.');
      await load();
    } catch (e: any) {
      setError(e?.message ? `تعذر إغلاق المراجعة: ${e.message}` : 'تعذر إغلاق المراجعة.');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <Head><title>مراجعة أسعار عروض الصيدليات | نبض بلس</title></Head>
      <section dir="rtl" className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">مراجعة أسعار عروض الصيدليات</h1>
            <p className="mt-1 text-sm text-slate-500">عروض فيها سطر بسعر أعلى من سعر الكتالوج (SFDA) أو صنف غير مطابق للكتالوج. حدّث سعر الكتالوج إن تغيّر السعر الرسمي، أو أكّد السعر المعروض، ثم أغلق المراجعة.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="الحالة" className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value === 'closed' ? 'closed' : 'open'); setPage(1); }}>
              <option value="open">مفتوحة</option>
              <option value="closed">مغلقة</option>
            </select>
            <select aria-label="السبب" className="rounded-lg border px-3 py-2 text-sm" value={reason} onChange={(e) => { setReason(e.target.value === 'price_above_catalogue' || e.target.value === 'not_verified' ? e.target.value : ''); setPage(1); }}>
              <option value="">كل الأسباب</option>
              <option value="price_above_catalogue">{REASON.price_above_catalogue}</option>
              <option value="not_verified">{REASON.not_verified}</option>
            </select>
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
          emptyText={status === 'open' ? 'لا توجد عروض تنتظر مراجعة السعر.' : 'لا توجد مراجعات مغلقة.'}
          columns={[
            { key: 'order', header: 'الطلب', render: (row) => <span className="font-mono text-xs">{row.order_id.slice(0, 8)}</span> },
            { key: 'lines', header: 'الأسطر', render: (row) => (
              <ul className="space-y-2">
                {row.lines.map((line) => (
                  <li key={line.order_item_id} className="text-sm">
                    <div className="font-medium text-slate-900">{line.name_ar || line.sku || line.order_item_id}</div>
                    <div className="text-xs text-slate-500">{REASON[line.reason]} · الكتالوج {sar(line.catalogue_price)} · المعروض {sar(line.offered_price)}</div>
                    {status === 'open' && line.medicine_id && canWritePrice ? (
                      <div className="mt-1 flex gap-2">
                        <input aria-label="سعر الكتالوج الجديد" inputMode="decimal" className="w-28 rounded border px-2 py-1 text-xs" value={prices[line.order_item_id] ?? ''} placeholder="سعر جديد" onChange={(e) => setPrices((p) => ({ ...p, [line.order_item_id]: e.target.value }))} />
                        <button disabled={busy === line.order_item_id} onClick={() => void updateCatalogue(line)} className="rounded border px-2 py-1 text-xs font-semibold">تحديث سعر الكتالوج</button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) },
            { key: 'when', header: 'آخر تحديث', className: 'text-xs text-slate-500', render: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleString('ar-SA-u-ca-gregory') : '—') },
            { key: 'action', header: 'الإجراء', render: (row) => (row.status === 'open' ? (!canWritePrice ? <span className="text-xs text-slate-500">لا تملك صلاحية تعديل الأسعار</span> :
              <div className="flex flex-col gap-2">
                <button disabled={busy === row.id} onClick={() => void resolve(row, 'catalogue_updated')} className="rounded bg-teal-700 px-3 py-1 text-xs font-bold text-white">أُغلقت: حُدّث سعر الكتالوج</button>
                <button disabled={busy === row.id} onClick={() => void resolve(row, 'price_confirmed')} className="rounded border px-3 py-1 text-xs font-semibold">أُغلقت: السعر المعروض مؤكَّد</button>
              </div>
            ) : <span className="text-xs text-slate-600">{RESOLUTION[row.resolution ?? ''] ?? '—'}</span>) },
          ]}
        />
        {data && data.total > data.limit ? (
          <div className="mt-4 flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 text-sm">السابق</button>
            <button disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 text-sm">التالي</button>
          </div>
        ) : null}
      </section>
    </>
  );
}
