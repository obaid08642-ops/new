import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

/**
 * Pharmacy → warehouse procurement (B2B):
 * Pharmacies submit shortage lists (file/photo/manual basket) from the provider
 * app; admin reviews each request here, analyzes items, and issues a price
 * quotation back to the pharmacy.
 *
 * Backend: GET  /admin/extended-operations/procurement/pending
 *          PATCH /admin/extended-operations/issue-quote/:id
 */
const STATUS_AR: Record<string, { ar: string; cls: string }> = {
  PENDING_ADMIN_REVIEW: { ar: 'بانتظار مراجعة الإدارة', cls: 'bg-amber-100 text-amber-700' },
  QUOTATION_ISSUED: { ar: 'تم إصدار عرض السعر', cls: 'bg-blue-100 text-blue-700' },
  APPROVED_BY_PHARMACY: { ar: 'قبلت الصيدلية العرض', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { ar: 'ملغي', cls: 'bg-red-100 text-red-700' },
  COMPLETED: { ar: 'مكتمل', cls: 'bg-green-100 text-green-700' },
};

export default function PharmacyProcurementPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const itemsOf = (r: any) => (Array.isArray(r?.items) ? r.items : []);
  const totalOf = (r: any) => itemsOf(r).reduce((sum: number, it: any, i: number) => {
    const unit = parseFloat(itemPrices[i] || '0') || 0;
    return sum + unit * (Number(it.requested_quantity || it.quantity) || 1);
  }, 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/admin/extended-operations/procurement/pending');
      setRequests(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل طلبات التوريد');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const issueQuote = async () => {
    if (!selected) return;
    const items = itemsOf(selected);
    const total = totalOf(selected);
    if (!(total > 0)) { alert('أدخل سعر وحدة صحيح لكل صنف على الأقل'); return; }
    setBusy(true);
    try {
      const pricingItems = items.map((it: any, i: number) => ({
        ...it,
        unit_price: parseFloat(itemPrices[i] || '0') || 0,
        line_total: (parseFloat(itemPrices[i] || '0') || 0) * (Number(it.requested_quantity || it.quantity) || 1),
      }));
      await apiFetch(`/admin/extended-operations/issue-quote/${selected._id || selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pricingItems, totalPrice: total }),
      });
      setSelected(null);
      setItemPrices({});
      await load();
      alert('تم إصدار عرض السعر وإرساله للصيدلية');
    } catch (e: any) {
      alert(`فشل إصدار العرض: ${e?.message || ''}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>طلبات توريد الصيدليات | نبض</title></Head>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">طلبات توريد الصيدليات (B2B)</h1>
            <p className="text-sm text-slate-500 mt-1">طلبات النواقص الواردة من الصيدليات — راجع الأصناف ثم أصدر عرض السعر.</p>
          </div>
          <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm">تحديث</button>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded">{error}</div>}

        {loading ? (
          <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            لا توجد طلبات توريد بانتظار المراجعة حالياً.
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((r: any) => {
              const st = STATUS_AR[r.status] || { ar: r.status, cls: 'bg-slate-100 text-slate-600' };
              const items = itemsOf(r);
              const isOpen = selected && (selected._id || selected.id) === (r._id || r.id);
              return (
                <div key={r._id || r.id} className="bg-white rounded-xl border border-slate-200">
                  <div className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[240px]">
                      <div className="font-bold text-slate-800">طلب #{String(r._id || r.id).slice(-8)}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {items.length} صنف · صيدلية: <span dir="ltr">{String(r.pharmacy_id || '').slice(-8)}</span>
                        {r.createdAt && <> · {new Date(r.createdAt).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { hour12: false })}</>}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${st.cls}`}>{st.ar}</span>
                    {r.uploaded_file_url && (
                      <a href={r.uploaded_file_url} target="_blank" rel="noreferrer" className="text-teal-700 text-sm font-bold underline">الملف المرفق</a>
                    )}
                    <button
                      onClick={() => { setSelected(isOpen ? null : r); setItemPrices({}); }}
                      className="bg-teal-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg"
                    >
                      {isOpen ? 'إغلاق' : 'مراجعة وإصدار عرض'}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-4 space-y-4">
                      <table className="w-full text-right text-sm">
                        <thead className="text-xs text-slate-500 bg-slate-50">
                          <tr>
                            <th className="p-2">الصنف</th>
                            <th className="p-2">المجموعة</th>
                            <th className="p-2">الكمية</th>
                            <th className="p-2">سعر الوحدة (ر.س)</th>
                            <th className="p-2">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((it: any, i: number) => (
                            <tr key={i}>
                              <td className="p-2 font-bold">{it.raw_name_string || it.name}</td>
                              <td className="p-2">{it.category_group === 'non_medical' ? 'غير دوائية' : 'أدوية'}</td>
                              <td className="p-2" dir="ltr">{it.requested_quantity || it.quantity || 1}</td>
                              <td className="p-2">
                                <input
                                  value={itemPrices[i] || ''}
                                  onChange={e => setItemPrices(prev => ({ ...prev, [i]: e.target.value.replace(/[^\d.]/g, '') }))}
                                  className="border rounded px-2 py-1 w-28"
                                  dir="ltr"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="p-2 font-bold" dir="ltr">
                                {((parseFloat(itemPrices[i] || '0') || 0) * (Number(it.requested_quantity || it.quantity) || 1)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {r.status === 'PENDING_ADMIN_REVIEW' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-lg p-3">
                          <div className="text-lg font-black text-slate-800">
                            الإجمالي: <span dir="ltr">{totalOf(r).toFixed(2)}</span> ر.س
                          </div>
                          <button onClick={issueQuote} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50">
                            {busy ? '...' : 'إصدار عرض السعر للصيدلية'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
