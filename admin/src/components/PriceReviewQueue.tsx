import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { dateLocale } from '../utils/dates';

/**
 * Decision 12 queue: pharmacy offer lines with no catalogue match (`not_verified`) or priced above the catalogue
 * price (`price_above_catalogue`). Rows come from GET /admin/pharmacy/price-review (one row per offer, written by
 * PharmacyOfferService.reportPriceReview); "close" is POST /admin/pharmacy/price-review/:id/resolve (price_confirmed: the line was checked), the one route that closes a review. A line that matches
 * no catalogue item offers "create a catalogue item from this line" (the create form, prefilled).
 */

export type PriceReviewLine = {
  order_item_id?: string;
  medicine_id?: string | null;
  sku?: string | number | null;
  name_ar?: string | null;
  name_en?: string | null;
  reason: 'not_verified' | 'price_above_catalogue';
  catalogue_price?: number | null;
  offered_price?: number | null;
  /** Set by the list route when the line matches a catalogue item (that has no reference price yet). */
  catalogue_item_id?: string | null;
};

type PriceReview = {
  id: string;
  order_id: string;
  offer_id: string;
  offer_status?: string;
  pharmacy_account_id?: string;
  pharmacy_name_ar?: string | null;
  pharmacy_name_en?: string | null;
  lines: PriceReviewLine[];
  status: 'open' | 'closed';
  updatedAt?: string;
  createdAt?: string;
};

const REASON_LABELS: Record<PriceReviewLine['reason'], string> = {
  not_verified: 'لا يطابق صنفاً في الكتالوج',
  price_above_catalogue: 'أعلى من سعر الكتالوج',
};

const BASE = '/api/admin/admin/pharmacy/price-review';

export function PriceReviewQueue({ onCreateFromLine, canCreate }: { onCreateFromLine: (line: PriceReviewLine) => void; canCreate: boolean }) {
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [reason, setReason] = useState<'' | PriceReviewLine['reason']>('');
  const [rows, setRows] = useState<PriceReview[] | null>(null);
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed('');
    setRows(null);
    try {
      const params = new URLSearchParams({ status, page: '1', limit: '50' });
      if (reason) params.set('reason', reason);
      const res = await apiFetch<{ items?: PriceReview[] }>(`${BASE}?${params.toString()}`);
      setRows(res?.items || []);
    } catch (e: unknown) {
      setRows([]);
      setFailed(e instanceof Error && e.message ? e.message : 'تعذر تحميل قائمة المراجعة.');
    }
  }, [status, reason]);

  useEffect(() => { void load(); }, [load]);

  const close = async (row: PriceReview) => {
    if (!confirm('إغلاق هذه المراجعة؟ تُفتح من جديد إذا عدّلت الصيدلية عرضها.')) return;
    setBusy(row.id);
    try {
      await apiFetch(`${BASE}/${encodeURIComponent(row.id)}/resolve`, { method: 'POST', body: JSON.stringify({ resolution: 'price_confirmed' }) });
      await load();
    } catch (e: unknown) {
      alert(`فشل الإغلاق: ${e instanceof Error ? e.message : ''}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">أسطر من عروض الصيدليات لا تطابق صنفاً في الكتالوج أو سعرها أعلى من سعر الكتالوج.</p>
        <select value={status} onChange={(e) => setStatus(e.target.value === 'closed' ? 'closed' : 'open')} className="border rounded px-3 py-2 text-sm ms-auto" aria-label="حالة المراجعة">
          <option value="open">مفتوحة</option>
          <option value="closed">مغلقة</option>
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value === 'not_verified' || e.target.value === 'price_above_catalogue' ? e.target.value : '')} className="border rounded px-3 py-2 text-sm" aria-label="السبب">
          <option value="">كل الأسباب</option>
          <option value="not_verified">{REASON_LABELS.not_verified}</option>
          <option value="price_above_catalogue">{REASON_LABELS.price_above_catalogue}</option>
        </select>
      </div>

      {failed ? <div role="alert" className="p-3 bg-red-50 border border-red-300 text-red-700 rounded">{failed}</div> : null}
      {rows === null ? <div className="p-8 text-center text-slate-500">جاري التحميل...</div> : null}
      {rows && rows.length === 0 && !failed ? <div className="bg-white rounded-xl border p-12 text-center text-slate-400">لا أسطر للمراجعة.</div> : null}

      {rows && rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-black text-slate-800">{row.pharmacy_name_ar || row.pharmacy_name_en || row.pharmacy_account_id || '—'}</div>
                  <div className="text-xs text-slate-500">
                    الطلب <span dir="ltr" className="font-mono">{row.order_id}</span>
                    {' · '}
                    {row.updatedAt ? new Date(row.updatedAt).toLocaleString(dateLocale()) : ''}
                  </div>
                </div>
                {row.status === 'open' ? (
                  <button type="button" onClick={() => void close(row)} disabled={busy === row.id} className="border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">
                    تمت المراجعة
                  </button>
                ) : null}
              </div>
              <ul className="divide-y text-sm">
                {row.lines.map((line, i) => (
                  <li key={line.order_item_id ?? i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{line.name_ar || line.name_en || '—'}</div>
                      <div className="text-xs text-slate-500" dir="ltr">{line.name_en || ''}{line.sku !== null && line.sku !== undefined && line.sku !== '' ? ` · SKU ${line.sku}` : ''}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${line.reason === 'not_verified' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'}`}>{REASON_LABELS[line.reason] || line.reason}</span>
                    <span className="text-xs text-slate-600">
                      سعر الصيدلية <b dir="ltr">{line.offered_price ?? '—'}</b>
                      {line.catalogue_price !== null && line.catalogue_price !== undefined ? <> · سعر الكتالوج <b dir="ltr">{line.catalogue_price}</b></> : null}
                    </span>
                    {line.reason === 'not_verified' && line.catalogue_item_id ? (
                      <span className="text-xs text-slate-500">الصنف موجود في الكتالوج بلا سعر مرجعي — أضف السعر المرجعي من تعديل الصنف.</span>
                    ) : null}
                    {line.reason === 'not_verified' && !line.catalogue_item_id && canCreate ? (
                      <button type="button" onClick={() => onCreateFromLine(line)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs">
                        إنشاء صنف في الكتالوج من هذا السطر
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
