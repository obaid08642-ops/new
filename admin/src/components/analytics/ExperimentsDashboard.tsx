import { useCallback, useEffect, useState } from 'react';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

type Funnel = {
  channels: Array<{
    channel: string;
    registered: number;
    verified: number;
    first_booking: number;
    repeat: number;
    conv_verified_pct: number | null;
    conv_first_pct: number | null;
    conv_repeat_pct: number | null;
  }>;
};
type Cohorts = {
  cohorts: Array<{
    cohort: string;
    size: number;
    d1: number;
    d7: number;
    d30: number;
    ltv_avg_payers: number;
    payers: number;
  }>;
};
type Nps = {
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number | null;
  distribution: Record<string, number>;
};

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

/**
 * Growth-experiments view backed exclusively by real backend aggregates:
 * - GET admin/analytics-suite/funnels
 * - GET admin/analytics-suite/cohorts
 * - GET admin/analytics-suite/nps
 * There is no A/B-experiment CRUD backend, so this dashboard reads the
 * conversion/retention/NPS aggregates that experiment readouts are built on.
 */
export function ExperimentsDashboard() {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [cohorts, setCohorts] = useState<Cohorts | null>(null);
  const [nps, setNps] = useState<Nps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const suffix = toQuery({ from, to });
      const [f, c, n] = await Promise.all([
        adminFetch<Funnel>(`/api/admin/admin/analytics-suite/funnels${suffix}`),
        adminFetch<Cohorts>(`/api/admin/admin/analytics-suite/cohorts${suffix}`),
        adminFetch<Nps>(`/api/admin/admin/analytics-suite/nps${suffix}`),
      ]);
      setFunnel(f);
      setCohorts(c);
      setNps(n);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل بيانات التجارب.'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="text-xs text-slate-500">
          من
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-500">
          إلى
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2 text-sm"
          />
        </label>
        <button
          onClick={() => void load()}
          className="self-end rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white"
        >
          تحديث
        </button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل بيانات التجارب…</p>
      ) : (
        <>
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">مسارات التحويل بحسب القناة</h2>
            {(funnel?.channels?.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-slate-400">لا بيانات بعد — تتراكم مع الاستخدام الفعلي</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-right">القناة</th>
                      <th className="p-3 text-right">مسجل</th>
                      <th className="p-3 text-right">موثق</th>
                      <th className="p-3 text-right">أول حجز</th>
                      <th className="p-3 text-right">متكرر</th>
                      <th className="p-3 text-right">تحويل التوثيق %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(funnel?.channels || []).map((row) => (
                      <tr key={row.channel} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-bold">{row.channel}</td>
                        <td className="p-3">{row.registered}</td>
                        <td className="p-3">{row.verified}</td>
                        <td className="p-3">{row.first_booking}</td>
                        <td className="p-3">{row.repeat}</td>
                        <td className="p-3">{row.conv_verified_pct ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">الاحتفاظ بحسب الدفعة</h2>
            {(cohorts?.cohorts?.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-slate-400">لا بيانات بعد — تتراكم مع الاستخدام الفعلي</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-right">الدفعة</th>
                      <th className="p-3 text-right">الحجم</th>
                      <th className="p-3 text-right">يوم 1</th>
                      <th className="p-3 text-right">يوم 7</th>
                      <th className="p-3 text-right">يوم 30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cohorts?.cohorts || []).map((row) => (
                      <tr key={row.cohort} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-bold">{row.cohort}</td>
                        <td className="p-3">{row.size}</td>
                        <td className="p-3">{row.d1}</td>
                        <td className="p-3">{row.d7}</td>
                        <td className="p-3">{row.d30}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">صافي نقاط الترويج NPS</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">المجموع</div>
                <div className="text-2xl font-bold">{nps?.total ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">NPS</div>
                <div className="text-2xl font-bold text-teal-700">{nps?.nps ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">مروجون</div>
                <div className="text-2xl font-bold text-green-600">{nps?.promoters ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">منتقدون</div>
                <div className="text-2xl font-bold text-red-600">{nps?.detractors ?? '—'}</div>
              </div>
            </div>
          </article>
        </>
      )}
    </div>
  );
}
