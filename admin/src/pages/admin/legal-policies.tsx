import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { dateLocale } from '../../utils/dates';

export default function LegalPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editContentEn, setEditContentEn] = useState('');
  const [note, setNote] = useState('');
  // D-36: only a substantive change is a new major version that every user must accept again.
  const [major, setMajor] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    // #996: commissions are edited in finance-suite (POST /admin/finance/commissions/config, finance permissions); the
    // copy that lived here sent a PUT the server does not have and read the earnings report as if it were the config.
    const p = await apiFetch('/legal/policies').catch(() => []);
    setPolicies(Array.isArray(p) ? p : []);
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (key: string) => {
    // Owner decision 2026-10-12: legal texts exist in Arabic and English; both are edited here.
    const [ar, en] = await Promise.all([
      apiFetch(`/legal/policy/${key}?lang=ar`).catch(() => null),
      apiFetch(`/legal/policy/${key}?lang=en`).catch(() => null),
    ]);
    setEditing(key);
    setEditContent(ar?.content || '');
    setEditContentEn(en?.content || '');
    setNote('');
    setMajor(false);
  };

  const save = async () => {
    setSaving(true);
    await apiFetch(`/api/admin/admin/legal/policy/${editing}`, {
      method: 'PUT',
      body: JSON.stringify({ content_ar: editContent, content_en: editContentEn, change_note: note.trim() || 'admin edit from dashboard', major }),
    }).catch(() => alert('فشل الحفظ'));
    setSaving(false);
    setEditing(null);
    load();
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">السياسات القانونية</h1>
      <p className="text-sm text-gray-500 mb-6">تحرير كامل بدون كود — كل تعديل يرفع رقم الإصدار، والإصدار الجوهري وحده يطلب من المستخدمين القبول من جديد.</p>

      {/* Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((p: any) => (
          <div key={p.key} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{p.title_ar}</div>
                <div className="text-xs text-gray-400" dir="ltr">{p.title_en} · v{p.version} · {new Date(p.last_updated).toLocaleDateString(dateLocale())}</div>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 md:p-8" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[85dvh] overflow-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="font-bold text-lg mb-2">تحرير: {editing}</h3>
            <p className="text-xs text-amber-600 mb-3">الحفظ يرفع رقم الإصدار. اختر «إصدار جوهري» إذا تغيّر المضمون، فيُطلب القبول من جديد.</p>
            <label className="block text-sm font-bold mb-1">النص العربي</label>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={12}
              className="w-full border rounded-lg p-3 font-mono text-sm"
            />
            <label className="block text-sm font-bold mt-3 mb-1">النص الإنجليزي</label>
            <textarea
              value={editContentEn}
              onChange={e => setEditContentEn(e.target.value)}
              rows={12}
              dir="ltr"
              className="w-full border rounded-lg p-3 font-mono text-sm"
            />
            <label className="block text-sm font-bold mt-3 mb-1">ملاحظة التغيير</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
            <label className="flex items-center gap-2 mt-3 text-sm">
              <input type="checkbox" checked={major} onChange={e => setMajor(e.target.checked)} />
              إصدار جوهري (يطلب من كل المستخدمين القبول من جديد)
            </label>
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
