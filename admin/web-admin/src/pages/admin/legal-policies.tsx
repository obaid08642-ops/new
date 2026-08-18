import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function LegalPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [p, c] = await Promise.all([
      apiFetch('/legal/policies').catch(() => []),
      apiFetch('/admin/finance/commissions').catch(() => null),
    ]);
    setPolicies(Array.isArray(p) ? p : []);
    setCommissions(c);
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (key: string) => {
    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);
    setEditing(key);
    setEditContent(full?.content || '');
  };

  const save = async () => {
    setSaving(true);
    await apiFetch(`/admin/legal/policy/${editing}`, {
      method: 'PUT',
      body: JSON.stringify({ content_ar: editContent, change_note: 'admin edit from dashboard' }),
    }).catch(() => alert('فشل الحفظ'));
    setSaving(false);
    setEditing(null);
    load();
  };

  const setPercent = async (type: string, value: number) => {
    const next = { ...commissions.service_types, [type]: { ...commissions.service_types[type], percent: value } };
    await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ service_types: next }) }).catch(() => null);
    load();
  };

  const setMinimum = async (value: number) => {
    await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ payout_schedule: { ...commissions.payout_schedule, minimum_payout_sar: value } }) }).catch(() => null);
    load();
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">السياسات القانونية والعمولات</h1>
      <p className="text-sm text-gray-500 mb-6">تحرير كامل بدون كود — كل تعديل يرفع الإصدار تلقائياً ويجبر إعادة القبول.</p>

      {/* Commissions */}
      {commissions && (
        <div className="bg-white p-5 rounded-lg shadow border mb-8">
          <h2 className="font-bold mb-4">العمولات والتحويلات</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {Object.entries(commissions.service_types || {}).map(([type, cfg]: any) => (
              <div key={type} className="border rounded-lg p-3">
                <div className="text-sm text-gray-500">{type}</div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number" min="0" max="50" step="0.5" defaultValue={cfg.percent}
                    onBlur={e => setPercent(type, parseFloat(e.target.value))}
                    className="w-20 border rounded p-1 text-center font-bold"
                  />
                  <span className="text-sm font-bold text-teal-600">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-6 items-center flex-wrap">
            <div>
              <span className="text-sm text-gray-500 ml-2">الحد الأدنى للسحب:</span>
              <input
                type="number" min="0" defaultValue={commissions.payout_schedule?.minimum_payout_sar}
                onBlur={e => setMinimum(parseFloat(e.target.value))}
                className="w-24 border rounded p-1 text-center font-bold"
              />
              <span className="text-sm font-bold"> ر.س</span>
            </div>
            <div className="text-sm text-gray-500">
              الجدول: {commissions.payout_schedule?.frequency} ({commissions.payout_schedule?.day}) · معالجة {commissions.payout_schedule?.processing_days} أيام
            </div>
            <div className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded">VAT {commissions.tax?.vat_percent}% على العمولة</div>
          </div>
        </div>
      )}

      {/* Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((p: any) => (
          <div key={p.key} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{p.title_ar}</div>
                <div className="text-xs text-gray-400" dir="ltr">{p.title_en} · v{p.version} · {new Date(p.last_updated).toLocaleDateString('ar-SA-u-ca-gregory')}</div>
              </div>
              <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-bold">v{p.version}</span>
            </div>
            <button onClick={() => openEdit(p.key)} className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
              تحرير المحتوى (يرفع الإصدار)
            </button>
          </div>
        ))}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="font-bold text-lg mb-2">تحرير: {editing}</h3>
            <p className="text-xs text-amber-600 mb-3">⚠️ الحفظ يرفع رقم الإصدار تلقائياً ويجبر المستخدمين على إعادة القبول.</p>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={18}
              className="w-full border rounded-lg p-3 font-mono text-sm"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : 'حفظ وإصدار جديد'}
              </button>
              <button onClick={() => setEditing(null)} className="bg-gray-100 px-6 py-2 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
