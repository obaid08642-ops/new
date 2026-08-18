import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const TABS = [
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'approved', label: 'معتمدة' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'all', label: 'الكل' },
];

export default function ShortageReportsPage() {
  const [tab, setTab] = useState('pending');
  const [reports, setReports] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/medicines/admin/shortage-reports?status=${tab}&page=${page}&limit=20`);
      setReports(r?.data || []);
      setTotal(r?.total || 0);
      setCounts(r?.counts || {});
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, page]);

  const act = async (reportId: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('سبب الرفض (اختياري):') ?? '' : '';
    setActing(reportId);
    try {
      await apiFetch(`/medicines/admin/shortage-reports/${reportId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      load();
    } catch (e: any) {
      alert('فشل الإجراء: ' + (e?.message || ''));
    } finally {
      setActing(null);
    }
  };

  const clearBadge = async (medicineId: string) => {
    if (!confirm('إزالة شارة "قد يكون غير متوفر" عن هذا الصنف؟')) return;
    await apiFetch(`/medicines/admin/catalog/${medicineId}/clear-shortage-badge`, { method: 'POST' }).catch(() => alert('فشل'));
    load();
  };

  const badge = (s: string) => {
    const map: any = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', superseded: 'bg-gray-100 text-gray-600' };
    const labels: any = { pending: 'قيد الانتظار', approved: 'معتمد', rejected: 'مرفوض', superseded: 'تم تجاوزه' };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${map[s] || 'bg-gray-100'}`}>{labels[s] || s}</span>;
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">بلاغات نقص الأدوية</h1>
      <p className="text-sm text-gray-500 mb-6">
        سير العمل: بلاغ المزود ← اعتمادك ← تظهر شارة "قد يكون غير متوفر" على المنتج (يبقى قابلاً للشراء مع تحذير).
      </p>

      {/* Tabs with counts */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}`}
          >
            {t.label} {t.key !== 'all' && counts[t.key] != null ? `(${counts[t.key]})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow border">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا توجد بلاغات {tab === 'pending' ? 'قيد الانتظار 🎉' : ''}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">الصنف</th>
                <th className="p-3 text-right">المبلِّغ</th>
                <th className="p-3 text-right">ملاحظة</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-bold">{r.medicine_name || r.product_name || '—'}</div>
                    <div className="text-xs text-gray-400" dir="ltr">{r.medicine_id || ''}</div>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{r.reporter_role || 'pharmacy'}</div>
                    <div className="text-gray-400" dir="ltr">{r.reporter_id || r.pharmacy_id || ''}</div>
                  </td>
                  <td className="p-3 text-xs max-w-[200px] truncate">{r.note || '—'}</td>
                  <td className="p-3 text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleString('ar-SA-u-ca-gregory') : '—'}</td>
                  <td className="p-3">{badge(r.status)}</td>
                  <td className="p-3">
                    <div className="flex gap-2 flex-wrap">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => act(r.id, 'approve')}
                            disabled={acting === r.id}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            اعتماد (إظهار الشارة)
                          </button>
                          <button
                            onClick={() => act(r.id, 'reject')}
                            disabled={acting === r.id}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200 disabled:opacity-50"
                          >
                            رفض
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && r.medicine_id && (
                        <button
                          onClick={() => clearBadge(r.medicine_id)}
                          className="bg-amber-100 text-amber-800 px-3 py-1 rounded text-xs hover:bg-amber-200"
                        >
                          إزالة الشارة (توفر المخزون)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 20 && (
          <div className="p-3 border-t flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded">السابق</button>
            <span className="px-2 py-1 text-sm">{page}</span>
            <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">التالي</button>
          </div>
        )}
      </div>
    </div>
  );
}
