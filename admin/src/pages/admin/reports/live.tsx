import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';

interface LiveMetrics {
  onlinePatients: number;
  onlineProviders: number;
  liveOrders: number;
  liveBookings: number;
  providerAvailability: { available: number; busy: number; offline: number };
  stuckOrders: any[];
  paymentFailures: any[];
  lastUpdated: string;
}

export default function LiveMonitoringPage() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);

  const fetchMetrics = useCallback(async () => {
    try {
      const data: any = await adminFetch('/api/admin/admin/reports/live');
      setMetrics(data);
      setError('');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل المراقبة الحية.'));
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const timer = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchMetrics, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <>
        <Head><title>المراقبة الحية | نبض بلس</title></Head>
        <section dir="rtl" className="p-6 md:p-8 text-center">
          <div className="rounded-2xl border bg-white p-10 shadow-sm">
            <p className="text-slate-500">جارٍ تحميل المراقبة الحية…</p>
          </div>
        </section>
      </>
    );
  }

  const formatDate = (date: string) => new Date(date).toLocaleTimeString('ar-SA');
  const formatAmount = (amount: number) => amount.toLocaleString('ar-SA');

  return (
    <>
      <Head><title>المراقبة الحية | نبض بلس</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">المراقبة الحية</h1>
            <p className="mt-1 text-sm text-slate-500">
              {metrics?.lastUpdated ? `آخر تحديث: ${formatDate(metrics.lastUpdated)}` : 'جاري التحديث…'}
              {autoRefresh && <span className="ml-3 inline-flex items-center gap-1 text-teal-700 text-sm">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>تلقائي ({refreshInterval / 1000}ث)
              </span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded border-slate-300" />
              <span className="text-sm">تحديث تلقائي</span>
            </label>
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="rounded-lg border p-2 text-sm">
              <option value={5000}>5 ثوانٍ</option>
              <option value={10000}>10 ثوانٍ</option>
              <option value={30000}>30 ثانية</option>
              <option value={60000}>دقيقة</option>
            </select>
            <button onClick={fetchMetrics} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">تحديث الآن</button>
          </div>
        </header>

        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></path></svg>
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics?.onlinePatients ?? 0}</p>
                <p className="text-sm text-slate-500">مرضى متصلون</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></path></svg>
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics?.onlineProviders ?? 0}</p>
                <p className="text-sm text-slate-500">مزودون متصلون</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></path></svg>
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics?.liveOrders ?? 0}</p>
                <p className="text-sm text-slate-500">طلبات حية</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></path></svg>
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics?.liveBookings ?? 0}</p>
                <p className="text-sm text-slate-500">حجوزات حية</p>
              </div>
            </div>
          </article>
        </div>

        {/* Provider Availability */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">توفر المزودين</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{metrics?.providerAvailability?.available ?? 0}</p>
              <p className="text-sm text-green-600">متاحون</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">{metrics?.providerAvailability?.busy ?? 0}</p>
              <p className="text-sm text-yellow-600">مشغولون</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-slate-600">{metrics?.providerAvailability?.offline ?? 0}</p>
              <p className="text-sm text-slate-500">غير متصلين</p>
            </div>
          </div>
        </article>

        {/* Stuck Orders */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">طلبات معلقة (Stuck)</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${(metrics?.stuckOrders?.length ?? 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
              {(metrics?.stuckOrders?.length ?? 0) > 0 ? 'تنبيه' : 'طبيعي'}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead><tr className="border-b text-slate-500">
                <th className="p-2">المعرف</th>
                <th className="p-2">النوع</th>
                <th className="p-2">المريض</th>
                <th className="p-2">المزود</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">معلق منذ</th>
                <th className="p-2">إجراءات</th>
              </tr></thead>
              <tbody>
                {metrics?.stuckOrders?.length ? metrics.stuckOrders.map((o: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-mono text-xs">{o.id?.slice(0, 16)}…</td>
                    <td className="p-2">{o.kind || o.type || '—'}</td>
                    <td className="p-2">{o.patient_name || o.patient?.name || '—'}</td>
                    <td className="p-2">{o.provider_name || o.provider?.name || '—'}</td>
                    <td className="p-2">{o.state || o.status || '—'}</td>
                    <td className="p-2">{o.stuck_since ? formatDate(o.stuck_since) : '—'}</td>
                    <td className="p-2"><button className="text-teal-700 underline text-sm">فتح</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">لا توجد طلبات معلقة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Payment Failures */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">فشل المدفوعات</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${(metrics?.paymentFailures?.length ?? 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
              {(metrics?.paymentFailures?.length ?? 0) > 0 ? 'تنبيه' : 'طبيعي'}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead><tr className="border-b text-slate-500">
                <th className="p-2">المعرف</th>
                <th className="p-2">البوابة</th>
                <th className="p-2">المبلغ</th>
                <th className="p-2">الخطأ</th>
                <th className="p-2">المريض</th>
                <th className="p-2">التاريخ</th>
              </tr></thead>
              <tbody>
                {metrics?.paymentFailures?.length ? metrics.paymentFailures.map((p: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-mono text-xs">{p.id?.slice(0, 16)}…</td>
                    <td className="p-2">{p.gateway || '—'}</td>
                    <td className="p-2">{formatAmount(p.amount || 0)}</td>
                    <td className="p-2 text-rose-600">{p.error_code || p.error || '—'}</td>
                    <td className="p-2">{p.patient_name || p.patient?.name || '—'}</td>
                    <td className="p-2">{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">لا توجد فشل مدفوعات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}