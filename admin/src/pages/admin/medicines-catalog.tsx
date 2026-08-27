import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

/**
 * Unified medicines catalog manager:
 *  - catalog tab: search / paginate / create / edit (ALL fields incl. images,
 *    AR+EN names, active ingredient, indications, contraindications, warnings,
 *    side effects, price, category/sub-category) / soft-delete / restore
 *  - shortage badge toggle per item ("قد يكون غير متوفر")
 *  - change-requests tab: provider suggestions (field edit / new item / image)
 *    approve → applied to DB, reject → discarded
 *  - reports tab: top-selling, most-used, most-reported-unavailable
 *
 * Backend: /medicines/admin/catalog[...], /medicines/admin/change-requests[...],
 *          /medicines/admin/reports
 */

const EMPTY_FORM: any = {
  name_ar: '', name_en: '', active_ingredient: '', generic_name: '',
  manufacturer: '', brand: '', category: '', sub_category: '',
  form: '', strength: '', package_size: '', barcode: '',
  price: '', requires_prescription: false,
  images: '', image: '',
  description_ar: '', description_en: '',
  usage_instructions_ar: '', usage_instructions_en: '',
  indications_ar: '', indications_en: '',
  contraindications_ar: '', contraindications_en: '',
  warnings_ar: '', warnings_en: '',
  side_effects_ar: '', side_effects_en: '',
  precautions_ar: '', precautions_en: '',
};

const MAX_IMAGES = 3;

/** Upload a medicine image to Cloudflare R2 (default storage target) and return its public URL. */
async function uploadMedicineImage(file: File): Promise<string> {
  const data_base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const up = await apiFetch('/storage/upload', {
    method: 'POST',
    body: JSON.stringify({ data_base64, mime: file.type || 'image/jpeg', original_name: file.name || 'medicine.jpg', visibility: 'public_read' }),
  });
  const signed = await apiFetch(`/storage/${up.id}/signed-url`);
  return signed.url;
}

const toArr = (v: any): string[] => Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? v.split(/[،,\n]/).map(s => s.trim()).filter(Boolean) : []);
const fromArr = (v: any): string => Array.isArray(v) ? v.join('، ') : (v || '');

