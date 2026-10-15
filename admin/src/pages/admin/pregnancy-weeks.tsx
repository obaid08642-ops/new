import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminMutation, apiErrorMessage } from '@/lib/admin-client';

/**
 * Issues #849 / #861: the pregnancy week catalogue (weeks 1-42) the patient app and website show in the maternity hub
 * (GET /maternity/content). The admin writes each week's size line, a short development text and an https image URL on the
 * CDN (nothing is bundled in the apps). A week that is not filled or not published shows an honest empty state to patients.
 * Articles appear under "Read this week" when the article form (المحتوى والنمو) sets their pregnancy week.
 */
type Week = { week: number; size_ar: string; size_en?: string; development_ar: string; development_en?: string; image_url?: string; published: boolean; updatedAt?: string; updated_by?: string };
type Form = { size_ar: string; size_en: string; development_ar: string; development_en: string; image_url: string; published: boolean; reason: string };

const WEEKS = Array.from({ length: 42 }, (_, i) => i + 1);
const EMPTY: Form = { size_ar: '', size_en: '', development_ar: '', development_en: '', image_url: '', published: false, reason: '' };
const CDN_HOSTS = ['cdn.nabd.plus', 'res.cloudinary.com'];

function cdnImage(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && CDN_HOSTS.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function PregnancyWeeksPage() {
  const [rows, setRows] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<Week[]>('/api/admin/admin/maternity/weeks');
      setRows(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل أسابيع الحمل.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const byWeek = new Map(rows.map((row) => [row.week, row]));

  function open(week: number) {
    const row = byWeek.get(week);
    setEditing(week);
    setError('');
    setForm(row ? { size_ar: row.size_ar, size_en: row.size_en || '', development_ar: row.development_ar, development_en: row.development_en || '', image_url: row.image_url || '', published: row.published, reason: '' } : EMPTY);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (editing === null) return;
    if (form.reason.trim().length < 5) { setError('سبب التعديل مطلوب (5 أحرف على الأقل).'); return; }
    if (form.image_url.trim() && !cdnImage(form.image_url.trim())) { setError(`رابط الصورة يجب أن يكون https على ${CDN_HOSTS.join(' أو ')}.`); return; }
    setSaving(true);
    setError('');
    try {
      await adminMutation(`/api/admin/admin/maternity/weeks/${editing}`, 'PUT', {
        size_ar: form.size_ar.trim(),
        size_en: form.size_en.trim() || undefined,
        development_ar: form.development_ar.trim(),
        development_en: form.development_en.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
        published: form.published,
        reason: form.reason.trim(),
      });
      setEditing(null);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر حفظ الأسبوع.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (editing === null) return;
    if (form.reason.trim().length < 5) { setError('اكتب سبب الحذف (5 أحرف على الأقل).'); return; }
    if (!window.confirm(`حذف محتوى الأسبوع ${editing}؟ سيظهر للمستخدمين أنه غير متوفر.`)) return;
    setSaving(true);
    try {
      await adminMutation(`/api/admin/admin/maternity/weeks/${editing}`, 'DELETE', { reason: form.reason.trim() });
      setEditing(null);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر حذف الأسبوع.'));
    } finally {
      setSaving(false);
    }
  }

  const preview = cdnImage(form.image_url.trim());

  return (
    <>
      <Head><title>أسابيع الحمل | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">أسابيع الحمل</h1>
          <p className="mt-1 text-sm text-slate-500">محتوى كل أسبوع (1-42) في مركز الأمومة: حجم الجنين، نص قصير عن النمو، وصورة على الـ CDN. الأسبوع غير المعبأ أو غير المنشور يظهر للمستخدمين كمحتوى غير متوفر.</p>
        </header>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل البيانات…</p> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">الأسابيع</h2>
              <p className="mt-1 text-xs text-slate-500">منشور {rows.filter((row) => row.published).length} · مسودة {rows.filter((row) => !row.published).length} · غير معبأ {WEEKS.length - rows.length}</p>
              <ul className="mt-4 divide-y">
                {WEEKS.map((week) => {
                  const row = byWeek.get(week);
                  return (
                    <li key={week} className="flex items-start justify-between gap-3 py-3">
                      <div>
                        <strong>الأسبوع {week}</strong>
                        <p className="mt-1 text-xs text-slate-500">{row ? `${row.published ? 'منشور' : 'مسودة'} · ${row.size_ar}${row.image_url ? ' · صورة' : ''}` : 'غير معبأ'}</p>
                      </div>
                      <button type="button" disabled={saving} onClick={() => open(week)} className={`rounded px-3 py-1 text-xs ${editing === week ? 'bg-teal-700 text-white' : 'border'}`}>{row ? 'تعديل' : 'تعبئة'}</button>
                    </li>
                  );
                })}
              </ul>
            </article>
            {editing !== null ? (
              <form onSubmit={save} className="space-y-3 self-start rounded-2xl border bg-white p-6 shadow-sm lg:sticky lg:top-6">
                <h2 className="text-xl font-bold">الأسبوع {editing}</h2>
                <label className="block text-sm">حجم الجنين (عربي)<input required maxLength={200} value={form.size_ar} onChange={(e) => setForm({ ...form, size_ar: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                <label className="block text-sm">حجم الجنين (إنجليزي)<input maxLength={200} dir="ltr" value={form.size_en} onChange={(e) => setForm({ ...form, size_en: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                <label className="block text-sm">نمو الجنين هذا الأسبوع (عربي)<textarea required maxLength={2000} value={form.development_ar} onChange={(e) => setForm({ ...form, development_ar: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border p-2" /></label>
                <label className="block text-sm">نمو الجنين هذا الأسبوع (إنجليزي)<textarea maxLength={2000} dir="ltr" value={form.development_en} onChange={(e) => setForm({ ...form, development_en: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border p-2" /></label>
                <label className="block text-sm">رابط الصورة على الـ CDN (https)<input type="url" maxLength={800} dir="ltr" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1 w-full rounded-lg border p-2" placeholder="https://cdn.nabd.plus/..." /></label>
                {preview ? <img src={preview} alt={`صورة الأسبوع ${editing}`} className="h-32 w-32 rounded-lg border object-cover" /> : null}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> منشور (يظهر للمستخدمين)</label>
                <textarea required minLength={5} maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="min-h-16 w-full rounded-lg border p-2" placeholder="سبب التعديل" />
                <div className="flex flex-wrap gap-2">
                  <button disabled={saving} className="rounded bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ وتدقيق'}</button>
                  <button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded border px-4 py-2">إلغاء</button>
                  {byWeek.has(editing) ? <button type="button" disabled={saving} onClick={() => void remove()} className="rounded border border-rose-300 px-4 py-2 text-rose-700">حذف</button> : null}
                </div>
              </form>
            ) : <p className="self-start rounded-2xl border bg-white p-6 text-sm text-slate-500">اختر أسبوعاً من القائمة لتعبئته أو تعديله.</p>}
          </div>
        )}
      </section>
    </>
  );
}
