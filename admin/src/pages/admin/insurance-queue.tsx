import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import EmptyIcon from '../../components/EmptyIcon';

/**
 * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).
 * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=
 * - GET /admin/finance/refunds/queue · POST /admin/finance/refunds/:id/decide
 */
const STATE_AR: Record<string, { ar: string; cls: string }> = {
  PENDING_PROVIDER_REVIEW: { ar: 'بانتظار المزود', cls: 'bg-amber-100 text-amber-700' },
  APPROVED_FULL: { ar: 'قبول كلي', cls: 'bg-green-100 text-green-700' },
  COPAY_PENDING: { ar: 'بانتظار copay', cls: 'bg-blue-100 text-blue-700' },
  COPAY_PAID: { ar: 'تم الدفع', cls: 'bg-green-100 text-green-700' },
  REJECTED: { ar: 'مرفوض', cls: 'bg-red-100 text-red-700' },
};

export default function InsuranceQueuePage() {
  const [tab, setTab] = useState<'requests' | 'refunds'>('requests');
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [stateFilter, setStateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideNote, setDecideNote] = useState('');
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, f] = await Promise.all([
        apiFetch('/admin/insurance/stats').catch(() => null),
        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),
        apiFetch('/admin/finance/refunds/queue').catch(() => []),
      ]);
      setStats(s);
      setRequests(Array.isArray(r) ? r : r?.data || []);
      setRefunds(Array.isArray(f) ? f : f?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => { load(); }, [load]);

  const decideRefund = async (id: string, approve: boolean) => {
    try {
      await apiFetch(`/admin/finance/refunds/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ approve, note: decideNote || undefined }),
      });
      setDecidingId(null);
      setDecideNote('');
      load();
    } catch (e: any) { alert(e?.message || 'فشل القرار'); }
  };

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
      <Head><title>التأمين والمستردات | نبض</title></Head>
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
            {([
              { k: 'requests', label: `طلبات التأمين (${stats?.total ?? requests.length})` },
              { k: 'refunds', label: `طابور المستردات (${refunds.length})` },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-colors ${tab === t.k ? 'bg-white border border-b-white border-slate-200 text-teal-700 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={load} className="px-4 py-2 mb-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">تحديث </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري التحميل…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>
          ) : tab === 'requests' ? (
            requests.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">لا توجد طلبات تأمين {stateFilter && 'بهذه الحالة'}</div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-3">المريض</th><th className="p-3">الخدمة / القناة</th><th className="p-3">المزود</th>
                      <th className="p-3">السعر</th><th className="p-3">copay</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => {
                      const meta = STATE_AR[r.state] || { ar: r.state, cls: 'bg-slate-100 text-slate-600' };
                      return (
                        <tr key={r.id} className="hover:bg-teal-50 cursor-pointer" onClick={() => setSelectedReq(r)}>
                          <td className="p-3 font-medium">{r.patient_name || r.patient_id}</td>
                          <td className="p-3 text-xs">{r.service_type || '—'} · {r.channel || '—'}</td>
                          <td className="p-3 text-xs font-mono">{String(r.provider_id || '').slice(0, 10)}</td>
                          <td className="p-3 font-bold">{r.price} ر.س</td>
                          <td className="p-3 text-xs">{r.copay_amount ? `${r.copay_amount} ر.س (${r.copay_percent}%)` : '—'}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${meta.cls}`}>{meta.ar}</span></td>
                          <td className="p-3 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            refunds.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <EmptyIcon name="document" size={44} color="#0D9488" className="mb-3 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">طابور المستردات فارغ</h3>
                <p className="text-slate-500 text-sm mt-1">طلبات الاسترداد الجديدة من المرضى ستظهر هنا للاعتماد.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {refunds.map((f) => (
                  <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900">حجز {f.booking_kind || ''} · {String(f.booking_id).slice(0, 12)}</div>
                        <div className="text-sm text-slate-600">{f.policy_note_ar}</div>
                        {f.reason && <div className="text-xs text-slate-500">سبب المريض: {f.reason}</div>}
                        <div className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleString('ar-SA-u-ca-gregory')}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-slate-500">دفع {f.amount_paid} ر.س</div>
                        <div className="text-xl font-black text-emerald-600">يُسترد {f.refund_amount} ر.س ({f.refund_percent}%)</div>
                      </div>
                    </div>
                    {decidingId === f.id ? (
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                        <input value={decideNote} onChange={(e) => setDecideNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                        <div className="flex gap-2">
                          <button onClick={() => decideRefund(f.id, true)} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold">اعتماد الاسترداد</button>
                          <button onClick={() => decideRefund(f.id, false)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">رفض</button>
                          <button onClick={() => { setDecidingId(null); setDecideNote(''); }} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">تراجع</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setDecidingId(f.id)} className="mt-4 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold">اتخاذ القرار</button>
                    )}
                  </div>
                ))}
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
                ['التاريخ', selectedReq.createdAt ? new Date(selectedReq.createdAt).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { hour12: false }) : '—'],
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