export default function MedicinesCatalogPage() {
  const [tab, setTab] = useState<'catalog' | 'requests' | 'reports'>('catalog');

  // catalog state
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // form (create / edit)
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imgBusy, setImgBusy] = useState(false);

  // change requests
  const [requests, setRequests] = useState<any[]>([]);
  const [reqStatus, setReqStatus] = useState('pending');
  // Partial approval: per-request field selection + admin value overrides
  const [fieldSel, setFieldSel] = useState<Record<string, Record<string, boolean>>>({});
  const [overrides, setOverrides] = useState<Record<string, Record<string, any>>>({});

  // reports
  const [reports, setReports] = useState<any>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (q.trim()) params.set('q', q.trim());
      if (category) params.set('category', category);
      if (includeDeleted) params.set('include_deleted', '1');
      const res = await apiFetch(`/medicines/admin/catalog?${params.toString()}`);
      setItems(res?.data || []);
      setTotal(res?.total || 0);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل الكتالوج');
    } finally {
      setLoading(false);
    }
  }, [page, q, category, includeDeleted]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/medicines/admin/change-requests?status=${reqStatus}&page=1&limit=50`);
      setRequests(res?.data || (Array.isArray(res) ? res : []));
    } catch { setRequests([]); } finally { setLoading(false); }
  }, [reqStatus]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try { setReports(await apiFetch('/medicines/admin/reports')); }
    catch { setReports(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'catalog') { const t = setTimeout(loadCatalog, 300); return () => clearTimeout(t); }
    if (tab === 'requests') loadRequests();
    if (tab === 'reports') loadReports();
  }, [tab, loadCatalog, loadRequests, loadReports]);

  const openCreate = () => { setForm(EMPTY_FORM); setImageUrls([]); setEditId(null); setFormMode('create'); };
  const openEdit = (m: any) => {
    setForm({
      ...EMPTY_FORM, ...m,
      images: fromArr(m.images), image: m.image || '',
      indications_ar: fromArr(m.indications_ar), indications_en: fromArr(m.indications_en),
      contraindications_ar: fromArr(m.contraindications_ar), contraindications_en: fromArr(m.contraindications_en),
      warnings_ar: fromArr(m.warnings_ar), warnings_en: fromArr(m.warnings_en),
      side_effects_ar: fromArr(m.side_effects_ar), side_effects_en: fromArr(m.side_effects_en),
      precautions_ar: fromArr(m.precautions_ar), precautions_en: fromArr(m.precautions_en),
      price: m.price ?? '',
    });
    setImageUrls(Array.isArray(m.images) && m.images.length ? m.images.slice(0, MAX_IMAGES) : (m.image ? [m.image] : []));
    setEditId(m.id);
    setFormMode('edit');
  };

  const saveForm = async () => {
    const payload: any = { ...form };
    for (const f of ['indications_ar','indications_en','contraindications_ar','contraindications_en','warnings_ar','warnings_en','side_effects_ar','side_effects_en','precautions_ar','precautions_en']) {
      payload[f] = toArr(form[f]);
    }
    payload.images = imageUrls;
    payload.image = imageUrls[0] || '';
    payload.price = parseFloat(form.price) || 0;
    setBusy('form');
    try {
      if (formMode === 'create') {
        await apiFetch('/medicines/admin/catalog', { method: 'POST', body: JSON.stringify(payload) });
      } else if (editId) {
        await apiFetch(`/medicines/admin/catalog/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      setFormMode('closed');
      await loadCatalog();
    } catch (e: any) {
      alert(`فشل الحفظ: ${e?.message || ''}`);
    } finally { setBusy(null); }
  };

  const softDelete = async (m: any, restore = false) => {
    if (!restore && !confirm(`حذف «${m.name_ar || m.name_en}» من الكتالوج؟ (حذف ناعم — يمكن استرجاعه)`)) return;
    setBusy(m.id);
    try {
      await apiFetch(`/medicines/admin/catalog/${m.id}/delete`, { method: 'POST', body: JSON.stringify({ restore }) });
      await loadCatalog();
    } catch (e: any) { alert(`فشل: ${e?.message || ''}`); } finally { setBusy(null); }
  };

  const toggleBadge = async (m: any) => {
    const flagged = m.availability_status === 'admin_flagged_shortage' || m.availability_status === 'availability_may_be_limited';
    setBusy(m.id);
    try {
      await apiFetch(`/medicines/admin/catalog/${m.id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ status: flagged ? 'none' : 'admin_flagged_shortage' }),
      });
      await loadCatalog();
    } catch (e: any) { alert(`فشل تغيير الشعار: ${e?.message || ''}`); } finally { setBusy(null); }
  };

  const decideRequest = async (r: any, action: 'approve' | 'reject') => {
    const id = r.id || r._id;
    setBusy(id);
    try {
      let body: any = {};
      if (action === 'reject') {
        body = { reason: 'رفض إداري' };
      } else if (r.type === 'field_edit' || r.type === 'new_item') {
        // PARTIAL approval: only checked fields go live; edited cells become overrides.
        const changes = r.changes || r.payload || {};
        const sel = fieldSel[id] || {};
        const approved_fields = Object.keys(changes).filter(k => sel[k] !== false);
        const ov = overrides[id] || {};
        const cleanOv = Object.fromEntries(Object.entries(ov).filter(([k, v]) => sel[k] !== false && v !== undefined && String(v) !== String(changes[k])));
        body = { approved_fields, overrides: cleanOv };
        if (approved_fields.length === 0) { alert('اختر حقلاً واحداً على الأقل للاعتماد'); setBusy(null); return; }
      }
      await apiFetch(`/medicines/admin/change-requests/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await loadRequests();
    } catch (e: any) { alert(`فشل الإجراء: ${e?.message || ''}`); } finally { setBusy(null); }
  };

  const F = (key: string, label: string, opts: { dir?: string; area?: boolean; ltr?: boolean } = {}) => (
    <div className={opts.area ? 'col-span-2' : ''}>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {opts.area ? (
        <textarea value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="border rounded px-2 py-1.5 w-full text-sm" rows={2} dir={opts.ltr ? 'ltr' : undefined} />
      ) : (
        <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="border rounded px-2 py-1.5 w-full text-sm" dir={opts.ltr ? 'ltr' : undefined} />
      )}
    </div>
  );

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <>
      <Head><title>كتالوج الأدوية | نبض</title></Head>
      <div className="p-8 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800">كتالوج الأدوية ومنتجات الصيدلية ({total})</h1>
            <p className="text-sm text-slate-500 mt-1">إدارة كاملة: إضافة / تعديل / حذف / شعار النواقص / اعتماد اقتراحات المزودين / تقارير.</p>
          </div>
          <div className="flex gap-2">
            {(['catalog', 'requests', 'reports'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${tab === t ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
                {t === 'catalog' ? 'الكتالوج' : t === 'requests' ? 'طلبات التغيير' : 'التقارير'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded">{error}</div>}

        {tab === 'catalog' && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="بحث بالاسم / المادة الفعالة / الباركود / الشركة..." className="border rounded px-4 py-2 w-80" />
              <input value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} placeholder="الفئة (اختياري)" className="border rounded px-3 py-2 w-48" />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)} /> إظهار المحذوفة
              </label>
              <button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-lg mr-auto">+ إضافة صنف جديد</button>
            </div>

            {formMode !== 'closed' && (
              <div className="bg-white rounded-xl border-2 border-teal-500 p-5 space-y-4">
                <h2 className="font-black text-lg text-slate-800">{formMode === 'create' ? 'إضافة صنف جديد' : 'تعديل الصنف'}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {F('name_ar', 'الاسم بالعربية *')}
                  {F('name_en', 'الاسم بالإنجليزية', { ltr: true })}
                  {F('active_ingredient', 'المادة الفعالة', { ltr: true })}
                  {F('generic_name', 'الاسم العلمي', { ltr: true })}
                  {F('manufacturer', 'الشركة المصنعة')}
                  {F('brand', 'العلامة التجارية')}
                  {F('category', 'الفئة (Category)')}
                  {F('sub_category', 'الفئة الفرعية (Sub-category)')}
                  {F('form', 'الشكل الدوائي (أقراص/شراب...)')}
                  {F('strength', 'التركيز (500mg...)', { ltr: true })}
                  {F('package_size', 'حجم العبوة')}
                  {F('barcode', 'الباركود', { ltr: true })}
                  {F('price', 'السعر (ر.س)', { ltr: true })}
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={!!form.requires_prescription} onChange={e => setForm({ ...form, requires_prescription: e.target.checked })} />
                      يتطلب وصفة طبية (Rx)
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">صور الدواء (حد أقصى {MAX_IMAGES} — تُرفع على التخزين مباشرة)</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {imageUrls.map((u, i) => (
                        <div key={i} className="relative w-24 h-24 border rounded-lg overflow-hidden bg-slate-50">
                          <img src={u} alt="" className="w-full h-full object-contain" />
                          <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, x) => x !== i))}
                            className="absolute top-1 left-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold">×</button>
                        </div>
                      ))}
                      {imageUrls.length < MAX_IMAGES && (
                        <label className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:border-teal-500 hover:text-teal-600 ${imgBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                          <span className="text-2xl">{imgBusy ? '…' : '+'}</span>
                          <span className="text-[10px] font-bold">{imgBusy ? 'جارٍ الرفع' : 'رفع صورة'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (!f) return;
                            setImgBusy(true);
                            try { const url = await uploadMedicineImage(f); setImageUrls(prev => [...prev, url].slice(0, MAX_IMAGES)); }
                            catch (err: any) { alert(`فشل رفع الصورة: ${err?.message || ''}`); }
                            finally { setImgBusy(false); }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                  {F('description_ar', 'الوصف بالعربية', { area: true })}
                  {F('description_en', 'الوصف بالإنجليزية', { area: true, ltr: true })}
                  {F('usage_instructions_ar', 'طريقة الاستخدام (عربي)', { area: true })}
                  {F('usage_instructions_en', 'طريقة الاستخدام (إنجليزي)', { area: true, ltr: true })}
                  {F('indications_ar', 'دواعي الاستخدام (عربي — افصل بفاصلة)', { area: true })}
                  {F('indications_en', 'دواعي الاستخدام (إنجليزي)', { area: true, ltr: true })}
                  {F('contraindications_ar', 'موانع الاستخدام (عربي)', { area: true })}
                  {F('contraindications_en', 'موانع الاستخدام (إنجليزي)', { area: true, ltr: true })}
                  {F('warnings_ar', 'التحذيرات (عربي)', { area: true })}
                  {F('warnings_en', 'التحذيرات (إنجليزي)', { area: true, ltr: true })}
                  {F('side_effects_ar', 'الأعراض الجانبية (عربي)', { area: true })}
                  {F('side_effects_en', 'الأعراض الجانبية (إنجليزي)', { area: true, ltr: true })}
                </div>
                <div className="flex gap-3">
                  <button onClick={saveForm} disabled={busy === 'form'} className="bg-teal-600 text-white font-bold px-8 py-2 rounded-lg disabled:opacity-50">
                    {busy === 'form' ? '...' : 'حفظ'}
                  </button>
                  <button onClick={() => setFormMode('closed')} className="text-slate-500 font-bold px-4">إلغاء</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">الفئة</th>
                      <th className="p-3">المادة الفعالة</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3">الشعار</th>
                      <th className="p-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((m: any) => {
                      const flagged = m.availability_status === 'admin_flagged_shortage' || m.availability_status === 'availability_may_be_limited';
                      const deleted = !!m.is_deleted;
                      return (
                        <tr key={m.id} className={deleted ? 'opacity-50 bg-red-50/40' : 'hover:bg-slate-50'}>
                          <td className="p-3">
                            <div className="font-bold">{m.name_ar || m.name_en}</div>
                            <div className="text-xs text-slate-400" dir="ltr">{m.name_en} {m.requires_prescription ? '· Rx' : ''}</div>
                          </td>
                          <td className="p-3 text-xs">{m.category}{m.sub_category ? ` / ${m.sub_category}` : ''}</td>
                          <td className="p-3 text-xs" dir="ltr">{m.active_ingredient || '—'}</td>
                          <td className="p-3 font-bold" dir="ltr">{m.price ?? '—'}</td>
                          <td className="p-3">
                            <button onClick={() => toggleBadge(m)} disabled={busy === m.id}
                              className={`text-xs font-bold px-2 py-1 rounded-full border ${flagged ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              {flagged ? 'قد يكون غير متوفر ✓' : 'تفعيل شعار النقص'}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(m)} className="text-teal-700 font-bold text-xs">تعديل</button>
                              {deleted ? (
                                <button onClick={() => softDelete(m, true)} disabled={busy === m.id} className="text-green-700 font-bold text-xs">استرجاع</button>
                              ) : (
                                <button onClick={() => softDelete(m)} disabled={busy === m.id} className="text-red-600 font-bold text-xs">حذف</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد أصناف مطابقة.</td></tr>}
                  </tbody>
                </table>
                <div className="flex justify-between items-center p-3 border-t border-slate-100 text-sm">
                  <span className="text-slate-500">صفحة {page} من {pages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-40">السابق</button>
                    <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="px-3 py-1 border rounded disabled:opacity-40">التالي</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'requests' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['pending', 'approved', 'partially_approved', 'rejected'].map(s => (
                <button key={s} onClick={() => setReqStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${reqStatus === s ? 'bg-teal-600 text-white' : 'bg-white border text-slate-600'}`}>
                  {s === 'pending' ? 'بانتظار المراجعة' : s === 'approved' ? 'معتمدة' : s === 'partially_approved' ? 'معتمدة جزئياً' : 'مرفوضة'}
                </button>
              ))}
            </div>
            {loading ? <div className="p-8 text-center text-slate-500">جاري التحميل...</div> : requests.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-slate-400">لا توجد طلبات تغيير {reqStatus === 'pending' ? 'بانتظار المراجعة' : ''}.</div>
            ) : (
              <div className="grid gap-3">
                {requests.map((r: any) => (
                  <div key={r.id || r._id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="flex-1 min-w-[260px]">
                        <div className="font-bold text-slate-800">
                          {r.type === 'new_item' ? 'اقتراح صنف جديد' : r.type === 'image_remove' ? 'طلب إزالة صورة' : r.type === 'shortage_badge' ? 'طلب شعار نقص' : 'اقتراح تعديل'} — {r.medicine_name || r.payload?.name_ar || r.medicine_id}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">من: {(r.reporter_role || r.suggested_by_role) === 'guest' ? 'زائر (غير مسجل)' : (r.reporter_role || r.suggested_by_role || 'مزود')} {r.createdAt && `· ${new Date(r.createdAt).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { hour12: false })}`}</div>
                        {(r.changes || r.payload) && r.current_values && Object.keys(r.changes || r.payload).length > 0 ? (
                          /* old → new diff table (snapshot captured at suggestion time);
                             pending field edits get per-field checkboxes (partial approval)
                             and editable proposed values (admin override before approval). */
                          <div className="mt-2 border border-slate-200 rounded overflow-hidden">
                            {reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item') && (
                              <div className="bg-teal-50 text-teal-800 text-[11px] font-bold px-2 py-1">يمكنك تحديد حقول بعينها للاعتماد وتعديل القيمة المقترحة قبل الاعتماد</div>
                            )}
                            <table className="min-w-full text-xs">
                              <thead className="bg-slate-100 text-slate-500">
                                <tr>{reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item') && <th className="px-2 py-1">اعتماد؟</th>}<th className="px-2 py-1 text-right">الحقل</th><th className="px-2 py-1 text-right">الحالية</th><th className="px-2 py-1 text-right">المقترحة</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {Object.entries(r.changes || r.payload).map(([k, v]: [string, any]) => {
                                  const rid = r.id || r._id;
                                  const editable = reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item');
                                  const checked = fieldSel[rid]?.[k] !== false;
                                  const ov = overrides[rid]?.[k];
                                  return (
                                  <tr key={k} className={editable && !checked ? 'opacity-40' : ''}>
                                    {editable && (
                                      <td className="px-2 py-1 text-center">
                                        <input type="checkbox" checked={checked} onChange={(e) => setFieldSel(prev => ({ ...prev, [rid]: { ...(prev[rid] || {}), [k]: e.target.checked } }))} />
                                      </td>
                                    )}
                                    <td className="px-2 py-1 font-mono text-slate-500" dir="ltr">{k}</td>
                                    <td className="px-2 py-1 text-slate-600 break-all max-w-[220px]">{r.current_values?.[k] !== null && r.current_values?.[k] !== undefined ? String(r.current_values[k]).slice(0, 160) : '—'}</td>
                                    <td className="px-2 py-1 font-bold text-emerald-700 break-all max-w-[220px]">
                                      {editable ? (
                                        <input
                                          value={ov !== undefined ? String(ov) : (typeof v === 'object' ? JSON.stringify(v) : String(v))}
                                          onChange={(e) => setOverrides(prev => ({ ...prev, [rid]: { ...(prev[rid] || {}), [k]: e.target.value } }))}
                                          className="border border-emerald-200 rounded px-1.5 py-0.5 w-full text-xs font-bold text-emerald-700 bg-white"
                                          dir="auto"
                                        />
                                      ) : (typeof v === 'object' ? JSON.stringify(v) : String(v).slice(0, 160))}
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (r.changes || r.payload) ? (
                          <pre className="mt-2 text-xs bg-slate-50 rounded p-2 overflow-x-auto" dir="ltr">{JSON.stringify(r.changes || r.payload, null, 2).slice(0, 600)}</pre>
                        ) : null}
                        {r.note && <div className="text-sm text-slate-600 mt-1">ملاحظة: {r.note}</div>}
                      </div>
                      {reqStatus === 'pending' && (
                        <div className="flex gap-2 items-start">
                          <button onClick={() => decideRequest(r, 'approve')} disabled={busy === (r.id || r._id)} className="bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-lg text-sm disabled:opacity-50">اعتماد</button>
                          <button onClick={() => decideRequest(r, 'reject')} disabled={busy === (r.id || r._id)} className="bg-red-100 text-red-700 font-bold px-4 py-1.5 rounded-lg text-sm disabled:opacity-50">رفض</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'reports' && (
          loading ? <div className="p-8 text-center text-slate-500">جاري التحميل...</div> : !reports ? (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-400">تعذر تحميل التقارير.</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-800 mb-3">الأكثر مبيعاً (من الطلبات)</h3>
                {(reports.top_selling || []).length === 0 ? <div className="text-sm text-slate-400">لا توجد مبيعات مسجلة بعد.</div> : (
                  <ol className="space-y-2 text-sm">
                    {reports.top_selling.map((t: any, i: number) => (
                      <li key={i} className="flex justify-between gap-2"><span className="font-bold truncate">{t.name}</span><span className="text-slate-500 whitespace-nowrap" dir="ltr">{t.qty}×</span></li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-800 mb-3">الأكثر استخداماً (مشاهدات/طلبات)</h3>
                {(reports.top_by_usage || []).length === 0 ? <div className="text-sm text-slate-400">لا توجد بيانات استخدام بعد.</div> : (
                  <ol className="space-y-2 text-sm">
                    {reports.top_by_usage.map((t: any, i: number) => (
                      <li key={i} className="flex justify-between gap-2"><span className="font-bold truncate">{t.name}</span><span className="text-slate-500 whitespace-nowrap" dir="ltr">{t.usage_count}</span></li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="bg-white rounded-xl border border-amber-200 p-4">
                <h3 className="font-black text-amber-700 mb-3">الأكثر بلاغاً عن النقص (غير متوفر)</h3>
                {(reports.most_unavailable || []).length === 0 ? <div className="text-sm text-slate-400">لا توجد بلاغات نقص.</div> : (
                  <ol className="space-y-2 text-sm">
                    {reports.most_unavailable.map((t: any, i: number) => (
                      <li key={i} className="flex justify-between gap-2"><span className="font-bold truncate">{t.name}</span><span className="text-amber-700 font-bold whitespace-nowrap" dir="ltr">{t.reports} بلاغ</span></li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
