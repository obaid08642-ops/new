import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAdminGuard, adminApiBase } from '@/utils/api';

interface Vehicle {
  id: string;
  provider_account_id: string;
  plate_number: string;
  model?: string;
  year?: number;
  equipment?: string[];
  paramedic_count?: number;
  has_icu?: boolean;
  base_city?: string;
  documents?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  admin_notes?: string;
  is_available?: boolean;
  createdAt?: string;
}

const STATUS_LABELS: Record<string, { ar: string; cls: string }> = {
  pending: { ar: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-800' },
  approved: { ar: 'معتمدة', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { ar: 'مرفوضة', cls: 'bg-rose-100 text-rose-800' },
  suspended: { ar: 'موقوفة', cls: 'bg-slate-200 text-slate-700' },
};

export default function AmbulanceFleetReview() {
  const API_BASE = adminApiBase();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet?status=${tab}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch {
      setError('تعذر تحميل الأسطول — تحقق من الاتصال');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const approve = async (v: Vehicle) => {
    setBusyId(v.id);
    try {
      const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet/${v.id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setVehicles(list => list.filter(x => x.id !== v.id));
      alert(`تم اعتماد المركبة ${v.plate_number} — أصبحت مؤهلة لاستلام مهام الطوارئ`);
    } catch {
      alert('فشل الاعتماد — لم يتغير شيء، حاول مجدداً');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (v: Vehicle) => {
    if (!rejectReason.trim()) { alert('أدخل سبب الرفض'); return; }
    setBusyId(v.id);
    try {
      const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet/${v.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error();
      setVehicles(list => list.filter(x => x.id !== v.id));
      setRejectingId(null); setRejectReason('');
      alert(`تم رفض المركبة ${v.plate_number} وإشعار المزود بالسبب`);
    } catch {
      alert('فشل الرفض — حاول مجدداً');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-1">مراجعة أساطيل الإسعاف</h1>
      <p className="text-slate-500 mb-6 text-sm">
        مركبات شركات الإسعاف المستقلة وأساطيل المستشفيات — لا تدخل أي مركبة الخدمة قبل الاعتماد هنا.
      </p>

      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {STATUS_LABELS[t].ar}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400 text-center py-12">جاري التحميل…</p>}
      {error && (
        <div className="text-center py-12">
          <p className="text-rose-600 mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">إعادة المحاولة</button>
        </div>
      )}
      {!loading && !error && vehicles.length === 0 && (
        <p className="text-slate-400 text-center py-12">لا توجد مركبات في هذه القائمة</p>
      )}

      <div className="space-y-4">
        {vehicles.map(v => (
          <div key={v.id} className="border border-slate-200 rounded-xl p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{v.plate_number}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[v.status]?.cls}`}>{STATUS_LABELS[v.status]?.ar}</span>
                  {v.has_icu && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">عناية مركزة متنقلة</span>}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {[v.model, v.year, v.base_city, `${v.paramedic_count || 1} مسعف`].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-slate-400 mt-1">المالك: {v.provider_account_id}</p>
                {v.equipment && v.equipment.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">التجهيزات: {v.equipment.join('، ')}</p>
                )}
                {v.documents && v.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {v.documents.map((d, i) => (
                      <a key={i} href={d} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">مستند {i + 1}</a>
                    ))}
                  </div>
                )}
                {v.status === 'rejected' && v.admin_notes && (
                  <p className="text-xs text-rose-600 mt-2">سبب الرفض: {v.admin_notes}</p>
                )}
              </div>
              {v.status === 'pending' && (
                <div className="flex flex-col gap-2 min-w-[120px]">
                  <button onClick={() => approve(v)} disabled={busyId === v.id}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                    {busyId === v.id ? '…' : 'اعتماد'}
                  </button>
                  <button onClick={() => { setRejectingId(rejectingId === v.id ? null : v.id); setRejectReason(''); }}
                    className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-semibold">
                    رفض
                  </button>
                </div>
              )}
            </div>
            {rejectingId === v.id && (
              <div className="mt-4 border-t pt-4 flex gap-2">
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="سبب الرفض (يظهر للمزود)"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <button onClick={() => reject(v)} disabled={busyId === v.id}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  تأكيد الرفض
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
