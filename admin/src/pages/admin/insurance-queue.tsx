import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { dateLocale } from '../../utils/dates';
import { DataTable } from '@/components/DataTable';

/**
 * M5: insurance supervision (BR-2). Refunds are decided only on the order page and the returns page (owner decision #952).
 * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=
 */
const STATE_AR: Record<string, { ar: string; cls: string }> = {
  PENDING_PROVIDER_REVIEW: { ar: 'بانتظار المزود', cls: 'bg-amber-100 text-amber-700' },
  APPROVED_FULL: { ar: 'قبول كلي', cls: 'bg-green-100 text-green-700' },
  COPAY_PENDING: { ar: 'بانتظار copay', cls: 'bg-blue-100 text-blue-700' },
  COPAY_PAID: { ar: 'تم الدفع', cls: 'bg-green-100 text-green-700' },
  REJECTED: { ar: 'مرفوض', cls: 'bg-red-100 text-red-700' },
};

export default function InsuranceQueuePage() {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [stateFilter, setStateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        apiFetch('/api/admin/admin/insurance/stats').catch(() => null),
        apiFetch(`/api/admin/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),
      ]);
      setStats(s);
      setRequests(Array.isArray(r) ? r : r?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => { load(); }, [load]);


  const statCard = (key: string, label: string, cls: string) => (
    <button
      onClick={() => setStateFilter(stateFilter === key ? '' : key)}
      className={`bg-white rounded-xl border p-4 text-right transition-all ${stateFilter === key ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'}`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-black mt-1 ${cls}`}>{stats?.by_state?.[key]?.count ?? 0}</div>
      <div className="text-[11px] text-slate-400 mt-1">{Math.round(stats?.by_state?.[key]?.total_price ?? 0)} ر.س إجمالي</div>
    </button>
  );

  return (
    <>
      <Head><title>التأمين | نبض</title></Head>
        <div className="p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {statCard('PENDING_PROVIDER_REVIEW', 'بانتظار قرار المزود', 'text-amber-600')}
            {statCard('COPAY_PENDING', 'بانتظار دفع المريض', 'text-blue-600')}
            {statCard('COPAY_PAID', 'مدفوع — جاهز للخدمة', 'text-green-600')}
            {statCard('APPROVED_FULL', 'قبول كلي', 'text-green-700')}
            {statCard('REJECTED', 'مرفوض', 'text-red-600')}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <div className="flex-1" />
            <button onClick={load} className="px-4 py-2 mb-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">تحديث </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري التحميل…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>
          ) : (
            requests.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">لا توجد طلبات تأمين {stateFilter && 'بهذه الحالة'}</div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <DataTable
                  bare
                  dense
                  rows={requests}
                  getRowKey={(r) => String(r.id)}
                  onRowClick={(r) => setSelectedReq(r)}
                  rowClassName={() => 'hover:bg-teal-50'}
                  columns={[
                    { key: 'patient', header: 'المريض', className: 'font-medium', render: (r) => r.patient_name || r.patient_id },
                    { key: 'service', header: 'الخدمة / القناة', className: 'text-xs', render: (r) => <>{r.service_type || '—'} · {r.channel || '—'}</> },
                    { key: 'provider', header: 'المزود', className: 'text-xs font-mono', render: (r) => String(r.provider_id || '').slice(0, 10) },
                    { key: 'price', header: 'السعر', className: 'font-bold', render: (r) => `${r.price} ر.س` },
                    { key: 'copay', header: 'copay', className: 'text-xs', render: (r) => (r.copay_amount ? `${r.copay_amount} ر.س (${r.copay_percent}%)` : '—') },
                    { key: 'state', header: 'الحالة', render: (r) => {
                      const meta = STATE_AR[r.state] || { ar: r.state, cls: 'bg-slate-100 text-slate-600' };
                      return <span className={`px-2 py-1 rounded-full text-xs font-bold ${meta.cls}`}>{meta.ar}</span>;
                    } },
                    { key: 'date', header: 'التاريخ', className: 'text-xs text-slate-500', render: (r) => new Date(r.createdAt).toLocaleDateString(dateLocale()) },
                  ]}
                />
              </div>
            )
          )}
        </div>

      {/* Insurance request detail drawer */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={() => setSelectedReq(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">تفاصيل طلب التأمين</h3>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['المريض', selectedReq.patient_name || selectedReq.patient_id],
                ['الخدمة', selectedReq.service_type],
                ['القناة', selectedReq.channel],
                ['المزود', selectedReq.provider_name || selectedReq.provider_id],
                ['السعر', selectedReq.price != null ? `${selectedReq.price} ر.س` : '—'],
                ['نسبة التحمل', selectedReq.copay_amount ? `${selectedReq.copay_amount} ر.س (${selectedReq.copay_percent ?? '—'}%)` : '—'],
                ['الحالة', (STATE_AR[selectedReq.state] || {}).ar || selectedReq.state],
                ['كود NPHIES', selectedReq.nphies_code || '—'],
                ['التاريخ', selectedReq.createdAt ? new Date(selectedReq.createdAt).toLocaleString(dateLocale(), { hour12: false, numberingSystem: 'latn' }) : '—'],
                ['ملاحظات', selectedReq.note || selectedReq.notes || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4 border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-bold text-left break-all">{String(v ?? '—')}</span>
                </div>
              ))}
            </div>
            {/* Any extra fields not shown above */}
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 font-bold">كل الحقول الخام</summary>
              <pre className="mt-2 bg-slate-50 rounded-lg p-3 overflow-x-auto" dir="ltr">{JSON.stringify(selectedReq, null, 2)}</pre>
            </details>
            <button onClick={() => setSelectedReq(null)} className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold">إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}
