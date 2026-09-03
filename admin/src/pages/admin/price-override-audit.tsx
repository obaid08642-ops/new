import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

type PriceAuditRecord = {
  id: string;
  pharmacy_id: string;
  pharmacy_name?: string;
  medicine_sku: string;
  medicine_name?: string;
  official_sfda_price: number;
  override_price: number;
  difference_pct: number;
  reason?: string;
  updated_by?: string;
  created_at: string;
};

type PriceAuditResponse = {
  data: PriceAuditRecord[];
  total: number;
  page: number;
  pages: number;
  summary: {
    total_overrides: number;
    flagged_overpriced: number;
    avg_variance_pct: number;
  };
};

export default function PriceOverrideAuditPage() {
  const [data, setData] = useState<PriceAuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch<PriceAuditResponse>(
        `/governance-controls/medicine-price-history${toQuery({ page, limit: 25, search })}`,
      );
      setData(res);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر تحميل سجل تدقيق أسعار الصيدليات.'));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <>
      <Head>
        <title>تدقيق أسعار الصيدليات | نبضة بلس</title>
      </Head>
      <section dir="rtl" className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">سجل تدقيق أسعار الأدوية (Price Override Audit)</h1>
            <p className="mt-1 text-sm text-slate-500">
              مراقبة التزام الصيدليات بالسعر الرسمي المحدد من الهيئة العامة للغذاء والدواء (SFDA) ورصد أي تعديلات سعرية.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="rounded-lg border px-3 py-2 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالدواء أو الصيدلية…"
            />
            <button
              onClick={() => void loadData()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 transition"
            >
              تحديث
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        {/* Stats Header */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">إجمالي التعديلات السعرية</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {data?.summary?.total_overrides ?? (loading ? '…' : 0)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">سجل مشفّر وموثق رقابياً</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">معدل الفارق السعري</p>
            <h2 className="mt-2 text-3xl font-bold text-teal-600">
              {data?.summary?.avg_variance_pct ? `${data.summary.avg_variance_pct.toFixed(1)}%` : '0.0%'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">ضمن الهامش القانوني المسموح</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">التنبيهات السعرية المرتفعة</p>
            <h2 className="mt-2 text-3xl font-bold text-amber-600">
              {data?.summary?.flagged_overpriced ?? 0}
            </h2>
            <p className="mt-1 text-xs text-amber-600">تجاوز السعر الرسمي المعتمد</p>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="p-4">الوقت</th>
                <th className="p-4">الصيدلية</th>
                <th className="p-4">الدواء (SKU)</th>
                <th className="p-4">السعر الرسمي (SFDA)</th>
                <th className="p-4">السعر المعدل</th>
                <th className="p-4">نسبة الفرق</th>
                <th className="p-4">المبرر / المنفّذ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">جارٍ تحميل سجل التدقيق السعري…</td>
                </tr>
              ) : data?.data?.length ? (
                data.data.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-slate-50">
                    <td className="p-4 text-xs text-slate-500">
                      {row.created_at ? new Date(row.created_at).toLocaleString('ar-SA') : '—'}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{row.pharmacy_name || row.pharmacy_id}</td>
                    <td className="p-4">
                      <div>{row.medicine_name || row.medicine_sku}</div>
                      <div className="text-xs text-slate-400">{row.medicine_sku}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{row.official_sfda_price.toFixed(2)} ر.س</td>
                    <td className="p-4 font-semibold text-slate-900">{row.override_price.toFixed(2)} ر.س</td>
                    <td className="p-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          row.difference_pct > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {row.difference_pct > 0 ? `+${row.difference_pct}%` : `${row.difference_pct}%`}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      <div>{row.reason || 'تحديث دوري من المورد'}</div>
                      <div className="text-slate-400 mt-0.5">{row.updated_by || 'النظام التلقائي'}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    لا توجد سجلات تعديل أسعار مطابقة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>إجمالي التعديلات المسجلة: {data?.total || 0}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
              className="rounded border bg-white px-3 py-1 disabled:opacity-40"
            >
              السابق
            </button>
            <span className="px-2 py-1">
              {data?.page || 1} / {data?.pages || 1}
            </span>
            <button
              disabled={page >= (data?.pages || 1) || loading}
              onClick={() => setPage((v) => v + 1)}
              className="rounded border bg-white px-3 py-1 disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
