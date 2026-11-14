import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { dateLocale } from '../../utils/dates';
import { DataTable, type LooseRow, type LooseValue } from '@/components/DataTable';
import { BarcodeScanner, canScanWithCamera } from '@/components/BarcodeScanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useCan } from '@/components/AdminGuard';
import { MedicineQuickEdit, SensitiveChangeList, isPublished, sensitiveChanges, type SensitiveChange } from '@/components/MedicineQuickEdit';
import { PriceReviewQueue, type PriceReviewLine } from '@/components/PriceReviewQueue';

/**
 * Unified medicines catalog manager:
 *  - catalog tab: search / paginate / create / edit (ALL fields incl. images,
 *    AR+EN names, active ingredient, indications, contraindications, warnings,
 *    side effects, price, category/sub-category) / soft-delete / restore
 *  - shortage badge toggle per item ("قد يكون غير متوفر")
 *  - change-requests tab: provider suggestions (field edit / new item / image)
 *    approve → applied to DB, reject → discarded
 *  - reports tab: top-selling, most-used, most-reported-unavailable
 *  - items-to-review tab (decision 12): pharmacy offer lines with no catalogue match or above the catalogue price;
 *    a not-matched line opens the create form prefilled (GET /admin/pharmacy/price-review)
 *
 * Backend: /medicines/admin/catalog[...], /medicines/admin/change-requests[...],
 *          /medicines/admin/reports
 */

