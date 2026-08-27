import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function NursingPortalPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/nursing/requests');
      setRequests(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('Failed to fetch nursing requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignNurse = async (requestId: string) => {
    const nurseId = prompt('أدخل رقم ترخيص / هاتف الممرض المخصص:');
    if (!nurseId) return;
    try {
      await apiFetch(`/admin/nursing/requests/${requestId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ nurseId })
      });
      alert('تم تعيين الممرض بنجاح');
      fetchRequests();
    } catch (err) {
      alert('حدث خطأ أثناء التعيين');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">إدارة طلبات التمريض المنزلي (Home Nursing Control)</h1>
      {loading ? (
        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="grid gap-6">
          {requests.map(req => (
            <div key={req.id || req._id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{req.patientName || 'المريض'}</h2>
                  <p className="text-sm text-gray-500">نوع الخدمة: {req.serviceType || 'تمريض منزلي'}</p>
                  <p className="text-sm text-gray-500">العنوان: {req.address || 'الرياض'}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${req.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {req.status === 'ASSIGNED' ? 'تم التعيين' : 'في الانتظار'}
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => handleAssignNurse(req.id || req._id)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700"
                >
                  تعيين ممرض مباشر
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-gray-500 text-center py-8">لا توجد طلبات تمريض معلقة حالياً.</p>
          )}
        </div>
      )}
    </div>
  );
}
