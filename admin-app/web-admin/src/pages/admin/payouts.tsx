import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { AdminGuard } from '../../components/AdminGuard';

interface PayoutRequest {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  bankName: string;
  iban: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export default function PayoutApprovalPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/finance/withdrawals/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setPayouts(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch payouts', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayout = async (id: string) => {
    if (!window.confirm('هل أنت متاكد من تنفيذ تحويل المستحقات المالية لهذا المزود؟ لا يمكن التراجع عن هذه العملية بعد التحويل.')) return;
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/finance/withdrawals/${id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('تم إرسال أمر السحب لشبكة Moyasar وتحويل مستحقات المزود بنجاح');
        fetchPayouts();
      }
    } catch (e) {
      alert('خطأ أثناء تحويل السحب');
    }
  };

  return (
    <AdminGuard>
      <Head>
        <title>اعتمادات السحب المالي | NABDah Master Admin</title>
      </Head>

      <div className="p-8 dir-rtl text-right">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">اعتمادات السحب المالي للمزودين (Payout Approvals)</h1>
            <p className="text-slate-500 mt-1">مراجعة طلبات سحب الأرباح والمستحقات المالية الخاصة بالأطباء والمنشآت والصيدليات</p>
          </div>
          <button
            onClick={fetchPayouts}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            تحديث الطلبات 🔄
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">جاري تحميل طلبات السحب المالي...</div>
        ) : payouts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">🏦</div>
            <h3 className="text-lg font-bold text-slate-800">لا توجد طلبات سحب معلقة حالياً</h3>
            <p className="text-slate-500 text-sm mt-1">تم تنفيذ وسداد كافة مستحقات المزودين عبر Moyasar Payout Engine.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">مزود الخدمة</th>
                  <th className="p-4">المبلغ المستحق</th>
                  <th className="p-4">البنك والآيبان (IBAN)</th>
                  <th className="p-4">تاريخ الطلب</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payouts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-teal-600 font-semibold">{item.id}</td>
                    <td className="p-4 font-medium">{item.providerName || 'طبيب / منشأة'}</td>
                    <td className="p-4 font-bold text-emerald-600 text-base">{item.amount} ر.س</td>
                    <td className="p-4">
                      <div className="text-xs text-slate-900 font-semibold">{item.bankName || 'مصرف الراجحي'}</div>
                      <div className="text-xs font-mono text-slate-500">{item.iban || 'SA0380000000000000000000'}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{new Date(item.createdAt || Date.now()).toLocaleDateString('ar-SA')}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                        بانتظار التحويل
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleExecutePayout(item.id)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                      >
                        إرسال أسرع تنفيذ Payout ⚡
                      </button>
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
