import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

type Loc = { code: string; name_ar: string; name_en: string; type: string; parent_code?: string | null; is_active?: boolean };

export default function LocationsAdminPage() {
  const [rows, setRows] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [type, setType] = useState('city');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ code: '', name_ar: '', name_en: '', type: 'city', parent_code: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams({ type, include_inactive: '1', ...(q ? { q } : {}) }).toString();
      const r: any = await apiFetch(`/admin/locations?${qs}`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) { setError(e?.message || 'تعذر تحميل المواقع'); }
    finally { setLoading(false); }
  }, [type, q]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!form.code.trim() || !form.name_ar.trim() || !form.name_en.trim()) { setError('الكود والاسمان مطلوبة'); return; }
    setBusy('create'); setError('');
    try {
      await apiFetch('/admin/locations', { method: 'POST', body: JSON.stringify({ ...form, code: form.code.trim(), parent_code: form.parent_code.trim() || undefined }) });
      setForm({ code: '', name_ar: '', name_en: '', type: form.type, parent_code: '' });
      await load();
    } catch (e: any) { setError(e?.message || 'فشل الإضافة'); }
    finally { setBusy(''); }
  };

  const deactivate = async (code: string) => {
    if (!confirm(`تعطيل ${code}؟ سيختفي من كل القوائم.`)) return;
    setBusy(code); setError('');
    try { await apiFetch(`/admin/locations/${encodeURIComponent(code)}`, { method: 'DELETE' }); await load(); }
    catch (e: any) { setError(e?.message || 'فشل التعطيل'); }
    finally { setBusy(''); }
  };

  return (<><Head><title>إدارة المدن والأحياء | نبض</title></Head>
  <div className="p-8 space-y-6">
    <h1 className="text-2xl font-black">إدارة المدن والأحياء</h1>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <h2 className="font-black">إضافة موقع جديد</h2>
      <div className="grid gap-2 md:grid-cols-5">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded px-3 py-2"><option value="region">منطقة</option><option value="city">مدينة</option><option value="district">حي</option></select>
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="الكود (مثال: sa-riyadh)" dir="ltr" className="border rounded px-3 py-2"/>
        <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="الاسم بالعربية" className="border rounded px-3 py-2"/>
        <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="الاسم بالإنجليزية" className="border rounded px-3 py-2"/>
        <input value={form.parent_code} onChange={(e) => setForm({ ...form, parent_code: e.target.value })} placeholder="كود الأب (اختياري)" dir="ltr" className="border rounded px-3 py-2"/>
      </div>
      <button onClick={create} disabled={busy === 'create'} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50">إضافة</button>
    </div>
    <div className="flex gap-2">
      <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-3 py-2"><option value="region">مناطق</option><option value="city">مدن</option><option value="district">أحياء</option></select>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" className="border rounded px-3 py-2"/>
    </div>
    {loading ? <div className="p-8 text-center">جاري التحميل...</div> : (
    <div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-right text-sm"><thead className="bg-slate-50"><tr><th className="p-3">الكود</th><th className="p-3">عربي</th><th className="p-3">إنجليزي</th><th className="p-3">الأب</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.code} className="border-t"><td className="p-3 font-mono text-xs" dir="ltr">{r.code}</td><td className="p-3">{r.name_ar}</td><td className="p-3">{r.name_en}</td><td className="p-3 font-mono text-xs" dir="ltr">{r.parent_code || '—'}</td><td className="p-3">{r.is_active === false ? 'معطّل' : 'نشط'}</td><td className="p-3">{r.is_active !== false ? <button disabled={busy === r.code} onClick={() => void deactivate(r.code)} className="rounded border px-2 py-1 text-xs text-rose-700">تعطيل</button> : <span className="text-xs text-slate-400">—</span>}</td></tr>)}</tbody></table></div>)}
  </div></>);
}
