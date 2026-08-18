import { adminApiBase } from '@/utils/api';
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import EmptyIcon from '../../components/EmptyIcon';

interface DisputeItem {
  id: string;
  orderId: string;
  patientName: string;
  providerName: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'RESOLVED_REFUND' | 'RESOLVED_REJECTED';
  createdAt: string;
}

export default function DisputeResolutionPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const API_BASE = adminApiBase();
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/disputes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDisputes(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch disputes', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, action: 'refund' | 'reject') => {
    try {
      const API_BASE = adminApiBase();
      const token = localStorage.getItem('admin_token');
      await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: `Admin dispute resolution: ${action}` })
      });
      alert(action === 'refund' ? 'تمت الموافقة على الاسترداد المالي وإغلاق النزاع' : 'تم رفض طلب النزاع وتأكيد العملية');
      fetchDisputes();
    } catch (e) {
      alert('حدث خطأ أثناء تنفيذ القرار');
    }
  };

  return (
    <>
      <Head>
        <title>إدارة النزاعات والمطالبات | نبض</title>
      </Head>

      <div className="p-8 dir-rtl text-right">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">مركز حل النزاعات والمطالبات (Dispute Resolution)</h1>
            <p className="text-slate-500 mt-1">مراجعة شكاوى المرضى والمزودين واتخاذ قرارات الاسترداد المالي</p>
          </div>
          <button
            onClick={fetchDisputes}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            تحديث البيانات 
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">جاري تحميل طلبات النزاع...</div>
        ) : disputes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <EmptyIcon name="shield" size={44} color="#0D9488" className="mb-3 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">لا توجد نزاعات معلقة حالياً</h3>
            <p className="text-slate-500 text-sm mt-1">جميع المعاملات والطلبات تعمل بصورة طبيعية ودون أي اعتراضات.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">المريض</th>
                  <th className="p-4">مزود الخدمة</th>
                  <th className="p-4">القيمة</th>
                  <th className="p-4">سبب النزاع</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {disputes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-teal-600 font-semibold">{item.orderId || item.id}</td>
                    <td className="p-4 font-medium">{item.patientName || 'مريض نبض'}</td>
                    <td className="p-4">{item.providerName || 'مزود الخدمة'}</td>
                    <td className="p-4 font-bold text-slate-900">{item.amount || 150} ر.س</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{item.reason || 'اعتراض على جودة الخدمة'}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                        قيد المراجعة
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleResolve(item.id, 'refund')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-colors"
                        >
                          استرداد للعميل 
                        </button>
                        <button
                          onClick={() => handleResolve(item.id, 'reject')}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-medium transition-colors"
                        >
                          رفض الاعتراض 
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
