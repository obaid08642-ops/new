import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';

type Permission = { key: string; label_ar?: string };
type Role = { id?: string; key: string; name_ar?: string; permissions: string[]; is_system?: boolean };
type Catalog = { permissions: Permission[]; system_roles: Role[] };

export default function RbacPage() {
  const [catalog, setCatalog] = useState<Catalog>({ permissions: [], system_roles: [] });
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ key: '', name_ar: '', permissions: [] as string[], reason: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextCatalog, nextRoles] = await Promise.all([adminFetch<Catalog>('/rbac/catalog'), adminFetch<{ data?: Role[] } | Role[]>('/rbac/roles')]);
      setCatalog(nextCatalog);
      setRoles(Array.isArray(nextRoles) ? nextRoles : nextRoles.data || []);
    } catch (cause) { setError(apiErrorMessage(cause, 'تعذر تحميل مصفوفة الصلاحيات.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const allRoles = useMemo(() => [...catalog.system_roles, ...roles], [catalog.system_roles, roles]);
  function togglePermission(key: string) {
    setForm((current) => ({ ...current, permissions: current.permissions.includes(key) ? current.permissions.filter((item) => item !== key) : [...current.permissions, key] }));
  }
  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    if (!form.key.trim() || !form.name_ar.trim() || form.reason.trim().length < 5) { setError('المعرّف والاسم وسبب لا يقل عن خمسة أحرف مطلوبة.'); return; }
    setCreating(true); setError('');
    try {
      await adminMutation('/rbac/roles', 'POST', { key: form.key.trim(), name_ar: form.name_ar.trim(), permissions: form.permissions, reason: form.reason.trim() });
      setForm({ key: '', name_ar: '', permissions: [], reason: '' });
      await load();
    } catch (cause) { setError(apiErrorMessage(cause, 'تعذر إنشاء الدور.')); }
    finally { setCreating(false); }
  }

  return <><Head><title>الأدوار والصلاحيات | نبض</title></Head><section dir="rtl" className="space-y-6 p-6 md:p-8">
    <header><h1 className="text-3xl font-bold">الأدوار والصلاحيات</h1><p className="mt-1 text-sm text-slate-500">الكتالوج والأدوار مصدرها backend؛ منع تعديل أدوار النظام مفروض خادمياً.</p></header>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="min-w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-4">الدور</th><th className="p-4">النوع</th><th className="p-4">عدد الصلاحيات</th><th className="p-4">الصلاحيات</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="p-10 text-center text-slate-500">جارٍ تحميل الأدوار…</td></tr> : allRoles.map((role) => <tr key={role.id || role.key} className="border-t"><td className="p-4 font-bold">{role.name_ar || role.key}<p dir="ltr" className="mt-1 text-xs font-normal text-slate-500">{role.key}</p></td><td className="p-4">{role.is_system ? 'دور نظامي محمي' : 'دور مخصص'}</td><td className="p-4">{role.permissions.length}</td><td className="max-w-2xl p-4 text-xs text-slate-600">{role.permissions.join('، ') || 'لا توجد صلاحيات'}</td></tr>)}</tbody></table></div>
    <form onSubmit={createRole} className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">إنشاء دور مخصص</h2><p className="mt-1 text-sm text-slate-500">سيُسجل الإنشاء في audit ولا تقبل مفاتيح الصلاحيات غير الموجودة في الكتالوج.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">مفتاح الدور<input required value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })} dir="ltr" className="mt-1 w-full rounded-lg border p-2" placeholder="support_ops" /></label><label className="text-sm font-medium">الاسم العربي<input required value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label></div><fieldset className="mt-5"><legend className="text-sm font-bold">صلاحيات الدور</legend><div className="mt-2 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 md:grid-cols-2">{catalog.permissions.map((permission) => <label key={permission.key} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={form.permissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} /><span>{permission.label_ar || permission.key}<small dir="ltr" className="mr-2 text-slate-400">{permission.key}</small></span></label>)}</div></fieldset><label className="mt-5 block text-sm font-medium">سبب الإنشاء<textarea required minLength={5} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2" /></label><button disabled={creating} className="mt-4 rounded-lg bg-teal-700 px-5 py-2 font-bold text-white disabled:opacity-50">{creating ? 'جارٍ الحفظ…' : 'إنشاء الدور وتدقيقه'}</button></form>
  </section></>;
}
