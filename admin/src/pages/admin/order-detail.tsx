import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiFetch } from '@/utils/api';

const KIND_AR: Record<string, string> = { pharmacy: 'صيدلية', lab: 'تحاليل مخبرية', radiology: 'أشعة', nursing: 'تمريض منزلي', consultation: 'استشارة طبية' };

export default function OrderDetailPage() {
  const router = useRouter();
  const { kind, id } = router.query as { kind?: string; id?: string };
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kind || !id) return;
    setLoading(true);
    apiFetch(`/admin/command-center/order/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || 'تعذر تحميل تفاصيل الطلب'))
      .finally(() => setLoading(false));
  }, [kind, id]);

  const fmt = (d: any) => (d ? new Date(d).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { hour12: false }) : '—');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Head><title>تفاصيل الطلب | نبض</title></Head>
      <button onClick={() => router.back()} className="text-teal-700 font-bold text-sm">→ عودة لمركز القيادة</button>

      {loading ? (
        <div className="p-12 text-center text-slate-500">جاري التحميل…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>
      ) : data ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">{KIND_AR[data.kind] || data.kind}</h1>
                <p className="text-slate-500 font-mono text-sm mt-1" dir="ltr">{data.tracking_id}</p>
              </div>
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-bold">
                {data.universal_state || data.state}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
              <div><div className="text-slate-400 text-xs">الحالة الداخلية</div><div className="font-bold">{data.state}</div></div>
              <div><div className="text-slate-400 text-xs">القيمة</div><div className="font-bold">{Math.round(Number(data.total) || 0)} ر.س</div></div>
              <div><div className="text-slate-400 text-xs">طريقة الدفع</div><div className="font-bold">{data.payment_method || '—'}</div></div>
              <div><div className="text-slate-400 text-xs">تاريخ الإنشاء</div><div className="font-bold" dir="ltr">{fmt(data.created_at)}</div></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4">المريض (من)</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">الاسم:</span><span className="font-bold">{data.patient?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">الجوال:</span><span className="font-bold" dir="ltr">{data.patient?.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">البريد:</span><span className="font-bold" dir="ltr">{data.patient?.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">المعرف:</span><span className="font-mono text-xs" dir="ltr">{data.patient?.id || '—'}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4">مزود الخدمة (إلى)</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">الاسم:</span><span className="font-bold">{data.provider?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">النوع:</span><span className="font-bold">{data.provider?.type || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">المعرف:</span><span className="font-mono text-xs" dir="ltr">{data.provider?.id || '—'}</span></div>
              </div>
            </div>
          </div>

          {data.address && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-2">العنوان</h2>
              <p className="text-sm text-slate-600">{[data.address.address, data.address.district, data.address.city].filter(Boolean).join(' — ') || JSON.stringify(data.address)}</p>
            </div>
          )}

          {Array.isArray(data.items) && data.items.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
              <h2 className="font-bold text-slate-800 mb-4">محتويات الطلب</h2>
              <table className="w-full text-right text-sm">
                <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="p-2">البند</th><th className="p-2">الكمية</th><th className="p-2">السعر</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2 font-medium">{it.name_ar || it.test_name_ar || it.name || it.service_name || it.title || `#${i + 1}`}</td>
                      <td className="p-2">{it.quantity ?? it.qty ?? 1}</td>
                      <td className="p-2 font-bold">{it.price ?? it.cashPrice ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-4">سجل الإجراءات والحالات</h2>
            {(!data.history || data.history.length === 0) ? (
              <p className="text-sm text-slate-400">لا توجد حركات مسجلة بعد.</p>
            ) : (
              <ol className="relative border-r-2 border-teal-100 pr-4 space-y-4">
                {data.history.map((h: any, i: number) => (
                  <li key={i} className="relative">
                    <span className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-teal-500"></span>
                    <div className="text-sm font-bold text-slate-800">{h.from ? `${h.from} ← ${h.to}` : h.to}</div>
                    {h.note && <div className="text-xs text-slate-500 mt-0.5">{h.note}</div>}
                    <div className="text-xs text-slate-400 mt-0.5">{h.by && <span className="ml-2">{h.by}</span>}<span dir="ltr">{fmt(h.at)}</span></div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
