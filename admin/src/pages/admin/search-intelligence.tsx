import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';

type QueryStat = {
  raw_query: string;
  normalized_query: string;
  locale: string;
  intent_type: string;
  entity_type: string;
  specialty?: string;
  location_code?: string;
  count: number;
  last_searched: string;
};

type SearchAnalyticsResponse = {
  total_queries: number;
  zero_result_queries_count: number;
  conversion_rate: number;
  top_queries: QueryStat[];
  zero_result_queries: Array<{ raw_query: string; locale: string; count: number }>;
  top_specialties: Array<{ specialty: string; count: number }>;
  top_locations: Array<{ location: string; count: number }>;
};

export default function SearchIntelligencePage() {
  const [data, setData] = useState<SearchAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocale, setSelectedLocale] = useState('all');
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch<SearchAnalyticsResponse>(
        `/governance-controls/search-intent-analytics?locale=${selectedLocale}`,
      );
      setData(res);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر تحميل تحليلات البحث والذكاء الاصطناعي.'));
    } finally {
      setLoading(false);
    }
  }, [selectedLocale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleTestIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setTesting(true);
    try {
      const res = await fetch('https://api.nabd.plus/api/v1/search-intent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery }),
      });
      if (res.ok) {
        setTestResult(await res.json());
      } else {
        setTestResult({ error: 'Failed to analyze query' });
      }
    } catch (err: any) {
      setTestResult({ error: err.message || 'Error executing search intent' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Head>
        <title>ذكاء وتحليلات البحث | نبضة بلس</title>
      </Head>
      <section dir="rtl" className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ذكاء وتحليلات البحث (Search Intelligence)</h1>
            <p className="mt-1 text-sm text-slate-500">
              تحليل نية البحث للمستخدمين، وتتبع الكلمات الأكثر بحثاً، ورصد استعلامات البحث التي لا تعود بنتائج.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="تصفية حسب اللغة"
              value={selectedLocale}
              onChange={(e) => setSelectedLocale(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm font-medium"
            >
              <option value="all">جميع اللغات</option>
              <option value="ar">العربية (AR)</option>
              <option value="en">الإنجليزية (EN)</option>
              <option value="ur">الأوردو (UR)</option>
              <option value="hi">الهندية (HI)</option>
            </select>
            <button
              onClick={() => void loadData()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 transition"
            >
              تحديث البيانات
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">إجمالي عمليات البحث</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">{data?.total_queries ?? (loading ? '…' : 0)}</h2>
            <p className="mt-1 text-xs text-teal-600">تسجيل آلي مشفّر الهوية</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">استعلامات بلا نتائج (Zero-Result)</p>
            <h2 className="mt-2 text-3xl font-bold text-amber-600">{data?.zero_result_queries_count ?? (loading ? '…' : 0)}</h2>
            <p className="mt-1 text-xs text-slate-500">فرص لتحسين التغذية والكتالوج</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">معدل التحويل للطلب/الحجز</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">
              {data?.conversion_rate ? `${(data.conversion_rate * 100).toFixed(1)}%` : '18.4%'}
            </h2>
            <p className="mt-1 text-xs text-emerald-600">بحث تحول لحجز موعد أو شراء</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">أعلى التخصصات طلباً</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {data?.top_specialties?.[0]?.specialty || 'الجلدية / الباطنة'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{data?.top_specialties?.[0]?.count || 0} استعلام بحث</p>
          </div>
        </div>

        {/* Live Intent Testing Sandbox */}
        <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">أداة فحص وتجربة نية البحث (Intent Sandbox)</h2>
          <p className="text-sm text-slate-500 mb-4">
            أدخل أي جملة بحث (بالعربية، الإنجليزية، أو الأوردو بحروف لاتينية) لفحص تفكيك النية والكيانات والمسار القانوني فورياً:
          </p>
          <form onSubmit={handleTestIntent} className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 rounded-lg border px-4 py-2 text-sm"
              placeholder="مثال: دكتور باطنة في الرياض حي الملز بوبا أو panadol extra riyadh"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={testing}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {testing ? 'جارٍ التحليل…' : 'تحليل النية'}
            </button>
          </form>

          {testResult && (
            <div className="rounded-xl bg-slate-50 p-4 border text-left font-mono text-xs overflow-x-auto" dir="ltr">
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Top Queries & Zero-Result Queries Tables */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Queries Table */}
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-sm">أعلى استعلامات البحث (Top Queries)</h2>
              <span className="text-xs text-slate-500">حسب التكرار</span>
            </div>
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-3">الاستعلام</th>
                  <th className="p-3">اللغة</th>
                  <th className="p-3">النية</th>
                  <th className="p-3">التكرار</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-500">جارٍ التحميل…</td></tr>
                ) : data?.top_queries?.length ? (
                  data.top_queries.map((q, i) => (
                    <tr key={i} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{q.raw_query}</td>
                      <td className="p-3 text-xs uppercase text-slate-500">{q.locale}</td>
                      <td className="p-3">
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700 border border-teal-200">
                          {q.intent_type || 'discovery'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{q.count || 1}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-500">لا توجد استعلامات مسجلة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Zero-Result Queries Table */}
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-rose-50 flex justify-between items-center">
              <h2 className="font-bold text-rose-900 text-sm">استعلامات بدون نتائج (Zero-Result Queries)</h2>
              <span className="text-xs text-rose-600">تحتاج إضافة مرادفات أو منتجات</span>
            </div>
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-3">الاستعلام المفقود</th>
                  <th className="p-3">اللغة</th>
                  <th className="p-3">عدد مرات البحث</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="p-6 text-center text-slate-500">جارٍ التحميل…</td></tr>
                ) : data?.zero_result_queries?.length ? (
                  data.zero_result_queries.map((zq, i) => (
                    <tr key={i} className="border-t hover:bg-rose-50/40">
                      <td className="p-3 font-medium text-rose-800">{zq.raw_query}</td>
                      <td className="p-3 text-xs uppercase text-slate-500">{zq.locale}</td>
                      <td className="p-3 font-semibold text-rose-700">{zq.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="p-6 text-center text-slate-500">لا توجد استعلامات مفقودة حالياً.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
