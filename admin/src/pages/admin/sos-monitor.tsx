import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import EmptyIcon from '../../components/EmptyIcon';

/**
 * M5: live SOS monitoring — polls GET /emergency/active every 10s,
 * assign hospital + resolve with notes (BR: إسعاف طارئ).
 */
interface SosCase {
  id: string;
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string;
  status?: string;
  state?: string;
  location?: { lat?: number; lng?: number; address?: string };
  lat?: number; lng?: number;
  hospital_id?: string;
  created_at?: string;
  createdAt?: string;
  notes?: string;
}

const STATUS_AR: Record<string, string> = {
  ACTIVE: 'نشط الآن', TRIGGERED: 'نشط الآن', ASSIGNED: 'تم إسناد مستشفى',
  RESOLVED: 'تمت المعالجة', CANCELLED: 'ملغى',
};

export default function SosMonitorPage() {
  const [cases, setCases] = useState<SosCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [hospitalFor, setHospitalFor] = useState<Record<string, string>>({});

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const data = await apiFetch('/emergency/active');
      setCases(Array.isArray(data) ? data : data?.data || []);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل حالات الطوارئ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 10000);
    return () => clearInterval(t);
  }, [load]);

  const assign = async (id: string) => {
    const hospital_id = (hospitalFor[id] || '').trim();
    if (!hospital_id) { alert('أدخل معرّف المستشفى أولًا'); return; }
    try {
      await apiFetch(`/emergency/${id}/assign`, { method: 'POST', body: JSON.stringify({ hospital_id }) });
      load(false);
    } catch (e: any) { alert(e?.message || 'فشل الإسناد'); }
  };

  const resolve = async (id: string) => {
    try {
      await apiFetch(`/emergency/${id}/resolve`, { method: 'POST', body: JSON.stringify({ notes: resolveNotes }) });
      setResolvingId(null);
      setResolveNotes('');
      load(false);
    } catch (e: any) { alert(e?.message || 'فشل الإنهاء'); }
  };

  const activeCount = cases.filter((c) => !['RESOLVED', 'CANCELLED'].includes(c.status || c.state || '')).length;

  return (
    <>
      <Head><title>مراقبة الطوارئ SOS | نبض</title></Head>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg font-bold text-sm ${activeCount > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                {activeCount > 0 ? `${activeCount} حالة نشطة الآن` : 'لا حالات نشطة — الوضع آمن'}
              </span>
              {lastRefresh && <span className="text-xs text-slate-400">آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA-u-ca-gregory')} (تحديث تلقائي كل 10 ثوانٍ)</span>}
            </div>
            <button onClick={() => load(true)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">تحديث الآن </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري تحميل حالات الطوارئ…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <p className="text-red-700 font-bold">{error}</p>
              <button onClick={() => load(true)} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">إعادة المحاولة</button>
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <EmptyIcon name="sos" size={44} color="#DC2626" className="mb-3 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">لا توجد نداءات استغاثة</h3>
              <p className="text-slate-500 text-sm mt-1">ستظهر هنا فورًا أي حالة SOS يطلقها مريض، مع موقعه وبيانات التواصل.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {cases.map((c) => {
                const st = c.status || c.state || 'ACTIVE';
                const isActive = !['RESOLVED', 'CANCELLED'].includes(st);
                const lat = c.location?.lat ?? c.lat;
                const lng = c.location?.lng ?? c.lng;
                return (
                  <div key={c.id} className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 ${isActive ? 'border-red-300' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-lg">{c.patient_name || 'مريض'}</div>
                        <div className="text-xs text-slate-500 font-mono">{c.id}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {STATUS_AR[st] || st}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">التواصل</div>
                        <div className="font-mono font-bold text-slate-800" dir="ltr">{c.patient_phone || '—'}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">الوقت</div>
                        <div className="font-bold text-slate-800">{new Date(c.created_at || c.createdAt || Date.now()).toLocaleString('ar-SA-u-ca-gregory')}</div>
                      </div>
                    </div>

                    {(lat != null && lng != null) && (
                      <a
                        href={`https://maps.google.com/?q=${lat},${lng}`}
                        target="_blank" rel="noreferrer"
                        className="block text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-lg py-2 transition-colors"
                      >
                         فتح موقع المريض على الخريطة ({lat.toFixed(4)}, {lng.toFixed(4)})
                      </a>
                    )}
                    {c.location?.address && <div className="text-xs text-slate-500 text-center">{c.location.address}</div>}

                    {isActive && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="flex gap-2">
                          <input
                            value={hospitalFor[c.id] || ''}
                            onChange={(e) => setHospitalFor((p) => ({ ...p, [c.id]: e.target.value }))}
                            placeholder="معرّف المستشفى المستقبِل"
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          />
                          <button onClick={() => assign(c.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold">
                            إسناد مستشفى
                          </button>
                        </div>
                        {resolvingId === c.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={resolveNotes}
                              onChange={(e) => setResolveNotes(e.target.value)}
                              placeholder="ملاحظات الإنهاء (ماذا تم مع الحالة؟)"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => resolve(c.id)} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold">تأكيد إنهاء الحالة</button>
                              <button onClick={() => { setResolvingId(null); setResolveNotes(''); }} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">تراجع</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolvingId(c.id)} className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-bold transition-colors">
                             إنهاء الحالة (تمت المعالجة)
                          </button>
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
