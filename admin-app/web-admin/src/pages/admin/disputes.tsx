import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { AdminGuard } from '../../components/AdminGuard';
import { apiFetch } from '@/utils/api';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await apiFetch('/admin/disputes');
      setDisputes(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.error('Failed to fetch disputes', e);
      setError('تعذر تحميل النزاعات من الخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <Head>
        <title>إدارة النزاعات والمطالبات | NABDah Master Admin</title>
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
            تحديث البيانات 🔄
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">جاري تحميل طلبات النزاع...</div>
        ) : error ? (
          <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-200 text-red-800">{error}</div>
        ) : disputes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">🛡️</div>
            <h3 className="text-lg font-bold text-slate-800">لا توجد نزاعات متاحة حالياً</h3>
            <p className="text-slate-500 text-sm mt-1">تعني النتيجة الفارغة أن الخادم لم يعد نزاعات للمرشح الحالي، ولا تثبت اكتمال التسوية المالية.</p>
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
                    <td className="p-4 font-medium">{item.patientName || 'غير متاح'}</td>
                    <td className="p-4">{item.providerName || 'غير متاح'}</td>
                    <td className="p-4 font-bold text-slate-900">{typeof item.amount === 'number' ? `${item.amount} ر.س` : 'غير متاح'}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{item.reason || 'غير متاح'}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                        {item.status || 'غير متاح'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-500">قرارات النزاع والاسترداد غير متاحة حتى يُربط القرار بسجل مالي وrefund لدى مزود الدفع.</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
