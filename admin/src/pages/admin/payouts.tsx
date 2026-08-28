import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import EmptyIcon from '../../components/EmptyIcon';

/**
 * M5: payouts execution — reads the unified queue (legacy WithdrawalRequest
 * + provider-ops ProviderWithdrawal, merged server-side). Execute or reject.
 */
interface PayoutRequest {
  id: string;
  source?: 'legacy' | 'provider_ops';
  providerId?: string;
  providerName?: string;
  amount: number;
  bankName?: string;
  iban?: string;
  note?: string;
  status: string;
  createdAt: string;
}

export default function PayoutApprovalPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await apiFetch('/admin/finance/withdrawals/pending');
      setPayouts(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل طلبات السحب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleExecutePayout = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من تنفيذ تحويل المستحقات المالية لهذا المزود؟ لا يمكن التراجع عن هذه العملية بعد التحويل.')) return;
    try {
      await apiFetch(`/admin/finance/withdrawals/${id}/execute`, { method: 'POST' });
      alert('تم اعتماد السحب وتحويل مستحقات المزود بنجاح');
      fetchPayouts();
    } catch (e: any) {
      alert(e?.message || 'خطأ أثناء تنفيذ السحب');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/admin/finance/withdrawals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      setRejectingId(null);
      setRejectReason('');
      fetchPayouts();
    } catch (e: any) {
      alert(e?.message || 'خطأ أثناء الرفض');
    }
  };

  return (
    <>
      <Head><title>اعتمادات السحب المالي | نبض</title></Head>
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-slate-500">مراجعة طلبات سحب الأرباح للأطباء والمنشآت والصيدليات — المصدران (قديم/جديد) مدمجان في طابور واحد.</p>
            <button onClick={fetchPayouts} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm">
              تحديث الطلبات 
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري تحميل طلبات السحب المالي…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <p className="text-red-700 font-bold">{error}</p>
              <button onClick={fetchPayouts} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">إعادة المحاولة</button>
            </div>
          ) : payouts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <EmptyIcon name="banknote" size={44} color="#0D9488" className="mb-3 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">لا توجد طلبات سحب معلقة حاليًا</h3>
              <p className="text-slate-500 text-sm mt-1">طلبات السحب الجديدة من تطبيق المزود ستظهر هنا فورًا.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
                    <th className="p-4">رقم الطلب</th>
                    <th className="p-4">مزود الخدمة</th>
                    <th className="p-4">المبلغ المستحق</th>
                    <th className="p-4">الآيبان (IBAN)</th>
                    <th className="p-4">المصدر</th>
                    <th className="p-4">تاريخ الطلب</th>
                    <th className="p-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {payouts.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-teal-600 font-semibold text-xs">{String(item.id).slice(0, 12)}</td>
                        <td className="p-4 font-medium">{item.providerName || item.providerId || 'مزود خدمة'}</td>
                        <td className="p-4 font-bold text-emerald-600 text-base">{item.amount} ر.س</td>
                        <td className="p-4 text-xs font-mono text-slate-500" dir="ltr">{item.iban || '—'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${item.source === 'provider_ops' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.source === 'provider_ops' ? 'تطبيق المزود' : 'قديم'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-500">{new Date(item.createdAt || Date.now()).toLocaleDateString('ar-SA-u-ca-gregory')}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExecutePayout(item.id)}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              تنفيذ التحويل 
                            </button>
                            <button
                              onClick={() => setRejectingId(rejectingId === item.id ? null : item.id)}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              رفض
                            </button>
                          </div>
                        </td>
                      </tr>
                      {rejectingId === item.id && (
                        <tr className="bg-red-50">
                          <td colSpan={7} className="p-4">
                            <div className="flex gap-2 items-center">
                              <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="سبب الرفض (يظهر للمزود)"
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                              />
                              <button onClick={() => handleReject(item.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">تأكيد الرفض</button>
                              <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">تراجع</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </>
  );
}
