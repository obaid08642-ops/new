import { useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';
import { DataTable } from '@/components/DataTable';

/**
 * P14.23 real-user monitoring: what visitors' browsers measured (patient-web/components-next/web-vitals-reporter.tsx,
 * a quarter of page views), p75 per page type and metric, against the plan's budgets (LCP 2.0 s, INP 200 ms, CLS 0.1).
 */
type Row = { page_type: string; metric: string; count: number; p75: number; good_ratio: number; budget: number | null; within_budget: boolean | null };
type Summary = { days: number; since: string; rows: Row[]; samples: number };

const PAGE_LABELS: Record<string, string> = {
  home: 'الرئيسية', product: 'صفحة منتج', catalogue: 'الكتالوج', doctor: 'صفحة طبيب', doctors: 'قائمة الأطباء', article: 'مقال',
  articles: 'المقالات', lab: 'التحاليل', radiology: 'الأشعة', pharmacy: 'الصيدلية', facility: 'منشأة', condition: 'حالة صحية',
  service: 'خدمة', cart: 'السلة', checkout: 'الدفع', orders: 'الطلبات', account: 'الحساب', auth: 'الدخول', other: 'أخرى',
};

function show(metric: string, value: number | null) {
  if (value === null) return '—';
  return metric === 'CLS' ? value.toFixed(3) : `${Math.round(value)} ms`;
}

export default function WebVitalsPage() {
  const [days, setDays] = useState<1 | 7 | 30>(1);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    adminFetch<Summary>(`/api/admin/admin/rum/summary?days=${days}`)
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((cause) => { if (!cancelled) setError(apiErrorMessage(cause, 'تعذر تحميل قياسات الأداء.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);
  const pick = (d: 1 | 7 | 30) => { if (d !== days) { setLoading(true); setDays(d); } };

  return (
    <>
      <Head><title>أداء الموقع للمستخدمين | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">أداء الموقع للمستخدمين</h1>
          <p className="mt-1 text-sm text-slate-500">قياسات من متصفحات الزوار (ربع الزيارات): القيمة عند المئين 75 لكل نوع صفحة، مقارنة بالحدود: LCP ≤ 2000 ms، INP ≤ 200 ms، CLS ≤ 0.1.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          {([1, 7, 30] as const).map((d) => (
            <button key={d} onClick={() => pick(d)} className={`rounded-lg px-4 py-2 text-sm font-bold ${days === d ? 'bg-teal-700 text-white' : 'border bg-white'}`}>
              {d === 1 ? 'آخر 24 ساعة' : `آخر ${d} يوماً`}
            </button>
          ))}
        </div>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ التحميل…</p> : null}
        {!loading && data ? (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{data.samples} قياساً منذ {new Date(data.since).toLocaleString('ar-SA-u-ca-gregory')}</p>
            <div className="mt-4 overflow-x-auto">
              <DataTable
                bare
                dense
                rows={data.rows}
                getRowKey={(r) => `${r.page_type}:${r.metric}`}
                emptyText="لا قياسات بعد في هذه الفترة."
                columns={[
                  { key: 'page', header: 'نوع الصفحة', render: (r) => PAGE_LABELS[r.page_type] || r.page_type },
                  { key: 'metric', header: 'المقياس', className: 'font-mono', render: (r) => r.metric },
                  { key: 'p75', header: 'p75', className: 'font-mono', render: (r) => show(r.metric, r.p75) },
                  { key: 'budget', header: 'الحد', className: 'font-mono', render: (r) => show(r.metric, r.budget) },
                  { key: 'state', header: 'الحالة', render: (r) => (r.within_budget === null ? '—' : r.within_budget ? <span className="font-bold text-teal-700">ضمن الحد</span> : <span className="font-bold text-rose-700">فوق الحد</span>) },
                  { key: 'good', header: 'نسبة "جيد"', render: (r) => `${Math.round(r.good_ratio * 100)}%` },
                  { key: 'count', header: 'العينات', render: (r) => r.count },
                ]}
              />
            </div>
          </article>
        ) : null}
      </section>
    </>
  );
}
