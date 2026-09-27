import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

type NursingRequest = {
  id: string; patient_id: string; state: string; service: string;
  provider_id?: string | null; scheduled_at?: string; created_at?: string;
};

type Provider = { provider_id: string; name: string; city?: string | null };

/** R6-1: wired to the real API — eligible nurses, provider_id, state/service/scheduled time, reassign + cancel. */
export default function NursingPortalPage() {
  const [requests, setRequests] = useState<NursingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eligible, setEligible] = useState<Record<string, Provider[]>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [working, setWorking] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/admin/admin/nursing/requests');
      setRequests(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل طلبات التمريض');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRequests(); }, []);

  const loadEligible = async (requestId: string) => {
    try {
      const res = await apiFetch(`/api/admin/admin/nursing/requests/${encodeURIComponent(requestId)}/eligible-providers`);
      setEligible((prev) => ({ ...prev, [requestId]: Array.isArray(res) ? res : res?.data || [] }));
    } catch {
      setEligible((prev) => ({ ...prev, [requestId]: [] }));
    }
  };

  const decide = async (requestId: string, action: 'assign' | 'reassign' | 'cancel') => {
    if (action !== 'cancel') {
      if (!eligible[requestId]) await loadEligible(requestId);
      const providerId = selected[requestId];
      if (!providerId) { setError('اختر ممرضاً مؤهلاً من القائمة أولاً'); return; }
    } else if (!window.confirm('إلغاء هذا الطلب؟')) return;
    setWorking(`${action}:${requestId}`);
    setError('');
    try {
      await apiFetch(`/api/admin/admin/nursing/requests/${encodeURIComponent(requestId)}/${action}`, {
        method: 'POST',
        body: JSON.stringify(action === 'cancel' ? {} : { provider_id: selected[requestId] }),
      });
      await fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'تعذر تنفيذ القرار');
    } finally {
      setWorking('');
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">إدارة طلبات التمريض المنزلي (Home Nursing Control)</h1>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? (
        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="grid gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">طلب {String(req.id).slice(0, 8)}</h2>
                  <p className="text-sm text-gray-500">المريض: {req.patient_id}</p>
                  <p className="text-sm text-gray-500">الخدمة: {req.service || '—'}</p>
                  <p className="text-sm text-gray-500">الموعد: {req.scheduled_at ? new Date(req.scheduled_at).toLocaleString() : '—'}</p>
                  <p className="text-sm text-gray-500">المزود الحالي: {req.provider_id || 'غير معين'}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${req.state === 'PROVIDER_ASSIGNED' ? 'bg-blue-100 text-blue-800' : req.state === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {req.state}
                </span>
              </div>
              {req.state !== 'CANCELLED' && req.state !== 'COMPLETED' && (
                <div className="flex flex-wrap items-end gap-3 border-t pt-4">
                  <label className="text-sm">ممرض مؤهل:
                    <select
                      className="ml-2 rounded border p-2"
                      value={selected[req.id] || ''}
                      onFocus={() => { if (!eligible[req.id]) void loadEligible(req.id); }}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    >
                      <option value="">— اختر —</option>
                      {(eligible[req.id] || []).map((p) => (
                        <option key={p.provider_id} value={p.provider_id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={working === `assign:${req.id}` || working === `reassign:${req.id}`}
                    onClick={() => void decide(req.id, req.provider_id ? 'reassign' : 'assign')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {req.provider_id ? 'إعادة تعيين' : 'تعيين'}
                  </button>
                  <button
                    disabled={working === `cancel:${req.id}`}
                    onClick={() => void decide(req.id, 'cancel')}
                    className="border border-red-300 text-red-700 px-4 py-2 rounded font-bold disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-gray-500 text-center py-8">لا توجد طلبات تمريض حالياً.</p>
          )}
        </div>
      )}
    </div>
  );
}
