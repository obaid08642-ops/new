import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

type Medicine = { id: string; name_ar?: string; name_en?: string; price?: number; availability_status?: string; medical_review_status?: string; is_deleted?: boolean };
type PriceRow = { id: string; before_price: number | null; after_price: number; reason: string; changed_by: string; createdAt: string };
type Shortage = { id: string; medicine_id: string; medicine_name?: string; note?: string; status: string; createdAt?: string };
type PriceOverride = { id: string; order_id: string; offer_id: string; pharmacy_account_id: string; sku: string; catalog_price: number; override_price: number; reason: string; changed_at: string };

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

export default function CatalogGovernancePage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'overrides'>('catalog');
  const [items, setItems] = useState<Medicine[]>([]);
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [history, setHistory] = useState<PriceRow[]>([]);
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catalog, shortage, overrideRes] = await Promise.all([
        apiFetch<{ data: Medicine[] }>(`/medicines/admin/catalog?page=1&limit=50&q=${encodeURIComponent(search)}`),
        apiFetch<{ data: Shortage[] }>('/medicines/admin/shortage-reports?status=pending&page=1&limit=50'),
        apiFetch<{ data: PriceOverride[]; items?: PriceOverride[] }>('/pharmacy/price-overrides?page=1&limit=50').catch(() => ({ data: [] })),
      ]);
      setItems(catalog.data || []);
      setShortages(shortage.data || []);
      setOverrides(overrideRes.data || (overrideRes as any).items || []);
    } catch (cause: any) {
      setError(cause?.message || 'تعذر تحميل حوكمة الكتالوج.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openHistory(item: Medicine) {
    setSelected(item);
    setPrice(String(item.price ?? ''));
    try {
      const result = await apiFetch<{ data: PriceRow[] }>(`/medicines/admin/catalog/${encodeURIComponent(item.id)}/price-history?page=1&limit=50`);
      setHistory(result.data || []);
    } catch (cause: any) {
      setError(cause?.message || 'تعذر تحميل سجل السعر.');
    }
  }

  async function savePrice() {
    if (!selected || !reason.trim() || reason.trim().length < 5 || !Number.isFinite(Number(price))) {
      setError('الصنف والسعر وسبب لا يقل عن خمسة أحرف مطلوبة.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/medicines/admin/catalog/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ price: Number(price), reason: reason.trim() }),
      });
      setMessage('تم حفظ السعر وإضافة سجل تدقيق.');
      setReason('');
      await load();
      await openHistory({ ...selected, price: Number(price) });
    } catch (cause: any) {
      setError(cause?.message || 'تعذر حفظ السعر.');
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(file?: File) {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      const csv = await file.text();
      const rows = parseCsv(csv);
      if (!rows.length) throw new Error('ملف CSV فارغ أو بلا صفوف بيانات.');
      const result = await apiFetch<{ imported?: number; failed?: number; failed_rows?: unknown[]; needs_review?: number }>('/medicines/admin/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv, auto_approve: false }),
      });
      const imported = Number(result.imported ?? 0);
      const failed = Number(result.failed ?? 0);
      const needsReview = Number(result.needs_review ?? imported);
      setMessage(`تم إدخال ${imported} صفاً؛ ${needsReview} قيد المراجعة الطبية، وفشل ${failed}.`);
      await load();
    } catch (cause: any) {
      setError(cause?.message || 'تعذر استيراد CSV.');
    } finally {
      setSaving(false);
    }
  }

  async function decideShortage(row: Shortage, action: 'approve' | 'reject') {
    const decisionReason = window.prompt(action === 'approve' ? 'سبب اعتماد النقص:' : 'سبب رفض النقص:');
    if (!decisionReason || decisionReason.trim().length < 5) return;
    setSaving(true);
    try {
      await apiFetch(`/medicines/admin/shortage-reports/${encodeURIComponent(row.id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason: decisionReason.trim() }),
      });
      await load();
    } catch (cause: any) {
      setError(cause?.message || 'تعذر حفظ قرار النقص.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>حوكمة الكتالوج وتجاوز الأسعار | نبض</title>
      </Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">حوكمة الكتالوج وتجاوز الأسعار</h1>
            <p className="mt-1 text-sm text-slate-500">
              كتالوج الأدوية الموحد (MongoDB Master)، طابور تدقيق النواقص، وسجل تجاوز أسعار الصيدليات (Price Override Audit Trail).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'catalog' ? 'bg-teal-700 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-50'
              }`}
            >
              الكتالوج والنواقص
            </button>
            <button
              onClick={() => setActiveTab('overrides')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'overrides' ? 'bg-teal-700 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-50'
              }`}
            >
              تدقيق تجاوز الأسعار ({overrides.length})
            </button>
          </div>
        </header>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-lg bg-teal-50 p-3 text-teal-800">{message}</p> : null}

        {activeTab === 'overrides' ? (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2">سجل تجاوز الأسعار (Price Override Audit Trail)</h2>
            <p className="text-sm text-slate-500 mb-6">
              يتم هنا رصد أي تغيير قام به الصيدلي على تسعيرة الكتالوج الرسمية أثناء تقديم العرض للمريض، مع توثيق السعر الأصلي، السعر المعدل، وسبب التعديل الإلزامي.
            </p>
            {overrides.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-xl">
                لا توجد سجلات تجاوز أسعار حالياً من الصيدليات.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="p-3">رقم الطلب / العرض</th>
                      <th className="p-3">رمز الصنف (SKU)</th>
                      <th className="p-3">معرف الصيدلية</th>
                      <th className="p-3">سعر الكتالوج</th>
                      <th className="p-3">السعر المعدل</th>
                      <th className="p-3">سبب التعديل</th>
                      <th className="p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((row, idx) => (
                      <tr key={row.id || idx} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs text-slate-600">
                          {row.order_id ? `#${row.order_id.slice(-6)}` : '—'} / {row.offer_id ? row.offer_id.slice(-6) : '—'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{row.sku}</td>
                        <td className="p-3 font-mono text-xs text-slate-500">{row.pharmacy_account_id ? row.pharmacy_account_id.slice(-8) : '—'}</td>
                        <td className="p-3 text-slate-500">{row.catalog_price ?? 0} ر.س</td>
                        <td className="p-3 font-bold text-rose-700">{row.override_price ?? 0} ر.س</td>
                        <td className="p-3 text-xs bg-slate-50 rounded p-1.5">{row.reason || 'بدون سبب'}</td>
                        <td className="p-3 text-xs text-slate-400">
                          {row.changed_at ? new Date(row.changed_at).toLocaleString('ar-SA') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
                بحث في الكتالوج
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-2 w-full rounded border p-2 text-sm"
                  placeholder="الاسم أو المادة الفعالة"
                />
              </label>
              <label className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
                استيراد CSV إلى طابور المراجعة
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void importCsv(e.target.files?.[0])}
                  disabled={saving}
                  className="mt-2 block w-full text-sm"
                />
                <span className="mt-2 block text-xs text-slate-500">الأعمدة الأساسية: name_ar, name_en, price, active_ingredient.</span>
              </label>
              <div className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
                <strong>قاعدة الحوكمة</strong>
                <p className="mt-2 text-slate-500">أي تغيير سعر يحتاج سبباً موثقاً؛ وأي استيراد لا يصبح عاماً قبل مراجعة طبية.</p>
              </div>
            </div>

            {loading ? (
              <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل الكتالوج…</p>
            ) : (
              <div className="grid gap-6 xl:grid-cols-3">
                <article className="rounded-2xl border bg-white p-5 shadow-sm xl:col-span-2">
                  <h2 className="text-xl font-bold mb-4">الأصناف والأسعار</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-sm">
                      <thead>
                        <tr className="border-b text-slate-500">
                          <th className="p-2">الصنف</th>
                          <th className="p-2">السعر</th>
                          <th className="p-2">الحالة</th>
                          <th className="p-2">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length ? (
                          items.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-slate-50">
                              <td className="p-2">
                                <strong>{item.name_ar || item.name_en}</strong>
                                <span className="block text-xs text-slate-400 font-mono">{item.id}</span>
                              </td>
                              <td className="p-2 font-bold">{item.price ?? 0} ر.س</td>
                              <td className="p-2 text-xs">
                                {item.availability_status || 'none'} · {item.medical_review_status || '—'}
                              </td>
                              <td className="p-2">
                                <button
                                  onClick={() => void openHistory(item)}
                                  className="rounded border border-slate-300 hover:bg-slate-100 px-3 py-1 text-xs font-medium"
                                >
                                  السعر والتاريخ
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500">
                              لا توجد أصناف مطابقة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>

                <aside className="space-y-6">
                  <article className="rounded-2xl border bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-bold mb-3">قرارات النواقص المعلقة</h2>
                    {shortages.length ? (
                      <ul className="divide-y">
                        {shortages.map((row) => (
                          <li key={row.id} className="py-3">
                            <strong>{row.medicine_name || row.medicine_id}</strong>
                            <p className="mt-1 text-xs text-slate-500">{row.note || 'بلا ملاحظة'}</p>
                            <div className="mt-2 flex gap-2">
                              <button
                                disabled={saving}
                                onClick={() => void decideShortage(row, 'approve')}
                                className="rounded bg-teal-700 hover:bg-teal-800 px-3 py-1 text-xs text-white"
                              >
                                اعتماد
                              </button>
                              <button
                                disabled={saving}
                                onClick={() => void decideShortage(row, 'reject')}
                                className="rounded border border-rose-300 hover:bg-rose-50 px-3 py-1 text-xs text-rose-700"
                              >
                                رفض
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">لا توجد طلبات نقص معلقة.</p>
                    )}
                  </article>

                  {selected ? (
                    <article className="rounded-2xl border bg-white p-5 shadow-sm">
                      <h2 className="text-xl font-bold mb-3">سجل وتعديل سعر {selected.name_ar || selected.name_en}</h2>
                      <div className="space-y-3">
                        <label className="block text-sm">
                          السعر الجديد
                          <input
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded border p-2 text-sm"
                          />
                        </label>
                        <label className="block text-sm">
                          سبب التغيير (إلزامي للتدقيق)
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            minLength={5}
                            className="mt-1 w-full rounded border p-2 text-sm"
                            rows={3}
                          />
                        </label>
                        <button
                          disabled={saving}
                          onClick={() => void savePrice()}
                          className="w-full rounded bg-teal-700 hover:bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          حفظ وتوثيق السعر
                        </button>
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">السجل السابق للتغييرات</h3>
                      <ul className="divide-y text-xs">
                        {history.map((row) => (
                          <li key={row.id} className="py-2 text-slate-600">
                            {row.before_price ?? 'جديد'} ← {row.after_price} ر.س · {row.reason} ·{' '}
                            {new Date(row.createdAt).toLocaleString('ar-SA')}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ) : null}
                </aside>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
