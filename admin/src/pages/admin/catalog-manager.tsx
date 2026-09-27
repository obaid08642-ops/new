import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/api';

/**
 * Catalog Manager — الأدمن يضيف/يعدل/يحذف أصناف كتالوج الخدمات:
 * التحاليل (+الباقات)، الأشعة، وخدمات التمريض المنزلي.
 * Each catalog: GET|POST /<base>/admin/catalog, PUT|DELETE /<base>/admin/catalog/:id (base: labs | radiology | nursing).
 * The admin list includes unpublished items; patients only see items whose medical review is "approved".
 * Fields per catalog mirror the backend DTOs (labs.dto / radiology.dto / home-care.dto): an unknown field is a 400.
 */

type TabKey = 'labs' | 'packages' | 'radiology' | 'nursing';

type Field = { key: string; label: string; type: 'text' | 'number' | 'textarea' | 'checkbox' };
const F = {
  name_ar: { key: 'name_ar', label: 'الاسم (عربي)', type: 'text' },
  name_en: { key: 'name_en', label: 'الاسم (إنجليزي)', type: 'text' },
  short_code: { key: 'short_code', label: 'الكود المختصر', type: 'text' },
  category: { key: 'category', label: 'الفئة / التصنيف', type: 'text' },
  price: { key: 'price', label: 'السعر (ر.س)', type: 'number' },
  old_price: { key: 'old_price', label: 'السعر قبل الخصم', type: 'number' },
  description_ar: { key: 'description_ar', label: 'الوصف (عربي)', type: 'textarea' },
  description_en: { key: 'description_en', label: 'الوصف (إنجليزي)', type: 'textarea' },
  image_url: { key: 'image_url', label: 'رابط الصورة (Cloudinary)', type: 'text' },
  icon: { key: 'icon', label: 'الأيقونة', type: 'text' },
  popularity: { key: 'popularity', label: 'الشعبية (0-100)', type: 'number' },
  turnaround_hours: { key: 'turnaround_hours', label: 'مدة النتيجة (ساعة)', type: 'number' },
  sample_type: { key: 'sample_type', label: 'نوع العينة (blood/urine/swab)', type: 'text' },
  fasting_required: { key: 'fasting_required', label: 'يتطلب صياماً', type: 'checkbox' },
  home_visit_supported: { key: 'home_visit_supported', label: 'متاح بزيارة منزلية', type: 'checkbox' },
  duration: { key: 'duration', label: 'المدة (hour/shift)', type: 'text' },
  modality: { key: 'modality', label: 'نوع الأشعة (xray/ct/mri/ultrasound)', type: 'text' },
  body_part: { key: 'body_part', label: 'العضو المستهدف', type: 'text' },
  contrast_required: { key: 'contrast_required', label: 'يتطلب صبغة', type: 'checkbox' },
  active: { key: 'active', label: 'مفعّل', type: 'checkbox' },
} satisfies Record<string, Field>;

const TABS: { key: TabKey; label: string; adminBase: string; fields: Field[]; filter?: (i: any) => boolean }[] = [
  { key: 'labs', label: 'التحاليل', adminBase: '/labs/admin/catalog', filter: (i) => !i.is_package,
    fields: [F.name_ar, F.name_en, F.short_code, F.category, F.sample_type, F.price, F.old_price, F.turnaround_hours, F.popularity, F.fasting_required, F.home_visit_supported, F.active, F.description_ar, F.description_en] },
  { key: 'packages', label: 'الباقات', adminBase: '/labs/admin/catalog', filter: (i) => !!i.is_package,
    fields: [F.name_ar, F.name_en, F.short_code, F.category, F.price, F.old_price, F.turnaround_hours, F.popularity, F.home_visit_supported, F.active, F.description_ar, F.description_en] },
  { key: 'radiology', label: 'الأشعة', adminBase: '/radiology/admin/catalog',
    fields: [F.name_ar, F.name_en, F.short_code, F.modality, F.body_part, F.price, F.old_price, F.turnaround_hours, F.popularity, F.contrast_required, F.fasting_required, F.home_visit_supported, F.image_url, F.icon, F.active, F.description_ar, F.description_en] },
  { key: 'nursing', label: 'التمريض المنزلي', adminBase: '/nursing/admin/catalog',
    fields: [F.name_ar, F.name_en, F.category, F.price, F.duration, F.popularity, F.image_url, F.icon, F.active, F.description_ar, F.description_en] },
];

// Medical review = publication: only "approved" items are shown to patients and bookable.
const REVIEW: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: 'منشور للمرضى', color: '#166534', bg: '#DCFCE7' },
  pending: { label: 'بانتظار المراجعة الطبية', color: '#92400E', bg: '#FEF3C7' },
  rejected: { label: 'مرفوض', color: '#991B1B', bg: '#FEE2E2' },
  suspended: { label: 'موقوف', color: '#475569', bg: '#E2E8F0' },
};

