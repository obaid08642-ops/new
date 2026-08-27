import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const SECTIONS = [
  { key: 'top-searched', title: 'أكثر الأدوية بحثاً', cols: ['البحث', 'المرات', 'متوسط النتائج'], map: (x: any) => [x.term, x.searches, x.avg_results] },
  { key: 'top-medicines', title: 'أكثر الأدوية طلباً', cols: ['الدواء', 'الطلبات', 'الكمية', 'الإيراد'], map: (x: any) => [x.medicine, x.orders, x.qty, `${x.revenue} ر.س`] },
  { key: 'top-doctors', title: 'أكثر الأطباء مواعيداً', cols: ['الطبيب', 'المواعيد', 'المكتملة'], map: (x: any) => [x.doctor, x.appointments, x.completed] },
  { key: 'top-pharmacies', title: 'أكثر الصيدليات', cols: ['الصيدلية', 'الطلبات', 'الإيراد'], map: (x: any) => [x.pharmacy, x.orders, `${x.revenue} ر.س`] },
  { key: 'top-services', title: 'أكثر الخدمات استخداماً', cols: ['الخدمة', 'العدد'], map: (x: any) => [x.service, x.count] },
];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [section, setSection] = useState('top-searched');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/analytics/overview').then(setOverview).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/analytics/${section}?limit=15`)
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [section]);

  const stat = (label: string, value: any, color = 'text-gray-900') => (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value ?? '—'}</div>
    </div>
  );

  const active = SECTIONS.find(s => s.key === section)!;

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">التحليلات الداخلية</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {stat('المستخدمون', overview?.totals?.users)}
        {stat('الطلبات', overview?.totals?.orders)}
        {stat('المواعيد', overview?.totals?.appointments)}
        {stat('السلال', overview?.totals?.carts)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {stat('Conversion Rate', overview?.conversion_rate != null ? `${overview.conversion_rate}%` : '—', 'text-green-600')}
        {stat('إلغاء الطلبات', overview?.order_cancellation_rate != null ? `${overview.order_cancellation_rate}%` : '—', 'text-red-600')}
        {stat('إلغاء المواعيد', overview?.appointment_cancellation_rate != null ? `${overview.appointment_cancellation_rate}%` : '—', 'text-red-600')}
        {stat('Retention (4w)', overview?.retention_4w?.retained_users, 'text-purple-600')}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stat('DAU (نشط يومياً)', overview?.active_users?.dau, 'text-blue-600')}
        {stat('WAU (نشط أسبوعياً)', overview?.active_users?.wau, 'text-blue-600')}
        {stat('MAU (نشط شهرياً)', overview?.active_users?.mau, 'text-blue-600')}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${section === s.key ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}`}>
            {s.title}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b font-bold">{active.title}</div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا بيانات بعد — تتراكم مع الاستخدام الفعلي</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{active.cols.map(c => <th key={c} className="p-3 text-right">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((x: any, i: number) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  {active.map(x).map((v: any, j: number) => <td key={j} className="p-3">{v ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
