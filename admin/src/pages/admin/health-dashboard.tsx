import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function HealthDashboardPage() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiFetch('/admin/health-dashboard')
      .then(setD)
      .catch(() => setD(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500" dir="rtl">جاري تحميل لوحة الصحة...</div>;
  if (!d) return <div className="p-8 text-center text-red-500" dir="rtl">تعذر تحميل بيانات الصحة</div>;

  const svc = (name: string, s: any, extra?: string) => {
    const up = s?.status === 'up';
    return (
      <div className="bg-white p-4 rounded-lg shadow border flex items-center justify-between">
        <div>
          <div className="font-bold">{name}</div>
          {extra && <div className="text-xs text-gray-400 mt-1">{extra}</div>}
          {s?.latency_ms != null && <div className="text-xs text-gray-400">{s.latency_ms}ms</div>}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {up ? 'يعمل ✅' : 'متوقف ❌'}
        </span>
      </div>
    );
  };

  const metric = (label: string, value: any, color = 'text-gray-900') => (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value ?? '—'}</div>
    </div>
  );

  return (
    <div className="p-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">لوحة صحة النظام</h1>
        <span className="text-xs text-gray-400">تحديث تلقائي كل 30 ثانية</span>
      </div>

      <h2 className="font-bold mb-3 text-gray-700">الخدمات</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {svc('MongoDB', d.services.mongodb)}
        {svc('Redis', d.services.redis)}
        {svc('LiveKit', d.services.livekit)}
        {svc('Coturn', d.services.coturn)}
        {svc('Cloudflare R2', d.services.r2, d.services.r2?.configured ? `bucket: ${d.services.r2.bucket}` : 'غير مُعد')}
        {svc('Firebase FCM', d.services.fcm, d.services.fcm?.configured ? '' : 'ينتظر المفاتيح')}
        {svc('Resend', d.services.resend, d.services.resend?.configured ? '' : 'ينتظر المفاتيح')}
      </div>

      <h2 className="font-bold mb-3 text-gray-700">المقاييس الحية</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metric('المستخدمون', d.metrics.users_total)}
        {metric('الأدوية', d.metrics.medicines_total)}
        {metric('مكالمات نشطة', d.metrics.active_calls, 'text-blue-600')}
        {metric('طلبات مفتوحة', d.metrics.open_orders, 'text-amber-600')}
        {metric('بلاغات نقص معلقة', d.metrics.pending_shortage_reports, 'text-red-600')}
        {metric('اقتراحات صور معلقة', d.metrics.pending_image_suggestions, 'text-red-600')}
        {metric('حجم القاعدة (بيانات)', d.metrics.db_size_mb != null ? `${d.metrics.db_size_mb} MB` : '—')}
        {metric('حجم القاعدة (تخزين)', d.metrics.db_storage_mb != null ? `${d.metrics.db_storage_mb} MB` : '—')}
      </div>

      <h2 className="font-bold mb-3 text-gray-700">الطوابير (BullMQ)</h2>
      <div className="bg-white p-4 rounded-lg shadow border mb-8">
        {d.queues && Object.keys(d.queues).length > 0 ? (
          <div className="flex gap-6 flex-wrap">
            {Object.entries(d.queues).map(([q, n]: any) => (
              <div key={q} className="text-sm"><span className="font-bold">{q}</span>: {n} منتظر</div>
            ))}
          </div>
        ) : (
          <div className="text-green-600 text-sm font-bold">كل الطوابير فارغة ✅</div>
        )}
      </div>

      <h2 className="font-bold mb-3 text-gray-700">المهام المجدولة (Cron)</h2>
      <div className="bg-white rounded-lg shadow border mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-right">المهمة</th><th className="p-3 text-right">الجدول</th><th className="p-3 text-right">الحالة</th></tr></thead>
          <tbody>
            {(d.crons || []).map((c: any) => (
              <tr key={c.name} className="border-t">
                <td className="p-3 font-bold" dir="ltr">{c.name}</td>
                <td className="p-3" dir="ltr">{c.schedule}</td>
                <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-bold mb-3 text-gray-700">آخر الأخطاء</h2>
      <div className="bg-white rounded-lg shadow border">
        {(d.recent_errors || []).length === 0 ? (
          <div className="p-6 text-center text-green-600 font-bold">لا أخطاء مسجلة 🎉</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {d.recent_errors.map((e: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-3 text-red-600" dir="ltr">{e.type}</td>
                  <td className="p-3 text-gray-400 text-xs">{e.createdAt ? new Date(e.createdAt).toLocaleString('ar-SA-u-ca-gregory') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
