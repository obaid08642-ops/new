import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const SEGMENTS = [
  { value: 'all', label: 'جميع المستخدمين' },
  { value: 'patients', label: 'المرضى فقط' },
  { value: 'providers', label: 'مزودو الخدمة' },
  { value: 'role:pharmacy', label: 'الصيدليات' },
  { value: 'role:doctor', label: 'الأطباء' },
  { value: 'role:driver', label: 'السائقون' },
  { value: 'role:admin', label: 'الإداريون' },
];

export default function NotificationCenterPage() {
  const [stats, setStats] = useState<any>(null);
  const [segmentCounts, setSegmentCounts] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [singleUser, setSingleUser] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [asCampaign, setAsCampaign] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, seg, c] = await Promise.all([
        apiFetch('/admin/notification-center/stats/overview').catch(() => null),
        apiFetch('/admin/notification-center/segments').catch(() => null),
        apiFetch(`/admin/notification-center/campaigns?page=${page}&limit=15`).catch(() => ({ data: [] })),
      ]);
      setStats(s);
      setSegmentCounts(seg);
      setCampaigns(c?.data || []);
      setTotal(c?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const effectiveSegment = segment === 'single' ? `user:${singleUser.trim()}` : segment;

  const send = async () => {
    if (!title.trim() || !body.trim()) { alert('العنوان والنص مطلوبان'); return; }
    if (segment === 'single' && !singleUser.trim()) { alert('أدخل معرف المستخدم'); return; }
    setSending(true);
    try {
      const payload: any = {
        title, body, segment: effectiveSegment, name: title,
        ...(deepLink.trim() ? { deep_link: { route: deepLink.trim() } } : {}),
      };
      if (asCampaign && scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
        await apiFetch('/admin/notification-center/campaigns', { method: 'POST', body: JSON.stringify(payload) });
        alert('تمت جدولة الحملة بنجاح');
      } else {
        await apiFetch('/admin/notification-center/broadcasts', { method: 'POST', body: JSON.stringify(payload) });
        alert('تم إرسال الإشعار بنجاح');
      }
      setTitle(''); setBody(''); setDeepLink(''); setScheduledAt('');
      load();
    } catch (e: any) {
      alert('فشل الإرسال: ' + (e?.message || 'خطأ غير معروف'));
    } finally {
      setSending(false);
    }
  };

  const sendNow = async (id: string) => {
    if (!confirm('إرسال هذه الحملة الآن؟')) return;
    await apiFetch(`/admin/notification-center/campaigns/${id}/send`, { method: 'POST' }).catch(() => alert('فشل'));
    load();
  };

  const cancel = async (id: string) => {
    if (!confirm('إلغاء هذه الحملة المجدولة؟')) return;
    await apiFetch(`/admin/notification-center/campaigns/${id}`, { method: 'DELETE' }).catch(() => alert('فشل'));
    load();
  };

  const runRetarget = async () => {
    await apiFetch('/admin/notification-center/retarget/run', { method: 'POST' }).catch(() => null);
    alert('تم تشغيل إعادة الاستهداف يدوياً');
  };

  const statusBadge = (s: string) => {
    const map: any = {
      sent: 'bg-green-100 text-green-800', scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-600', draft: 'bg-purple-100 text-purple-800',
    };
    const labels: any = { sent: 'مُرسلة', scheduled: 'مجدولة', sending: 'جارٍ الإرسال', failed: 'فشلت', cancelled: 'ملغاة', draft: 'مسودة' };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${map[s] || 'bg-gray-100'}`}>{labels[s] || s}</span>;
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">مركز الإشعارات والحملات</h1>

      {/* ── Stats ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">معدل الوصول (30 يوم)</div>
          <div className="text-2xl font-bold text-green-600">{stats?.delivery_rate != null ? `${stats.delivery_rate}%` : '—'}</div>
          <div className="text-xs text-gray-400">{stats?.delivered ?? 0} من {((stats?.delivered ?? 0) + (stats?.failed ?? 0))}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">نسبة الفتح</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.open_rate != null ? `${stats.open_rate}%` : '—'}</div>
          <div className="text-xs text-gray-400">{stats?.opened ?? 0} فتح</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">نسبة الضغط (CTR)</div>
          <div className="text-2xl font-bold text-purple-600">{stats?.ctr != null ? `${stats.ctr}%` : '—'}</div>
          <div className="text-xs text-gray-400">{stats?.clicked ?? 0} ضغطة</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">الجمهور الكلي</div>
          <div className="text-2xl font-bold">{segmentCounts?.all ?? '—'}</div>
          <div className="text-xs text-gray-400">مرضى: {segmentCounts?.patients ?? 0} · مزودون: {segmentCounts?.providers ?? 0}</div>
        </div>
      </div>

      {/* ── Composer ──────────────────────────── */}
      <div className="bg-white p-6 rounded-lg shadow border mb-8">
        <h2 className="text-lg font-bold mb-4">إرسال إشعار جديد</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded p-2" placeholder="عنوان الإشعار" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الفئة المستهدفة</label>
            <select value={segment} onChange={e => setSegment(e.target.value)} className="w-full border rounded p-2">
              {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              <option value="single">مستخدم واحد (بالمعرف)</option>
            </select>
          </div>
          {segment === 'single' && (
            <div>
              <label className="block text-sm font-medium mb-1">معرف المستخدم</label>
              <input value={singleUser} onChange={e => setSingleUser(e.target.value)} className="w-full border rounded p-2" placeholder="user_id" />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">نص الإشعار</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full border rounded p-2" placeholder="محتوى الرسالة..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deep Link (اختياري)</label>
            <input value={deepLink} onChange={e => setDeepLink(e.target.value)} className="w-full border rounded p-2" placeholder="/pharmacy/cart" dir="ltr" />
            <p className="text-xs text-gray-400 mt-1">مسار الشاشة داخل التطبيق التي تُفتح عند الضغط على الإشعار</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              <input type="checkbox" checked={asCampaign} onChange={e => setAsCampaign(e.target.checked)} className="ml-1" />
              جدولة كحملة لاحقة
            </label>
            {asCampaign && (
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full border rounded p-2" />
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={send} disabled={sending} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
            {sending ? 'جارٍ الإرسال...' : asCampaign && scheduledAt ? 'جدولة الحملة' : 'إرسال الآن'}
          </button>
          <button onClick={runRetarget} className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600">
            تشغيل إعادة الاستهداف يدوياً
          </button>
        </div>
      </div>

      {/* ── Campaigns table ───────────────────── */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">الحملات ({total})</h2>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded">السابق</button>
            <span className="px-2 py-1 text-sm">{page}</span>
            <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">التالي</button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا توجد حملات بعد</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">الحملة</th>
                <th className="p-3 text-right">الفئة</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">استهدف</th>
                <th className="p-3 text-right">أُرسل</th>
                <th className="p-3 text-right">الجدولة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-bold">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.body?.slice(0, 50)}...</div>
                    {c.deep_link?.route && <div className="text-xs text-blue-500" dir="ltr">{c.deep_link.route}</div>}
                  </td>
                  <td className="p-3">{SEGMENTS.find(s => s.value === c.segment)?.label || c.segment}</td>
                  <td className="p-3">{statusBadge(c.status)}</td>
                  <td className="p-3">{c.stats?.targeted ?? '—'}</td>
                  <td className="p-3">{c.stats?.sent ?? '—'}</td>
                  <td className="p-3 text-xs">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('ar-SA-u-ca-gregory') : '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <>
                          <button onClick={() => sendNow(c.id)} className="text-green-600 hover:underline text-xs">إرسال الآن</button>
                          <button onClick={() => cancel(c.id)} className="text-red-600 hover:underline text-xs">إلغاء</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