const EMPTY_FORM: any = {
  name_ar: '', name_en: '', active_ingredient: '', generic_name: '',
  manufacturer: '', brand: '', category: '', sub_category: '',
  form: '', strength: '', package_size: '', barcode: '',
  price: '', requires_prescription: false, controlled: false,
  covered_by_insurance: [],
  images: '', image: '',
  description_ar: '', description_en: '',
  usage_instructions_ar: '', usage_instructions_en: '',
  indications_ar: '', indications_en: '',
  contraindications_ar: '', contraindications_en: '',
  warnings_ar: '', warnings_en: '',
  side_effects_ar: '', side_effects_en: '',
  precautions_ar: '', precautions_en: '',
  reason: '',
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
  const [tab, setTab] = useState<'catalog' | 'review' | 'requests' | 'reports'>('catalog');

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
  // #456 / #1601: the insurance companies that cover the item (the product page's "covered by <company>" row reads them)
  const [companies, setCompanies] = useState<Array<{ id: string; name_ar?: string; name_en?: string }>>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imgBusy, setImgBusy] = useState(false);

  // quick edit sheet, barcode scan, confirmation of sensitive changes made in the full form
  const [quickItem, setQuickItem] = useState<LooseRow | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const canImport = useCan('catalog.import');
  // Each control names the permission its backend route requires (medicines.controller): a role that lacks it
  // does not see the control instead of getting a 403 after the tap.
  const canCreate = useCan('catalog.create');
  const canUpdate = useCan('catalog.update');
  const canPrice = useCan('catalog.price.write');
  const canEditItem = canUpdate && canPrice; // PATCH /medicines/admin/catalog/:id requires both
  const canApprove = useCan('catalog.approve');
  const canDelete = useCan('catalog.delete_restore');
  const canShortage = useCan('catalog.shortage.decide');
  const [importNote, setImportNote] = useState('');
  const [formConfirm, setFormConfirm] = useState<{ changes: SensitiveChange[]; published: boolean; run: () => Promise<void> } | null>(null);

  // change requests
  const [requests, setRequests] = useState<any[]>([]);
  const [reqStatus, setReqStatus] = useState('pending');
  // Issue 1556 (PR 3): the reviewed ingredients of a queued row, checked by the backend on approve.
  type IngRow = { inn: string; strength_value: string; strength_unit: string };
  type IngDraft = { ingredients: IngRow[]; dosage_form: string; route: string };
  const [ingVocab, setIngVocab] = useState<null | { inns: string[]; dosage_forms: string[]; routes: string[]; strength_units: string[] }>(null);
  const [ingDraft, setIngDraft] = useState<Record<string, IngDraft>>({});
  const [ingErr, setIngErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (tab !== 'requests' || ingVocab) return;
    apiFetch('/medicines/admin/ingredients/vocab')
      .then((v: any) => setIngVocab(v))
      .catch((e: any) => setIngErr(prev => ({ ...prev, _vocab: e?.message || 'تعذر تحميل القوائم' })));
  }, [tab, ingVocab]);
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

  // Camera scan: the public lookup route normalises the scanned code (GS1 strings...); the admin catalogue search
  // (name, ingredient, barcode...) then finds the item, published or not.
  const handleScanned = useCallback(async (code: string) => {
    setScanOpen(false);
    setScanNote('');
    let candidates = [code];
    try {
      const looked = await apiFetch('/medicines/lookup-barcode', { method: 'POST', body: JSON.stringify({ code }) });
      if (Array.isArray(looked?.codes_tried)) candidates = [code, ...looked.codes_tried.filter((c: string) => c !== code)];
    } catch { /* the typed code is still searched as it is */ }
    for (const candidate of candidates) {
      try {
        const res = await apiFetch(`/medicines/admin/catalog?q=${encodeURIComponent(candidate)}&page=1&limit=1&include_deleted=1`);
        if ((res?.data || []).length) { setQ(candidate); setPage(1); return; }
      } catch { /* try the next candidate */ }
    }
    setQ(code);
    setPage(1);
    setScanNote(`لا يوجد صنف بالباركود ${code}.`);
  }, []);

  useEffect(() => {
    if (formMode === 'closed' || companies.length) return;
    apiFetch('/insurance/companies/all')
      .then((r: any) => {
        const rows = Array.isArray(r) ? r : (r?.items || r?.data || []);
        setCompanies(rows.filter((c: any) => c && c.id && c.is_active !== false && c.active !== false));
      })
      .catch(() => setCompanies([]));
  }, [formMode, companies.length]);

  const openCreate = () => { setForm(EMPTY_FORM); setImageUrls([]); setEditId(null); setFormMode('create'); };
  // Decision 12: a pharmacy line with no catalogue match becomes a new catalogue item; the admin completes the form.
  const openCreateFromLine = (line: PriceReviewLine) => {
    setForm({
      ...EMPTY_FORM,
      name_ar: line.name_ar || '',
      name_en: line.name_en || '',
      price: line.offered_price ?? '',
      reason: 'إنشاء صنف من سطر عرض صيدلية غير مطابق للكتالوج',
    });
    setImageUrls([]);
    setEditId(null);
    setFormMode('create');
    setTab('catalog');
  };
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
      reason: '',
    });
    setImageUrls(Array.isArray(m.images) && m.images.length ? m.images.slice(0, MAX_IMAGES) : (m.image ? [m.image] : []));
    setEditId(m.id);
    setFormMode('edit');
  };

  const saveForm = async () => {
    // Only the form's own editable fields: openEdit() loads the whole stored document into the form, and sending
    // it back (_id, id, deleted_at, verified, …) made every edit fail with 400 (forbidNonWhitelisted).
    const payload: any = Object.fromEntries(Object.keys(EMPTY_FORM).filter((k) => k !== 'reason').map((k) => [k, form[k]]));
    for (const f of ['indications_ar','indications_en','contraindications_ar','contraindications_en','warnings_ar','warnings_en','side_effects_ar','side_effects_en','precautions_ar','precautions_en']) {
      payload[f] = toArr(form[f]);
    }
    payload.images = imageUrls;
    payload.image = imageUrls[0] || '';
    payload.price = parseFloat(form.price) || 0;
    // Backend requires `reason` (>=5 chars) when price changes on PATCH; for POST it logs price history.
    if (form.reason && String(form.reason).trim()) payload.reason = String(form.reason).trim();
    else if (formMode === 'create') payload.reason = 'إنشاء صنف جديد عبر واجهة الإدارة';
    const commit = async () => {
      setBusy('form');
      try {
        if (formMode === 'create') {
          await apiFetch('/medicines/admin/catalog', { method: 'POST', body: JSON.stringify(payload) });
        } else if (editId) {
          const saved: any = await apiFetch(`/medicines/admin/catalog/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
          // F8: without the approve permission the change waits for an approver; the public item is unchanged.
          if (saved?.pending_revision) alert('حُفظ التعديل وينتظر اعتماد مسؤول الكتالوج. يرى المرضى النسخة المعتمدة حتى يُنشر.');
        }
        setFormMode('closed');
        setFormConfirm(null);
        await loadCatalog();
      } catch (e: any) {
        setFormConfirm(null);
        alert(`فشل الحفظ: ${e?.message || ''}`);
      } finally { setBusy(null); }
    };
    if (formMode === 'edit' && editId) {
      const original = items.find((x: any) => x.id === editId);
      // Price / prescription / controlled changes ask for confirmation (old -> new) before they are saved, and need a
      // typed reason (>= 5 chars) that the item's change log keeps (backend: price_change_reason_required /
      // flag_change_reason_required).
      const changes = original ? sensitiveChanges(original, { price: payload.price, requires_prescription: !!payload.requires_prescription, controlled: !!payload.controlled }) : [];
      if (changes.length && (!payload.reason || String(payload.reason).trim().length < 5)) {
        alert('سبب التغيير مطلوب (5 أحرف على الأقل) عند تعديل السعر أو الوصفة الطبية أو صنف مراقب — يُحفظ في سجل تغييرات الصنف.');
        return;
      }
      if (changes.length) { setFormConfirm({ changes, published: isPublished(original), run: commit }); return; }
    }
    await commit();
  };

  const softDelete = async (m: any, restore = false) => {
    if (!restore && !confirm(`حذف «${m.name_ar || m.name_en}» من الكتالوج؟ (حذف ناعم — يمكن استرجاعه)`)) return;
    setBusy(m.id);
    try {
      await apiFetch(`/medicines/admin/catalog/${m.id}/delete`, { method: 'POST', body: JSON.stringify({ restore }) });
      await loadCatalog();
    } catch (e: any) { alert(`فشل: ${e?.message || ''}`); } finally { setBusy(null); }
  };

  // P6.0: direct medical-review decision on the catalog item.
  // CSV import into the medical-review queue (moved here from the old catalog-governance page, owner decision #949).
  const importCsv = async (file?: File) => {
    if (!file) return;
    setBusy('import'); setError(''); setImportNote('');
    try {
      const csv = await file.text();
      if (csv.split(/\r?\n/).filter((line) => line.trim()).length < 2) throw new Error('ملف CSV فارغ أو بلا صفوف بيانات.');
      const r = await apiFetch<{ imported?: number; failed?: number; needs_review?: number }>('/medicines/admin/import-csv', {
        method: 'POST', body: JSON.stringify({ csv, auto_approve: false }),
      });
      const imported = Number(r.imported ?? 0);
      setImportNote(`تم إدخال ${imported} صفاً؛ ${Number(r.needs_review ?? imported)} قيد المراجعة الطبية، وفشل ${Number(r.failed ?? 0)}.`);
      await loadCatalog();
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'تعذر استيراد CSV.');
    } finally { setBusy(null); }
  };

  const decideItem = async (m: any, approve: boolean) => {
    const question = m.pending_revision
      ? `${approve ? 'نشر' : 'رفض'} التعديل المقترح على «${m.name_ar || m.name_en}»؟${approve ? ' سيظهر للمرضى.' : ' تبقى النسخة المعتمدة كما هي.'}`
      : `${approve ? 'اعتماد' : 'رفض'} «${m.name_ar || m.name_en}»؟${approve ? ' سيظهر في الكتالوج العام.' : ''}`;
    if (!confirm(question)) return;
    setBusy(m.id);
    try {
      await apiFetch(`/medicines/admin/catalog/${m.id}/approve`, { method: 'POST', body: JSON.stringify({ approve }) });
      await loadCatalog();
    } catch (e: any) { alert(`فشل: ${e?.message || ''}`); } finally { setBusy(null); }
  };

  const toggleBadge = async (m: any) => {    const flagged = m.availability_status === 'admin_flagged_shortage' || m.availability_status === 'availability_may_be_limited';
    setBusy(m.id);
    try {
      await apiFetch(`/medicines/admin/catalog/${m.id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ status: flagged ? 'none' : 'admin_flagged_shortage' }),
      });
      await loadCatalog();
    } catch (e: any) { alert(`فشل تغيير الشعار: ${e?.message || ''}`); } finally { setBusy(null); }
  };

  const ingDraftOf = (r: any): IngDraft => ingDraft[r.id || r._id] || {
    ingredients: [{ inn: '', strength_value: '', strength_unit: '' }],
    dosage_form: r.changes?.dosage_form || '',
    route: r.changes?.route || '',
  };
  const patchIngDraft = (r: any, patch: (d: IngDraft) => IngDraft) => {
    const id = r.id || r._id;
    setIngDraft(prev => ({ ...prev, [id]: patch(ingDraftOf(r)) }));
  };
  const setIngRow = (r: any, i: number, change: Partial<IngRow>) => patchIngDraft(r, d => ({ ...d, ingredients: d.ingredients.map((x, k) => (k === i ? { ...x, ...change } : x)) }));
  // Builds the overrides the backend checks: empty rows are dropped; the value is a number or null.
  const ingOverrides = (r: any): { overrides?: any; error?: string } => {
    const d = ingDraftOf(r);
    const ingredients = d.ingredients.filter(x => x.inn).map(x => ({
      inn: x.inn,
      strength_value: x.strength_value.trim() === '' ? null : Number(x.strength_value),
      strength_unit: x.strength_unit || null,
    }));
    if (ingredients.some(x => x.strength_value !== null && !Number.isFinite(x.strength_value))) return { error: 'قيمة التركيز يجب أن تكون رقماً' };
    const overrides: any = {};
    if (ingredients.length) overrides.ingredients = ingredients;
    if (d.dosage_form) overrides.dosage_form = d.dosage_form;
    if (d.route) overrides.route = d.route;
    if (!Object.keys(overrides).length) return { error: 'أدخل مكوناً واحداً على الأقل أو الشكل الدوائي أو طريق الإعطاء' };
    return { overrides };
  };

  const decideRequest = async (r: any, action: 'approve' | 'reject') => {
    const id = r.id || r._id;
    setBusy(id);
    try {
      let body: any = {};
      if (action === 'reject') {
        body = { reason: 'رفض إداري' };
      } else if (r.type === 'ingredients_review') {
        const built = ingOverrides(r);
        if (built.error) { setIngErr(prev => ({ ...prev, [id]: built.error! })); setBusy(null); return; }
        body = { overrides: built.overrides };
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
      setIngErr(prev => { const next = { ...prev }; delete next[id]; return next; });
      await loadRequests();
    } catch (e: any) {
      // A 400 from the backend (for example "unknown INN") is shown on the row, not in an alert.
      if (r.type === 'ingredients_review') setIngErr(prev => ({ ...prev, [id]: e?.message || 'فشل الإجراء' }));
      else alert(`فشل الإجراء: ${e?.message || ''}`);
    } finally { setBusy(null); }
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
            {(['catalog', 'review', 'requests', 'reports'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${tab === t ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
                {t === 'catalog' ? 'الكتالوج' : t === 'review' ? 'أصناف للمراجعة' : t === 'requests' ? 'طلبات التغيير' : 'التقارير'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded">{error}</div>}

        {tab === 'catalog' && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1); setScanNote(''); }} placeholder="بحث بالاسم / المادة الفعالة / الباركود / الشركة..." className="border rounded px-4 py-2 w-80 max-w-full" />
              <button type="button" onClick={() => setScanOpen(true)} className="border border-slate-300 bg-white rounded-lg px-4 py-2 text-sm font-bold text-slate-700" aria-label={canScanWithCamera() ? 'مسح الباركود بالكاميرا' : 'إدخال الباركود'}>
                {canScanWithCamera() ? 'مسح الباركود' : 'إدخال باركود'}
              </button>
              <input value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} placeholder="الفئة (اختياري)" className="border rounded px-3 py-2 w-48" />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)} /> إظهار المحذوفة
              </label>
              {canImport && (
                <label className="border border-slate-300 bg-white rounded-lg px-4 py-2 text-sm font-bold text-slate-700 cursor-pointer">
                  استيراد CSV إلى طابور المراجعة
                  <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy === 'import'}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void importCsv(f); }} />
                </label>
              )}
              {canCreate ? <button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-lg ms-auto">+ إضافة صنف جديد</button> : null}
            </div>

            {importNote && <p role="status" className="text-sm text-emerald-700">{importNote}</p>}
            {scanNote && <p role="status" className="text-sm text-amber-700">{scanNote}</p>}

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
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={!!form.controlled} onChange={e => setForm({ ...form, controlled: e.target.checked })} />
                      صنف مراقب (لا يُطلب أونلاين)
                    </label>
                  </div>
                  {companies.length > 0 && (
                    <div className="col-span-2" data-testid="covered-by-insurance">
                      <label className="block text-sm font-bold text-slate-700 mb-2">شركات التأمين التي تغطي هذا الصنف</label>
                      <div className="flex flex-wrap gap-3">
                        {companies.map((c) => {
                          const on = Array.isArray(form.covered_by_insurance) && form.covered_by_insurance.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={(e) => {
                                  const cur: string[] = Array.isArray(form.covered_by_insurance) ? form.covered_by_insurance : [];
                                  setForm({ ...form, covered_by_insurance: e.target.checked ? [...cur, c.id] : cur.filter((x) => x !== c.id) });
                                }}
                              />
                              {c.name_ar || c.name_en || c.id}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">صور الدواء (حد أقصى {MAX_IMAGES} — تُرفع على التخزين مباشرة)</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {imageUrls.map((u, i) => (
                        <div key={i} className="relative w-24 h-24 border rounded-lg overflow-hidden bg-slate-50">
                          <img src={u} alt="" className="w-full h-full object-contain" />
                          <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, x) => x !== i))}
                            className="absolute top-1 end-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold">×</button>
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
                  {F('dosage_ar', 'الجرعة (عربي)', { area: true })}
                  {F('dosage_en', 'الجرعة (إنجليزي)', { area: true, ltr: true })}
                  {F('interactions', 'التداخلات الدوائية', { area: true, ltr: true })}
                  {F('storage_conditions', 'شروط التخزين', { area: true })}
                  {F('precautions_ar', 'الاحتياطات (عربي)', { area: true })}
                  {F('precautions_en', 'الاحتياطات (إنجليزي)', { area: true, ltr: true })}
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-amber-700 mb-1">سبب التغيير (مطلوب عند تعديل السعر أو الوصفة الطبية أو صنف مراقب — 5 أحرف على الأقل، يُحفظ في سجل تغييرات الصنف)</label>
                    <input value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="مثال: تحديث تسعيرة المورد / عرض ترويجي" className="border border-amber-200 rounded px-2 py-1.5 w-full text-sm bg-amber-50/50" />
                  </div>
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
                <DataTable
                  bare
                  dense
                  rows={items as LooseRow[]}
                  getRowKey={(m: LooseRow) => String(m.id)}
                  emptyText="لا توجد أصناف مطابقة."
                  rowClassName={(m: LooseRow) => (m.is_deleted ? 'opacity-50 bg-red-50/40' : 'hover:bg-slate-50')}
                  columns={[
                    { key: 'name', header: 'الصنف', render: (m: LooseRow) => (
                      <>
                        <div className="font-bold">{m.name_ar || m.name_en}</div>
                        <div className="text-xs text-slate-400" dir="ltr">{m.name_en} {m.requires_prescription ? '· Rx' : ''}</div>
                      </>
                    ) },
                    { key: 'category', header: 'الفئة', className: 'text-xs', render: (m: LooseRow) => <>{m.category}{m.sub_category ? ` / ${m.sub_category}` : ''}</> },
                    { key: 'ingredient', header: 'المادة الفعالة', className: 'text-xs', render: (m: LooseRow) => <span dir="ltr">{m.active_ingredient || '—'}</span> },
                    { key: 'price', header: 'السعر', className: 'font-bold', render: (m: LooseRow) => <span dir="ltr">{m.price ?? '—'}</span> },
                    { key: 'badge', header: 'الشعار', render: (m: LooseRow) => {
                      const flagged = m.availability_status === 'admin_flagged_shortage' || m.availability_status === 'availability_may_be_limited';
                      if (!canShortage) return <span className="text-xs text-slate-500">{flagged ? 'قد يكون غير متوفر' : '—'}</span>;
                      return (
                        <button onClick={() => toggleBadge(m)} disabled={busy === m.id}
                          className={`text-xs font-bold px-2 py-1 rounded-full border ${flagged ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          {flagged ? 'قد يكون غير متوفر ✓' : 'تفعيل شعار النقص'}
                        </button>
                      );
                    } },
                    { key: 'actions', header: 'إجراءات', actions: true, render: (m: LooseRow) => {
                      const deleted = !!m.is_deleted;
                      return (
                        <div className="flex gap-2">
                          {canEditItem ? <button onClick={() => setQuickItem(m)} className="text-teal-700 font-bold text-xs">تعديل سريع</button> : null}
                          {canEditItem ? <button onClick={() => openEdit(m)} className="text-teal-700 font-bold text-xs">تعديل</button> : null}
                          {!canApprove ? null : m.pending_revision ? (
                            // F8: an editor's change waits here; patients still see the approved version.
                            <>
                              <button onClick={() => alert(`تعديل بانتظار الاعتماد:\n${Object.entries(m.pending_revision.changes || {}).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('\n')}`)} className="text-amber-700 font-bold text-xs">تعديل بانتظار الاعتماد</button>
                              <button onClick={() => decideItem(m, true)} disabled={busy === m.id} className="text-green-700 font-bold text-xs">نشر التعديل</button>
                              <button onClick={() => decideItem(m, false)} disabled={busy === m.id} className="text-red-600 font-bold text-xs">رفض التعديل</button>
                            </>
                          ) : m.medical_review_status === 'approved' ? (
                            <button onClick={() => decideItem(m, false)} disabled={busy === m.id} className="text-amber-700 font-bold text-xs">رفض</button>
                          ) : (
                            <button onClick={() => decideItem(m, true)} disabled={busy === m.id} className="text-green-700 font-bold text-xs">اعتماد</button>
                          )}
                          {!canDelete ? null : deleted ? (
                            <button onClick={() => softDelete(m, true)} disabled={busy === m.id} className="text-green-700 font-bold text-xs">استرجاع</button>
                          ) : (
                            <button onClick={() => softDelete(m)} disabled={busy === m.id} className="text-red-600 font-bold text-xs">حذف</button>
                          )}
                        </div>
                      );
                    } },
                  ]}
                />
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
                        <div className="text-xs text-slate-400 mt-0.5">من: {(r.reporter_role || r.suggested_by_role) === 'guest' ? 'زائر (غير مسجل)' : (r.reporter_role || r.suggested_by_role || 'مزود')} {r.createdAt && `· ${new Date(r.createdAt).toLocaleString(dateLocale(), { hour12: false, numberingSystem: 'latn' })}`}</div>
                        {r.type !== 'ingredients_review' && (r.changes || r.payload) && r.current_values && Object.keys(r.changes || r.payload).length > 0 ? (
                          /* old → new diff table (snapshot captured at suggestion time);
                             pending field edits get per-field checkboxes (partial approval)
                             and editable proposed values (admin override before approval). */
                          <div className="mt-2 border border-slate-200 rounded overflow-hidden">
                            {reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item') && (
                              <div className="bg-teal-50 text-teal-800 text-[11px] font-bold px-2 py-1">يمكنك تحديد حقول بعينها للاعتماد وتعديل القيمة المقترحة قبل الاعتماد</div>
                            )}
                            <DataTable
                              bare
                              dense
                              rows={Object.entries(r.changes || r.payload) as [string, LooseValue][]}
                              getRowKey={([k]) => k}
                              rowClassName={([k]) => {
                                const editable = reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item');
                                return editable && fieldSel[r.id || r._id]?.[k] === false ? 'opacity-40' : '';
                              }}
                              columns={[
                                ...(reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item') ? [{
                                  key: 'sel', header: 'اعتماد؟', className: 'text-center',
                                  render: ([k]: [string, LooseValue]) => {
                                    const rid = r.id || r._id;
                                    const checked = fieldSel[rid]?.[k] !== false;
                                    return <input type="checkbox" checked={checked} onChange={(e) => setFieldSel(prev => ({ ...prev, [rid]: { ...(prev[rid] || {}), [k]: e.target.checked } }))} />;
                                  },
                                }] : []),
                                { key: 'field', header: 'الحقل', className: 'font-mono text-slate-500', render: ([k]: [string, LooseValue]) => <span dir="ltr">{k}</span> },
                                { key: 'current', header: 'الحالية', className: 'text-slate-600 break-all max-w-[220px]', render: ([k]: [string, LooseValue]) => (r.current_values?.[k] !== null && r.current_values?.[k] !== undefined ? String(r.current_values[k]).slice(0, 160) : '—') },
                                { key: 'proposed', header: 'المقترحة', className: 'font-bold text-emerald-700 break-all max-w-[220px]', render: ([k, v]: [string, LooseValue]) => {
                                  const rid = r.id || r._id;
                                  const editable = reqStatus === 'pending' && (r.type === 'field_edit' || r.type === 'new_item');
                                  const ov = overrides[rid]?.[k];
                                  return editable ? (
                                    <input
                                      value={ov !== undefined ? String(ov) : (typeof v === 'object' ? JSON.stringify(v) : String(v))}
                                      onChange={(e) => setOverrides(prev => ({ ...prev, [rid]: { ...(prev[rid] || {}), [k]: e.target.value } }))}
                                      className="border border-emerald-200 rounded px-1.5 py-0.5 w-full text-xs font-bold text-emerald-700 bg-white"
                                      dir="auto"
                                    />
                                  ) : (typeof v === 'object' ? JSON.stringify(v) : String(v).slice(0, 160));
                                } },
                              ]}
                            />
                          </div>
                        ) : r.type !== 'ingredients_review' && (r.changes || r.payload) ? (
                          <pre className="mt-2 text-xs bg-slate-50 rounded p-2 overflow-x-auto" dir="ltr">{JSON.stringify(r.changes || r.payload, null, 2).slice(0, 600)}</pre>
                        ) : null}
                        {r.type === 'ingredients_review' && (
                          <div className="mt-2 border border-slate-200 rounded p-3 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                              {['active_ingredient', 'generic_name', 'strength', 'form'].map(k => (
                                <div key={k}><span className="font-bold">{k}: </span><span dir="ltr">{r.current_values?.[k] ?? '—'}</span></div>
                              ))}
                            </div>
                            {reqStatus === 'pending' && ingVocab && (
                              <div className="space-y-2">
                                <div className="font-bold text-slate-700">المكونات (المادة الفعالة والتركيز)</div>
                                {ingDraftOf(r).ingredients.map((row, i) => (
                                  <div key={i} className="flex flex-wrap gap-2 items-center">
                                    <select value={row.inn} onChange={e => setIngRow(r, i, { inn: e.target.value })} className="border rounded px-2 py-1 text-xs" dir="ltr">
                                      <option value="">— اختر المادة —</option>
                                      {ingVocab.inns.map(x => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                    <input type="number" step="any" min="0" value={row.strength_value} onChange={e => setIngRow(r, i, { strength_value: e.target.value })} className="border rounded px-2 py-1 text-xs w-28" dir="ltr" placeholder="التركيز" />
                                    <select value={row.strength_unit} onChange={e => setIngRow(r, i, { strength_unit: e.target.value })} className="border rounded px-2 py-1 text-xs" dir="ltr">
                                      <option value="">— الوحدة —</option>
                                      {ingVocab.strength_units.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <button onClick={() => patchIngDraft(r, d => ({ ...d, ingredients: d.ingredients.filter((_, k) => k !== i) }))} className="text-red-600 text-xs font-bold">حذف</button>
                                  </div>
                                ))}
                                <button onClick={() => patchIngDraft(r, d => ({ ...d, ingredients: [...d.ingredients, { inn: '', strength_value: '', strength_unit: '' }] }))} className="text-teal-700 text-xs font-bold">+ إضافة مكوّن</button>
                                <div className="flex flex-wrap gap-3 text-xs">
                                  <label className="flex items-center gap-1">الشكل الدوائي
                                    <select value={ingDraftOf(r).dosage_form} onChange={e => patchIngDraft(r, d => ({ ...d, dosage_form: e.target.value }))} className="border rounded px-2 py-1" dir="ltr">
                                      <option value="">—</option>
                                      {ingVocab.dosage_forms.map(x => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                  </label>
                                  <label className="flex items-center gap-1">طريق الإعطاء
                                    <select value={ingDraftOf(r).route} onChange={e => patchIngDraft(r, d => ({ ...d, route: e.target.value }))} className="border rounded px-2 py-1" dir="ltr">
                                      <option value="">—</option>
                                      {ingVocab.routes.map(x => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                  </label>
                                </div>
                              </div>
                            )}
                            {reqStatus === 'pending' && !ingVocab && <div className="text-xs text-slate-500">جاري تحميل القوائم...</div>}
                            {ingErr[r.id || r._id] && <div className="text-red-700 text-xs font-bold">{ingErr[r.id || r._id]}</div>}
                          </div>
                        )}
                        {r.note && <div className="text-sm text-slate-600 mt-1">ملاحظة: {r.note}</div>}
                      </div>
                      {canUpdate && reqStatus === 'pending' && (
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

        {tab === 'review' && <PriceReviewQueue onCreateFromLine={openCreateFromLine} canCreate={canCreate} />}

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

      {scanOpen && <BarcodeScanner onCode={handleScanned} onClose={() => setScanOpen(false)} />}
      {quickItem && <MedicineQuickEdit medicine={quickItem} onClose={() => setQuickItem(null)} onSaved={loadCatalog} />}
      <ConfirmDialog
        open={!!formConfirm}
        title="تأكيد التغيير"
        confirmLabel="نعم، احفظ"
        busy={busy === 'form'}
        onConfirm={() => void formConfirm?.run()}
        onCancel={() => setFormConfirm(null)}
      >
        {formConfirm && <SensitiveChangeList changes={formConfirm.changes} published={formConfirm.published} />}
      </ConfirmDialog>
    </>
  );
}
