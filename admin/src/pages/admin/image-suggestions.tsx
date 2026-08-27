import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { StorageImage } from '../../components/ProviderFullDetail';

const TABS = [
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'approved', label: 'معتمدة' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'all', label: 'الكل' },
];

export default function ImageSuggestionsPage() {
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/medicines/admin/image-suggestions?status=${tab}&page=${page}&limit=20`);
      setItems(r?.data || []);
      setTotal(r?.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, page]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('اعتماد هذه الصورة؟ ستصبح صورة الصنف الرسمية وستُحذف القديمة من التخزين.')) return;
    const reason = action === 'reject' ? prompt('سبب الرفض (اختياري):') ?? '' : '';
    setActing(id);
    try {
      await apiFetch(`/medicines/admin/image-suggestions/${id}/${action}`, {
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

  const badge = (s: string) => {
    const map: any = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
    const labels: any = { pending: 'قيد الانتظار', approved: 'معتمد', rejected: 'مرفوض' };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${map[s] || 'bg-gray-100'}`}>{labels[s] || s}</span>;
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">اقتراحات صور الأدوية</h1>
      <p className="text-sm text-gray-500 mb-6">
        سير العمل: الصيدلية تقترح صورة ← اعتمادك ← تصبح الصورة الرسمية وتُحذف القديمة من R2 تلقائياً.
      </p>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white rounded-lg border">لا توجد اقتراحات {tab === 'pending' ? 'قيد الانتظار 🎉' : ''}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s: any) => (
            <div key={s.id} className="bg-white rounded-lg shadow border p-4">
              <div className="font-bold mb-1">{s.medicine_name || '—'}</div>
              <div className="text-xs text-gray-400 mb-3" dir="ltr">{s.medicine_id}</div>
              <div className="flex gap-3 mb-3">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">الحالية</div>
                  {s.current_image ? (
                    <StorageImage id={s.current_image} alt="current" className="w-20 h-20 object-contain border rounded bg-gray-50" />
                  ) : (
                    <div className="w-20 h-20 border rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">بلا صورة</div>
                  )}
                </div>
                <div className="text-2xl self-center text-gray-300">←</div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">المقترحة</div>
                  {/* uploaded files arrive as a private storage object (storage_id);
                      the resolver fetches it with the admin token — no broken links */}
                  <StorageImage id={s.storage_id || s.suggested_url} alt="suggested" className="w-20 h-20 object-contain border-2 border-blue-400 rounded bg-gray-50" />
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-1">المقترح: {s.suggested_by_role === 'guest' ? 'زائر (غير مسجل)' : s.suggested_by_role} · {s.note || 'بدون ملاحظة'}</div>
              <div className="text-xs text-gray-400 mb-3">{s.createdAt ? new Date(s.createdAt).toLocaleString('ar-SA-u-ca-gregory') : ''}</div>
              <div className="flex items-center justify-between">
                {badge(s.status)}
                {s.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => act(s.id, 'approve')} disabled={acting === s.id}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50">
                      اعتماد
                    </button>
                    <button onClick={() => act(s.id, 'reject')} disabled={acting === s.id}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200 disabled:opacity-50">
                      رفض
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded bg-white">السابق</button>
          <span className="px-2 py-1 text-sm">{page}</span>
          <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white">التالي</button>
        </div>
      )}
    </div>
  );
}
