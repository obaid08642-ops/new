import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

/**
 * M5: platform commissions + ledger summary.
 * GET /admin/finance/ledger/summary (M3 finance core) · GET /admin/finance/commissions (legacy ledger)
 * Rates (BR): استشارة 15% · صيدلية 10% · معمل/أشعة/عيادة 12% · منزلي/تمريض/طبيعي 18%
 */
const SERVICE_AR: Record<string, string> = {
  consultation: 'استشارات', pharmacy: 'صيدلية', lab: 'مختبر', radiology: 'أشعة',
  clinic: 'عيادات', home_care: 'رعاية منزلية', nursing: 'تمريض', physiotherapy: 'علاج طبيعي',
};
const RATE_AR: Record<string, string> = {
  consultation: '15%', pharmacy: '10%', lab: '12%', radiology: '12%', clinic: '12%',
  home_care: '18%', nursing: '18%', physiotherapy: '18%',
};

export default function CommissionsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [legacy, setLegacy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        apiFetch('/admin/finance/ledger/summary').catch(() => null),
        apiFetch('/admin/finance/commissions').catch(() => ({ data: [] })),
      ]);
      setSummary(s);
      setLegacy(c?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات العمولات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalGross = (summary?.by_service || []).reduce((s: number, r: any) => s + (r.gross || 0), 0);

  return (
    <>
      <Head><title>العمولات والأستاذ | نبض</title></Head>
        <div className="p-8 space-y-6">
          <div className="flex justify-end">
            <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">تحديث </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري التحميل…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gradient-to-l from-teal-600 to-teal-500 rounded-2xl p-6 text-white">
                  <div className="text-sm opacity-80">إجمالي عمولة المنصة (مستحقة)</div>
                  <div className="text-3xl font-black mt-2">{summary?.total_commission ?? 0} ر.س</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="text-sm text-slate-500">إجمالي قيمة الخدمات (Gross)</div>
                  <div className="text-3xl font-black mt-2 text-slate-900">{Math.round(totalGross * 100) / 100} ر.س</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="text-sm text-slate-500">متوسط العمولة الفعلي</div>
                  <div className="text-3xl font-black mt-2 text-indigo-600">
                    {totalGross > 0 ? `${Math.round(((summary?.total_commission || 0) / totalGross) * 1000) / 10}%` : '—'}
                  </div>
                </div>
              </div>

              {/* By service type */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800">العمولات حسب نوع الخدمة</h2>
                  <span className="text-xs text-slate-400">النسب المعتمدة: استشارة 15% · صيدلية 10% · معمل/أشعة/عيادة 12% · منزلي 18%</span>
                </div>
                {(summary?.by_service || []).length === 0 ? (
                  <div className="p-12 text-center text-slate-500">لا قيود مستحقة بعد — تُسجل تلقائيًا عند اكتمال المدفوعات.</div>
                ) : (
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                        <th className="p-3">نوع الخدمة</th><th className="p-3">عدد العمليات</th>
                        <th className="p-3">إجمالي القيمة</th><th className="p-3">النسبة</th><th className="p-3">عمولة المنصة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.by_service.map((r: any) => (
                        <tr key={r._id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium">{SERVICE_AR[r._id] || r._id || 'أخرى'}</td>
                          <td className="p-3">{r.count}</td>
                          <td className="p-3">{Math.round(r.gross * 100) / 100} ر.س</td>
                          <td className="p-3"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{RATE_AR[r._id] || '—'}</span></td>
                          <td className="p-3 font-bold text-emerald-600">{Math.round(r.commission * 100) / 100} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Legacy commission ledger (raw) */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-bold text-slate-800">سجل العمولات التفصيلي ({legacy.length})</h2>
                </div>
                {legacy.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">السجل التفصيلي فارغ.</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="border-b border-slate-200 font-bold text-slate-600">
                          <th className="p-3">المعرف</th><th className="p-3">المزود</th><th className="p-3">المبلغ</th><th className="p-3">العمولة</th><th className="p-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {legacy.map((c: any, i: number) => (
                          <tr key={c._id || c.id || i} className="hover:bg-slate-50">
                            <td className="p-3 font-mono">{String(c._id || c.id || '').slice(0, 10)}</td>
                            <td className="p-3 font-mono">{String(c.providerId || c.provider_id || '').slice(0, 10)}</td>
                            <td className="p-3">{c.amount ?? c.gross_amount ?? '—'}</td>
                            <td className="p-3 text-emerald-600 font-bold">{c.commission ?? c.commission_amount ?? '—'}</td>
                            <td className="p-3">{c.status || c.state || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
    </>
  );
}
