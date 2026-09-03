import { useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function ProviderAuditsPage() {
  const [deltas, setDeltas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeltas();
  }, []);

  const fetchDeltas = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any[]>('/admin/provider-deltas', { method: 'POST' });
      setDeltas(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch provider deltas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await apiFetch(`/admin/provider-deltas/${id}/approve`, { method: 'POST' });
      setDeltas((prev) => prev.filter((d) => (d.id || d._id) !== id));
      alert('تم اعتماد التعديلات وتحديث ملف مقدم الخدمة بنجاح.');
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء الاعتماد');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('سبب رفض التعديل:');
    if (!reason) return;
    setProcessingId(id);
    try {
      await apiFetch(`/admin/provider-deltas/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      setDeltas((prev) => prev.filter((d) => (d.id || d._id) !== id));
      alert('تم رفض التعديل وإشعار مقدم الخدمة.');
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء الرفض');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>مركز تدقيق تعديلات مقدمي الخدمة | نبض</title>
      </Head>
      <div dir="rtl" className="p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">مراجعة التعديلات (Provider Delta Audit Guard)</h1>
          <p className="text-sm text-slate-500 mt-1">
            جميع التعديلات على الأسعار، التخصص، رخص المزاولة والمستندات تبقى معلقة وتتطلب موافقة الإدارة قبل الظهور للمرضى.
          </p>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
            جارٍ تحميل التعديلات المعلقة…
          </div>
        ) : deltas.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
            لا توجد تعديلات معلقة حالياً في طابور التدقيق.
          </div>
        ) : (
          <div className="grid gap-6">
            {deltas.map((d) => {
              const deltaId = d.id || d._id;
              const providerName = d.provider_name || d.providerId?.full_name || d.account_id || 'مقدم خدمة';
              const role = d.role || d.providerId?.role || 'مقدم خدمة';
              const oldData = d.old_data || d.oldData || {};
              const newData = d.requested_changes || d.changes || d.newData || {};

              return (
                <div key={deltaId} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{providerName}</h2>
                      <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-medium">
                        {role}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      تاريخ الطلب: {d.createdAt ? new Date(d.createdAt).toLocaleString('ar-SA') : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100">
                      <h3 className="text-xs font-bold text-rose-800 mb-2">البيانات السابقة</h3>
                      <pre className="text-xs overflow-x-auto text-slate-700 font-mono p-2 bg-white rounded border border-rose-100">
                        {JSON.stringify(oldData, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                      <h3 className="text-xs font-bold text-emerald-800 mb-2">التعديل المطلوب (Delta)</h3>
                      <pre className="text-xs overflow-x-auto text-slate-700 font-mono p-2 bg-white rounded border border-emerald-100">
                        {JSON.stringify(newData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      disabled={processingId === deltaId}
                      onClick={() => handleApprove(deltaId)}
                      className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      اعتماد التعديل وتطبيقه
                    </button>
                    <button
                      disabled={processingId === deltaId}
                      onClick={() => handleReject(deltaId)}
                      className="bg-rose-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50"
                    >
                      رفض التعديل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
