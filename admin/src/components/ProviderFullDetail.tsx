import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

const DAY_AR: Record<string, string> = {
  SUN: 'الأحد', MON: 'الاثنين', TUE: 'الثلاثاء', WED: 'الأربعاء',
  THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت',
};

/** Resolve a storage object UUID (or passthrough an http/data URL) to a viewable URL. */
const urlCache = new Map<string, string | null>();
export async function resolveStorageUrl(idOrUrl?: string | null): Promise<string | null> {
  if (!idOrUrl) return null;
  if (/^(https?:)?\/\//i.test(idOrUrl) || idOrUrl.startsWith('data:')) return idOrUrl;
  if (urlCache.has(idOrUrl)) return urlCache.get(idOrUrl) || null;
  try {
    // Prefer a signed delivery URL — private Cloudinary assets (provider photos,
    // clinic galleries, KYC docs) 401 on their raw external_url.
    const sres = await fetchWithAdminGuard(`/api/admin/storage/${idOrUrl}/signed-url`);
    if (sres.ok) {
      const sd = await sres.json();
      if (sd.url) { urlCache.set(idOrUrl, sd.url); return sd.url; }
    }
    const res = await fetchWithAdminGuard(`/api/admin/storage/${idOrUrl}`);
    if (!res.ok) { urlCache.set(idOrUrl, null); return null; }
    const d = await res.json();
    const u = d.external_url || (d.data_base64 ? `data:${d.mime || 'application/octet-stream'};base64,${d.data_base64}` : null);
    urlCache.set(idOrUrl, u);
    return u;
  } catch {
    urlCache.set(idOrUrl, null);
    return null;
  }
}

export function StorageImage({ id, alt, className }: { id?: string | null; alt?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setSrc(null); setFailed(false);
    resolveStorageUrl(id).then(u => { if (alive) { if (u) setSrc(u); else setFailed(true); } });
    return () => { alive = false; };
  }, [id]);
  if (!id) return null;
  if (failed) return <span className="text-xs text-red-400">تعذر تحميل الملف</span>;
  if (!src) return <span className="inline-block h-20 w-20 bg-gray-100 animate-pulse rounded border border-gray-200" />;
  return (
    <a href={src} target="_blank" rel="noreferrer">
      <img src={src} alt={alt || 'ملف مرفوع'} className={className || 'h-20 w-20 object-cover rounded border border-gray-300'} />
    </a>
  );
}

export function StorageFileLink({ id, label }: { id?: string | null; label: string }) {
  const [href, setHref] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    resolveStorageUrl(id).then(u => { if (alive) { if (u) setHref(u); else setFailed(true); } });
    return () => { alive = false; };
  }, [id]);
  if (!id) return null;
  if (failed) return <span className="text-xs bg-red-50 text-red-500 border border-red-200 rounded px-2 py-1">{label} (تعذر التحميل)</span>;
  if (!href) return <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 rounded px-2 py-1">{label}…</span>;
  return <a href={href} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 underline">{label}</a>;
}

function Field({ label, value, mono, bool, span }: { label: string; value: any; mono?: boolean; bool?: boolean; span?: boolean }) {
  let display: string;
  if (bool) display = value ? 'نعم' : 'لا';
  else if (Array.isArray(value)) display = value.length ? value.map(v => (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v)).join('، ') : '—';
  else if (value !== null && typeof value === 'object') display = JSON.stringify(value);
  else if (value === null || value === undefined || value === '') display = '—';
  else display = String(value);
  return (
    <div className={`space-y-1 ${span ? 'col-span-2' : ''}`}>
      <label className="text-sm font-bold text-gray-500">{label}</label>
      <p className={`text-gray-800 break-words ${mono ? 'font-mono text-sm' : ''}`}>{display}</p>
    </div>
  );
}

function Section({ title, children, tone = 'slate' }: { title: string; children: React.ReactNode; tone?: 'slate' | 'teal' | 'amber' | 'indigo' }) {
  const tones = { slate: 'bg-slate-700', teal: 'bg-teal-700', amber: 'bg-amber-600', indigo: 'bg-indigo-700' };
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className={`${tones[tone]} text-white px-4 py-2.5 font-bold text-sm`}>{title}</div>
      <div className="p-4 bg-white space-y-4">{children}</div>
    </div>
  );
}

