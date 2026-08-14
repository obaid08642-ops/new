import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';

export default function ProviderAuditsPage() {
  const [deltas, setDeltas] = useState<any[]>([]);
  
  useEffect(() => {
    fetchDeltas();
  }, []);

  const fetchDeltas = async () => {
    try {
      const res = await apiFetch('/admin/provider-deltas/pending');
      setDeltas(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/admin/provider-deltas/${id}/approve`, { method: 'POST' });
      setDeltas((prev: any[]) => prev.filter((d: any) => d._id !== id));
      alert('تم اعتماد التغييرات وتسعيرة الطبيب الجديدة بنجاح');
    } catch (err) {
      alert('حدث خطأ أثناء الاعتماد');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/admin/provider-deltas/${id}/reject`, { method: 'POST' });
      setDeltas((prev: any[]) => prev.filter((d: any) => d._id !== id));
      alert('تم رفض التغييرات');
    } catch (err) {
      alert('حدث خطأ أثناء الرفض');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">مراجعة التعديلات (Provider Delta Audit Guard)</h1>
      <div className="grid gap-6">
        {deltas.map(d => (
          <div key={d._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4">الطبيب: {d.providerId?.full_name || 'طبيب'}</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded border border-red-100">
                <h3 className="font-bold text-red-800 mb-2">البيانات السابقة</h3>
                <pre className="text-sm">{JSON.stringify(d.oldData, null, 2)}</pre>
              </div>
              <div className="bg-green-50 p-4 rounded border border-green-100">
                <h3 className="font-bold text-green-800 mb-2">التعديل المطلوب</h3>
                <pre className="text-sm">{JSON.stringify(d.newData, null, 2)}</pre>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleApprove(d._id)} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">اعتماد التعديل</button>
              <button onClick={() => handleReject(d._id)} className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700">رفض التعديل</button>
            </div>
          </div>
        ))}
        {deltas.length === 0 && <p className="text-gray-500">لا توجد تعديلات معلقة.</p>}
      </div>
    </div>
  );
}