export default function CatalogManagerPage() {
  const [tab, setTab] = useState<TabKey>('labs');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null); // {} = new item
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const tabCfg = TABS.find((t) => t.key === tab)!;

  const load = async (searchQ?: string) => {
    setLoading(true);
    try {
      const rows = await apiFetch(tabCfg.adminBase);
      const list = Array.isArray(rows) ? rows : rows?.data || [];
      setItems(tabCfg.filter ? list.filter(tabCfg.filter) : list);
    } catch (e: any) {
      setMsg(`فشل التحميل: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (v: string) => setSearch(v);

  useEffect(() => { setSearch(''); load(); }, [tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.name_ar, i.name_en, i.short_code, i.category].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q)),
    );
  }, [items, search]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setMsg('');
    try {
      const isNew = !editing.id;
      const body: any = {};
      for (const f of tabCfg.fields) {
        if (f.key in editing && editing[f.key] !== '' && editing[f.key] !== undefined) {
          body[f.key] = f.type === 'number' ? Number(editing[f.key] || 0) : f.type === 'checkbox' ? editing[f.key] !== false : editing[f.key];
        }
      }
      if (editing.medical_review_status) body.medical_review_status = editing.medical_review_status;
      if (tab === 'nursing' && !body.duration) body.duration = 'hour';
      if (tab === 'packages') body.is_package = true;
      if (isNew) {
        await apiFetch(tabCfg.adminBase, { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiFetch(`${tabCfg.adminBase}/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setMsg(isNew ? 'تمت الإضافة بنجاح' : 'تم الحفظ بنجاح');
      setEditing(null);
      await load();
    } catch (e: any) {
      setMsg(`فشل الحفظ: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: any) => {
    if (!confirm(`حذف "${item.name_ar}"؟`)) return;
    try {
      await apiFetch(`${tabCfg.adminBase}/${item.id}`, { method: 'DELETE' });
      setMsg('تم الحذف');
      await load();
    } catch (e: any) {
      setMsg(`فشل الحذف: ${e.message}`);
    }
  };

  return (
    <div dir="rtl" style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'Cairo, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>إدارة كتالوج الخدمات</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>إضافة وتعديل وحذف التحاليل والباقات والأشعة وخدمات التمريض. يظهر الصنف للمرضى بعد اعتماد المراجعة الطبية («منشور للمرضى»).</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700,
              background: tab === t.key ? '#23B5CE' : '#F1F5F9', color: tab === t.key ? '#fff' : '#334155' }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing({ active: true, medical_review_status: 'pending', ...(tab === 'nursing' ? { duration: 'hour', category: 'nursing' } : {}), ...(tab === 'radiology' ? { modality: '', body_part: '' } : {}) })} style={{ padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#0F172A', color: '#fff' }}>
          + إضافة صنف جديد
        </button>
      </div>

      <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="بحث بالاسم أو الكود أو الفئة…"
        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16, fontFamily: 'inherit' }} />


      {msg && <div style={{ padding: 12, borderRadius: 12, background: '#F0FDF4', color: '#166534', marginBottom: 12, fontWeight: 600 }}>{msg}</div>}
      {loading && <p>جارٍ التحميل…</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {filtered.map((item) => (
          <div key={item.id || item._id} style={{ border: '1px solid #E2E8F0', borderRadius: 16, padding: 14, display: 'flex', gap: 12, background: '#fff', opacity: item.active === false ? 0.55 : 1 }}>
            {item.image_url && <img src={item.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name_ar}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{item.name_en} · {item.short_code || item.category || item.modality || item.body_part || ''}{tab === 'nursing' && item.duration ? ` · ${item.duration}` : ''}{tab === 'radiology' && item.modality ? ` · ${item.modality}${item.body_part ? `/${item.body_part}` : ''}` : ''}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#23B5CE', marginTop: 4 }}>{item.price} ر.س</div>
              {(() => { const r = REVIEW[item.medical_review_status || 'pending'] || REVIEW.pending; return <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: r.color, background: r.bg }}>{r.label}</span>; })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setEditing({ ...item })} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>تعديل</button>
              <button onClick={() => remove(item)} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>حذف</button>
            </div>
          </div>
        ))}
      </div>
      {!loading && filtered.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', marginTop: 40 }}>لا توجد أصناف مطابقة.</p>}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setEditing(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: 'min(640px, 92vw)', maxHeight: '86vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>{editing.id ? 'تعديل الصنف' : 'إضافة صنف جديد'} — {tabCfg.label}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>المراجعة الطبية والنشر</label>
                <select value={editing.medical_review_status || 'pending'} onChange={(e) => setEditing({ ...editing, medical_review_status: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'inherit' }}>
                  {Object.entries(REVIEW).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                </select>
              </div>
              {tabCfg.fields.map((f) => (
                <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={editing[f.key] || ''} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      rows={3} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'inherit' }} />
                  ) : f.type === 'checkbox' ? (
                    <input type="checkbox" checked={editing[f.key] !== false} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} />
                  ) : (
                    <input type={f.type} value={editing[f.key] ?? ''} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'inherit' }} />
                  )}
                </div>
              ))}
            </div>
            {editing.image_url && <img src={editing.image_url} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', marginTop: 12 }} />}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>إلغاء</button>
              <button onClick={save} disabled={saving} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#23B5CE', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'جارٍ الحفظ…' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