const REVIEW_LABELS: Record<string, { label: string; cls: string }> = {
  approved: { label: 'معتمد', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700' },
  needs_replacement: { label: 'يحتاج إعادة', cls: 'bg-amber-100 text-amber-700' },
  under_review: { label: 'قيد المراجعة', cls: 'bg-blue-100 text-blue-700' },
  pending: { label: 'قيد المراجعة', cls: 'bg-blue-100 text-blue-700' },
};

function ReviewBadge({ status }: { status?: string }) {
  const r = REVIEW_LABELS[String(status || 'pending')] || REVIEW_LABELS.pending;
  return <span className={`text-xs px-2 py-1 rounded font-bold ${r.cls}`}>{r.label}</span>;
}

/** Keys rendered explicitly below — everything else on the onboarding record is
 *  dumped automatically in the catch-all section so NO entered field is hidden. */
const RENDERED_ONBOARDING_KEYS = new Set([
  'id', 'account_id', 'user_id', 'type', 'status', 'name_ar', 'name_en',
  'license_number', 'moh_license_number', 'scfhs_license_number', 'sfda_license_number',
  'cr_number', 'tax_number', 'iban', 'bank_account_name',
  'city', 'district', 'address', 'location', 'bio',
  'specialty', 'sub_specialties', 'academic_degree', 'years_experience', 'languages', 'gender_pref',
  'consultation_modes', 'price_clinic', 'price_online', 'price_home',
  'home_visit_supported', 'coverage_radius_km', 'accepts_cash',
  'accepts_insurance', 'accepted_insurance', 'insurance_clinic', 'insurance_online', 'insurance_home',
  'has_insurance_officer', 'insurance_contracts', 'working_hours',
  'signature_url', 'signer_name', 'signer_role', 'license_documents', 'clinic_images',
  'enabled_categories', 'test_categories', 'pricingModel', 'nursing_services', 'equipment_list',
  'rx_dispensing', 'otc_selling', 'has_own_delivery', 'has_own_drivers', 'delivery_mode',
  'max_delivery_radius_km', 'express_delivery',
  'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster',
  'license_status', 'license_verified', 'commission_rate', 'onboarding_step', 'onboarding_completed',
  'createdAt', 'updatedAt',
  'display_name_ar', 'display_name_en', 'gender', 'national_id', 'profile_photo', 'logo',
  'schedule_clinic', 'schedule_video', 'schedule_home', 'home_visit_radius_km',
  'clinic_duration', 'video_duration', 'home_transport_fee', 'home_transport_price',
  'vacation_date', 'registration_steps',
  // internal/system fields — not user-entered data
  '_id', '__v', 'is_deleted', 'deleted_at', 'created_by', 'updated_by', 'slug',
  'rating', 'reviews_count', 'rating_avg', 'rating_count', 'verification_logs',
]);

function genericValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
  if (Array.isArray(v)) return v.length ? v.map(x => (typeof x === 'object' && x !== null) ? JSON.stringify(x) : String(x)).join('، ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function ProviderFullDetail({ detail, accountId }: { detail: any; accountId?: string }) {
  const ob: any = detail?.onboarding || {};
  const prof: any = detail?.profile || {};
  const acc: any = detail?.account || {};
  const bank: any = detail?.bank || {};
  const docs: any[] = detail?.documents || [];
  const cid = accountId || acc.id || ob.account_id;

  const [contractMeta, setContractMeta] = useState<any | null>(null);
  const [contractBusy, setContractBusy] = useState(false);

  const downloadContract = async () => {
    if (!cid) return;
    setContractBusy(true);
    try {
      const res = await fetchWithAdminGuard(`/api/admin/provider-onboarding/admin/contracts/${cid}`);
      if (!res.ok) throw new Error('no_contract');
      const data = await res.json();
      const bytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `contract-${cid}.pdf`; a.click();
      URL.revokeObjectURL(url);
      setContractMeta({ visible_to_provider: data.visible_to_provider, sha256: data.sha256 });
    } catch {
      alert('تعذر تحميل العقد — لم يُولّد عقد لهذا المزود بعد.');
    } finally {
      setContractBusy(false);
    }
  };

  const hasOnboarding = !!detail?.onboarding;
  const extraKeys = Object.keys(ob).filter(k => !RENDERED_ONBOARDING_KEYS.has(k));
  const hours: any[] = Array.isArray(ob.working_hours) ? ob.working_hours : [];
  const rosterBlocks: Array<[string, any[]]> = [
    ['طاقم الأطباء', ob.doctors_roster], ['طاقم المختبر', ob.lab_roster],
    ['طاقم الأشعة', ob.radiology_roster], ['طاقم التمريض', ob.nursing_roster],
  ].filter(([, v]) => Array.isArray(v) && v.length > 0) as any;

  return (
    <div className="space-y-6">
      {/* ═══ 1) الحساب ═══ */}
      <Section title="بيانات الحساب" tone="slate">
        <div className="grid grid-cols-2 gap-4">
          <Field label="البريد الإلكتروني" value={acc.email} mono />
          <Field label="رقم الجوال" value={acc.phone_e164} mono />
          <Field label="نوع المزود" value={acc.provider_type || ob.type} />
          <Field label="حالة الحساب" value={acc.status || ob.status} />
          <Field label="البريد مؤكد" value={acc.email_verified} bool />
          <Field label="آخر تسجيل دخول" value={acc.last_login_at ? String(acc.last_login_at).slice(0, 19).replace('T', ' ') : null} mono />
          <Field label="تاريخ إنشاء الحساب" value={(acc.createdAt || ob.createdAt) ? String(acc.createdAt || ob.createdAt).slice(0, 19).replace('T', ' ') : null} mono />
          <Field label="تاريخ الاعتماد" value={acc.approved_at ? String(acc.approved_at).slice(0, 19).replace('T', ' ') : null} mono />
          {acc.rejection_reason && <Field label="سبب الرفض" value={acc.rejection_reason} span />}
        </div>
        {Array.isArray(acc.status_history) && acc.status_history.length > 0 && (
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">سجل حالات الحساب</label>
            <div className="space-y-1">
              {acc.status_history.map((h: any, i: number) => (
                <div key={i} className="text-xs text-gray-600 bg-slate-50 border border-gray-200 rounded px-3 py-2 flex flex-wrap gap-2">
                  <span className="font-bold">{h.from} ← {h.to}</span>
                  <span className="text-gray-400">{h.at ? String(h.at).slice(0, 19).replace('T', ' ') : ''}</span>
                  {h.note && <span>— {h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ═══ 2) الملف التجاري (provider account profile) ═══ */}
      {detail?.profile && (
        <Section title="الملف التجاري" tone="indigo">
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم المعروض (عربي)" value={prof.display_name_ar} />
            <Field label="الاسم المعروض (إنجليزي)" value={prof.display_name_en} />
            <Field label="الاسم التجاري" value={prof.business_name} />
            <Field label="الاسم القانوني" value={prof.legal_name} />
            <Field label="رقم الترخيص الطبي" value={prof.medical_license_number} mono />
            <Field label="ترخيص المنشأة" value={prof.facility_license_number} mono />
            <Field label="السجل التجاري" value={prof.commercial_registration_number} mono />
            <Field label="الرقم الضريبي" value={prof.tax_number} mono />
            <Field label="سنة التأسيس" value={prof.established_year} />
            <Field label="سنوات الخبرة" value={prof.years_of_experience} />
            <Field label="الموقع الإلكتروني" value={prof.website} mono />
            <Field label="نسبة العمولة %" value={prof.commission_rate} />
            <Field label="اكتمال الملف %" value={prof.profile_completeness} />
            <Field label="الوحدات المفعّلة" value={prof.enabled_modules} span />
            {prof.description_ar && <Field label="الوصف (عربي)" value={prof.description_ar} span />}
            {prof.description_en && <Field label="الوصف (إنجليزي)" value={prof.description_en} span />}
          </div>
          {Array.isArray(prof.phones) && prof.phones.length > 0 && (
            <div>
              <label className="text-sm font-bold text-gray-500 block mb-2">أرقام التواصل</label>
              <div className="flex flex-wrap gap-2">
                {prof.phones.map((p: any, i: number) => (
                  <span key={i} className="text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 font-mono" dir="ltr">
                    {typeof p === 'object' ? `${p.number || p.phone || JSON.stringify(p)}${p.label ? ` (${p.label})` : ''}` : String(p)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(prof.address || prof.geo) && (
            <div className="grid grid-cols-2 gap-4">
              {prof.address && <Field label="العنوان التفصيلي" value={prof.address} span />}
              {prof.geo?.lat != null && (
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-bold text-gray-500">الإحداثيات</label>
                  <a className="text-teal-700 underline text-sm font-mono" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${prof.geo.lat},${prof.geo.lng}`}>
                    {prof.geo.lat}, {prof.geo.lng}
                  </a>
                </div>
              )}
            </div>
          )}
          {(prof.profile_image_id || prof.cover_image_id) && (
            <div>
              <label className="text-sm font-bold text-gray-500 block mb-2">صور الملف</label>
              <div className="flex flex-wrap gap-2">
                {prof.profile_image_id && <StorageImage id={prof.profile_image_id} alt="صورة الملف" />}
                {prof.cover_image_id && <StorageImage id={prof.cover_image_id} alt="صورة الغلاف" className="h-20 w-40 object-cover rounded border border-gray-300" />}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ═══ 3) ملف التسجيل الكامل (onboarding) ═══ */}
      {hasOnboarding && (
        <>
          <Section title="بيانات التسجيل — الأساسية" tone="teal">
            <div className="grid grid-cols-2 gap-4">
              <Field label="الاسم (عربي)" value={ob.name_ar} />
              <Field label="الاسم (إنجليزي)" value={ob.name_en} />
              <Field label="الاسم المعروض للمستخدمين (عربي)" value={ob.display_name_ar} />
              <Field label="الاسم المعروض للمستخدمين (إنجليزي)" value={ob.display_name_en} />
              <Field label="الجنس" value={ob.gender === 'male' ? 'ذكر' : ob.gender === 'female' ? 'أنثى' : ob.gender} />
              <Field label="رقم الهوية الوطنية / الإقامة" value={ob.national_id} mono />
              <Field label="المدينة" value={ob.city} />
              <Field label="الحي" value={ob.district} />
              <Field label="العنوان" value={ob.address} span />
              <Field label="رقم الترخيص" value={ob.license_number || ob.moh_license_number || ob.scfhs_license_number || ob.sfda_license_number} mono />
              <Field label="حالة الترخيص" value={ob.license_status} />
              <Field label="السجل التجاري" value={ob.cr_number} mono />
              <Field label="الرقم الضريبي" value={ob.tax_number} mono />
              <Field label="الترخيص موثّق" value={ob.license_verified} bool />
              <Field label="اكتمل التسجيل" value={ob.onboarding_completed} bool />
              {ob.bio && <Field label="نبذة تعريفية" value={ob.bio} span />}
              {ob.location?.lat != null && (
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-bold text-gray-500">الموقع الجغرافي</label>
                  <a className="text-teal-700 underline text-sm font-mono" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${ob.location.lat},${ob.location.lng}`}>
                    {ob.location.lat}, {ob.location.lng}
                  </a>
                </div>
              )}
            </div>
          </Section>

          <Section title="البيانات المهنية والخدمات والأسعار" tone="teal">
            <div className="grid grid-cols-2 gap-4">
              <Field label="التخصص" value={ob.specialty} />
              <Field label="التخصصات الفرعية" value={ob.sub_specialties} />
              <Field label="الدرجة العلمية" value={ob.academic_degree} />
              <Field label="سنوات الخبرة" value={ob.years_experience} />
              <Field label="اللغات" value={ob.languages} />
              <Field label="تفضيل جنس المريض" value={ob.gender_pref} />
              <Field label="أنماط الاستشارة" value={ob.consultation_modes} span />
              <Field label="سعر الكشف بالعيادة" value={ob.price_clinic != null ? `${ob.price_clinic} ر.س` : null} />
              <Field label="سعر الاستشارة عن بعد" value={ob.price_online != null ? `${ob.price_online} ر.س` : null} />
              <Field label="سعر الزيارة المنزلية" value={ob.price_home != null ? `${ob.price_home} ر.س` : null} />
              <Field label="يدعم الزيارة المنزلية" value={ob.home_visit_supported ?? (Array.isArray(ob.consultation_modes) && ob.consultation_modes.includes('home'))} bool />
              <Field label="نطاق الزيارة المنزلية (كم)" value={ob.home_visit_radius_km} />
              <Field label="مدة الكشف بالعيادة (دقيقة)" value={ob.clinic_duration} />
              <Field label="مدة الاستشارة عن بعد (دقيقة)" value={ob.video_duration} />
              <Field label="رسوم مواصلات الزيارة المنزلية" value={ob.home_transport_fee} bool />
              {ob.home_transport_fee && <Field label="سعر المواصلات" value={ob.home_transport_price != null ? `${ob.home_transport_price} ر.س` : null} />}
              {ob.vacation_date && <Field label="إجازة حتى" value={ob.vacation_date} />}
              <Field label="نطاق التغطية (كم)" value={ob.coverage_radius_km} />
              <Field label="يقبل الدفع النقدي" value={ob.accepts_cash} bool />
              <Field label="نسبة العمولة %" value={ob.commission_rate} />
            </div>
          </Section>

          {hours.length > 0 && (
            <Section title="مواعيد العمل — العيادة / المنشأة" tone="teal">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-right font-bold">اليوم</th>
                      <th className="px-3 py-2 text-right font-bold">الفترة الصباحية</th>
                      <th className="px-3 py-2 text-right font-bold">الفترة المسائية</th>
                      <th className="px-3 py-2 text-right font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hours.map((h: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-bold text-gray-700">{DAY_AR[String(h.day || '').toUpperCase()] || h.day}</td>
                        <td className="px-3 py-2 font-mono text-gray-600" dir="ltr">{h.closed ? '—' : `${h.open || ''} - ${h.close || ''}`}</td>
                        <td className="px-3 py-2 font-mono text-gray-600" dir="ltr">{!h.closed && (h.open_evening || h.close_evening) ? `${h.open_evening || ''} - ${h.close_evening || ''}` : '—'}</td>
                        <td className="px-3 py-2">{h.closed ? <span className="text-red-500 text-xs font-bold">مغلق</span> : <span className="text-green-600 text-xs font-bold">مفتوح</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {[['schedule_video', 'مواعيد الاستشارات الأونلاين'], ['schedule_home', 'مواعيد الزيارات المنزلية']].map(([key, title]) => {
            const rows: any[] = Array.isArray(ob[key]) ? ob[key] : [];
            if (!rows.length) return null;
            return (
              <Section key={key} title={title as string} tone="teal">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-right font-bold">اليوم</th>
                        <th className="px-3 py-2 text-right font-bold">الفترة الصباحية</th>
                        <th className="px-3 py-2 text-right font-bold">الفترة المسائية</th>
                        <th className="px-3 py-2 text-right font-bold">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((h: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-bold text-gray-700">{DAY_AR[String(h.day || '').toUpperCase()] || h.day}</td>
                          <td className="px-3 py-2 font-mono text-gray-600" dir="ltr">{h.closed ? '—' : `${h.open || ''} - ${h.close || ''}`}</td>
                          <td className="px-3 py-2 font-mono text-gray-600" dir="ltr">{!h.closed && (h.open_evening || h.close_evening) ? `${h.open_evening || ''} - ${h.close_evening || ''}` : '—'}</td>
                          <td className="px-3 py-2">{h.closed ? <span className="text-red-500 text-xs font-bold">مغلق</span> : <span className="text-green-600 text-xs font-bold">مفتوح</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            );
          })}

          <Section title="التأمين" tone="teal">
            <div className="grid grid-cols-2 gap-4">
              <Field label="يقبل التأمين" value={ob.accepts_insurance} bool />
              <Field label="لديه مسؤول تأمين" value={ob.has_insurance_officer} bool />
              <Field label="تأمين — عيادة" value={ob.insurance_clinic} bool />
              <Field label="تأمين — عن بعد" value={ob.insurance_online} bool />
              <Field label="تأمين — منزلي" value={ob.insurance_home} bool />
            </div>
            {Array.isArray(ob.accepted_insurance) && ob.accepted_insurance.length > 0 && (
              <div>
                <label className="text-sm font-bold text-gray-500 block mb-2">شركات التأمين المقبولة</label>
                <div className="flex flex-wrap gap-2">
                  {ob.accepted_insurance.map((c: any, i: number) => (
                    <span key={i} className="text-xs bg-teal-50 text-teal-800 border border-teal-200 rounded px-2 py-1 font-bold">
                      {typeof c === 'object' ? (c.name_ar || c.name || c.id || JSON.stringify(c)) : String(c)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(ob.insurance_contracts) && ob.insurance_contracts.length > 0 && (
              <div>
                <label className="text-sm font-bold text-gray-500 block mb-2">عقود التأمين</label>
                <div className="space-y-1">
                  {ob.insurance_contracts.map((c: any, i: number) => (
                    <p key={i} className="text-xs text-gray-600 bg-slate-50 border border-gray-200 rounded px-3 py-2 break-all" dir="ltr">{genericValue(c)}</p>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* النوع-المحدد: صيدلية/معمل/أشعة/تمريض/إسعاف */}
          {(ob.enabled_categories?.length > 0 || ob.test_categories?.length > 0 || ob.pricingModel?.length > 0 ||
            ob.nursing_services?.length > 0 || ob.equipment_list?.length > 0 || rosterBlocks.length > 0 ||
            ob.rx_dispensing || ob.otc_selling || ob.has_own_delivery || ob.has_own_drivers || ob.express_delivery) && (
            <Section title="تفاصيل الخدمات الخاصة بنوع المزود" tone="teal">
              <div className="grid grid-cols-2 gap-4">
                <Field label="صرف أدوية وصفية (Rx)" value={ob.rx_dispensing} bool />
                <Field label="بيع أدوية بدون وصفة (OTC)" value={ob.otc_selling} bool />
                <Field label="توصيل خاص" value={ob.has_own_delivery} bool />
                <Field label="سائقون خاصون" value={ob.has_own_drivers} bool />
                <Field label="نمط التوصيل" value={ob.delivery_mode} />
                <Field label="أقصى نطاق توصيل (كم)" value={ob.max_delivery_radius_km} />
                <Field label="توصيل سريع" value={ob.express_delivery} bool />
                <Field label="فئات مفعّلة" value={ob.enabled_categories} span />
                <Field label="فئات التحاليل" value={ob.test_categories} span />
                <Field label="نماذج التسعير" value={ob.pricingModel} span />
                <Field label="خدمات التمريض" value={ob.nursing_services} span />
                <Field label="قائمة المعدات" value={ob.equipment_list} span />
              </div>
              {rosterBlocks.map(([title, roster]) => (
                <div key={title as string}>
                  <label className="text-sm font-bold text-gray-500 block mb-2">{title} ({(roster as any[]).length})</label>
                  <div className="space-y-1">
                    {(roster as any[]).map((m: any, i: number) => (
                      <p key={i} className="text-xs text-gray-600 bg-slate-50 border border-gray-200 rounded px-3 py-2 break-all" dir="ltr">{genericValue(m)}</p>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      {/* ═══ 4) الحساب البنكي ═══ */}
      <Section title="الحساب البنكي" tone="slate">
        <div className="grid grid-cols-2 gap-4">
          <Field label="IBAN" value={bank.iban || ob.iban} mono />
          <Field label="اسم صاحب الحساب" value={bank.holder_name || ob.bank_account_name} />
          <Field label="اسم البنك" value={bank.bank_name} />
          <Field label="كود البنك" value={bank.bank_code} mono />
          <Field label="الرقم الضريبي (VAT)" value={bank.vat_number} mono />
          {bank.review_status && (
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-500">حالة مراجعة الحساب</label>
              <div><ReviewBadge status={bank.review_status} /></div>
            </div>
          )}
        </div>
        {bank.iban_letter_storage_id && (
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">خطاب الآيبان</label>
            <StorageFileLink id={bank.iban_letter_storage_id} label="تحميل خطاب الآيبان" />
          </div>
        )}
      </Section>

      {/* ═══ 5) المستندات والصور ═══ */}
      <Section title="المستندات والصور المرفوعة" tone="slate">
        {(ob.profile_photo || ob.logo) && (
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">الصورة الشخصية / الشعار</label>
            <div className="flex flex-wrap gap-3 items-start">
              {ob.profile_photo && (
                <div className="text-center">
                  <StorageImage id={ob.profile_photo} alt="الصورة الشخصية" className="h-28 w-28 object-cover rounded-full border-2 border-teal-300" />
                  <p className="text-xs text-gray-500 mt-1">الصورة الشخصية</p>
                </div>
              )}
              {ob.logo && (
                <div className="text-center">
                  <StorageImage id={ob.logo} alt="الشعار" className="h-28 w-28 object-contain rounded border border-gray-300" />
                  <p className="text-xs text-gray-500 mt-1">الشعار</p>
                </div>
              )}
            </div>
          </div>
        )}
        {docs.length === 0 && (ob.license_documents || []).length === 0 && (ob.clinic_images || []).length === 0 && !ob.profile_photo && !ob.logo && (
          <p className="text-gray-500 text-sm">لم يرفع المزود أي مستندات بعد.</p>
        )}
        {docs.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 block">مستندات التوثيق (KYC)</label>
            {docs.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 gap-3">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{doc.doc_type}</p>
                  {doc.doc_number && <p className="text-xs text-gray-500 font-mono">{doc.doc_number}</p>}
                  {doc.issuer && <p className="text-xs text-gray-400">الجهة: {doc.issuer}</p>}
                  {doc.expiry_date && <p className="text-xs text-gray-400">ينتهي: {String(doc.expiry_date).slice(0, 10)}</p>}
                  {doc.reviewer_note && <p className="text-xs text-amber-600">ملاحظة المراجع: {doc.reviewer_note}</p>}
                </div>
                <StorageFileLink id={doc.storage_object_id} label="عرض المستند" />
                <ReviewBadge status={doc.review_status} />
              </div>
            ))}
          </div>
        )}
        {(ob.license_documents || []).length > 0 && (
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">مستندات الترخيص (ملف التسجيل)</label>
            <div className="flex flex-wrap gap-2">
              {(ob.license_documents || []).map((u: string, i: number) => (
                <StorageFileLink key={`ld-${i}`} id={u} label={`مستند ${i + 1}`} />
              ))}
            </div>
          </div>
        )}
        {(ob.clinic_images || []).length > 0 && (
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">صور المنشأة / العيادة</label>
            <div className="flex flex-wrap gap-2">
              {(ob.clinic_images || []).map((u: string, i: number) => (
                <StorageImage key={`ci-${i}`} id={u} alt={`صورة ${i + 1}`} />
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ═══ 6) العقد والتوقيع ═══ */}
      <Section title="العقد والتوقيع الإلكتروني" tone="amber">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-500">عقد الشراكة الموقّع</label>
          <button
            onClick={downloadContract}
            disabled={contractBusy || !cid}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg shadow"
          >{contractBusy ? 'جاري التحميل…' : 'تحميل العقد PDF'}</button>
        </div>
        {contractMeta && (
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-mono break-all">SHA: {contractMeta.sha256}</span>
            <label className="flex items-center gap-2 font-bold whitespace-nowrap">
              <input type="checkbox" checked={!!contractMeta.visible_to_provider} onChange={async (e) => {
                const res = await fetchWithAdminGuard(`/api/admin/provider-onboarding/admin/contracts/${cid}/visibility`, { method: 'POST', body: JSON.stringify({ visible: e.target.checked }) });
                if (res.ok) setContractMeta({ ...contractMeta, visible_to_provider: e.target.checked });
              }} />
              إتاحة العقد للمزود
            </label>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <p className="text-xs text-gray-500 mb-1">الطرف الأول: منصة نبض</p>
            <p className="font-bold text-gray-700">منصة نبض الصحية</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">الطرف الثاني: المزود</p>
            <p className="font-bold text-gray-800">{ob.signer_name || '—'}{ob.signer_role ? ` (${ob.signer_role})` : ''}</p>
            {ob.signature_url ? (
              <StorageImage id={ob.signature_url} alt="التوقيع" className="mt-2 max-h-28 border border-gray-300 rounded bg-white p-1" />
            ) : (
              <p className="text-red-500 text-sm mt-1">لا يوجد توقيع مرفق</p>
            )}
          </div>
        </div>
      </Section>

      {/* ═══ 7) باقي الحقول المسجلة (لا يُخفى أي حقل) ═══ */}
      {extraKeys.length > 0 && (
        <Section title="باقي الحقول المسجلة في ملف التسجيل" tone="slate">
          <div className="grid grid-cols-2 gap-4">
            {extraKeys.map(k => (
              <Field key={k} label={k} value={ob[k]} mono={typeof ob[k] === 'object' && ob[k] !== null} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
