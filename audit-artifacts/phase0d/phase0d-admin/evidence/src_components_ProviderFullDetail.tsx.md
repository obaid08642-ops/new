# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/components/ProviderFullDetail.tsx`
- **Member SHA-256:** `034e056d7d1b2208c02ee711c2cb850a03d8f8da0837b571f46749525427c153`
- **Line count:** 591
- **Read range:** `1-591`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `50: <a href={src} target="_blank" rel="noreferrer">`
- `67: return <a href={href} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 underline">{label}</a>;`
- `155: const downloadContract = async () => {`
- `165: a.href = url; a.download = `contract-${cid}.pdf`; a.click();`
- `193: <Field label="آخر تسجيل دخول" value={acc.last_login_at ? String(acc.last_login_at).slice(0, 19).replace('T', ' ') : null} mono />`
- `253: <a className="text-teal-700 underline text-sm font-mono" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${prof.geo.lat},${prof.geo.lng}`}>`
- `296: <a className="text-teal-700 underline text-sm font-mono" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${ob.location.lat},${ob.location.lng}`}>`
- `545: onClick={downloadContract}`
### backend_consumers_or_contracts
- `20: const sres = await fetchWithAdminGuard(`${API_BASE}/api/v1/storage/${idOrUrl}/signed-url`);`
- `25: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/storage/${idOrUrl}`);`
- `159: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/provider-onboarding/admin/contracts/${cid}`);`
- `555: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/provider-onboarding/admin/contracts/${cid}/visibility`, { method: 'POST', body: JSON.stringify({ visible: e.target.checked }) });`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `20: const sres = await fetchWithAdminGuard(`${API_BASE}/api/v1/storage/${idOrUrl}/signed-url`);`
- `25: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/storage/${idOrUrl}`);`
- `120: 'signature_url', 'signer_name', 'signer_role', 'license_documents', 'clinic_images',`
- `159: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/provider-onboarding/admin/contracts/${cid}`);`
- `193: <Field label="آخر تسجيل دخول" value={acc.last_login_at ? String(acc.last_login_at).slice(0, 19).replace('T', ' ') : null} mono />`
- `555: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/provider-onboarding/admin/contracts/${cid}/visibility`, { method: 'POST', body: JSON.stringify({ visible: e.target.checked }) });`
- `569: <p className="font-bold text-gray-800">{ob.signer_name || '—'}{ob.signer_role ? ` (${ob.signer_role})` : ''}</p>`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `38: const [src, setSrc] = useState<string | null>(null);`
- `39: const [failed, setFailed] = useState(false);`
- `42: setSrc(null); setFailed(false);`
- `43: resolveStorageUrl(id).then(u => { if (alive) { if (u) setSrc(u); else setFailed(true); } });`
- `47: if (failed) return <span className="text-xs text-red-400">تعذر تحميل الملف</span>;`
- `57: const [href, setHref] = useState<string | null>(null);`
- `58: const [failed, setFailed] = useState(false);`
- `61: resolveStorageUrl(id).then(u => { if (alive) { if (u) setHref(u); else setFailed(true); } });`
- `65: if (failed) return <span className="text-xs bg-red-50 text-red-500 border border-red-200 rounded px-2 py-1">{label} (تعذر التحميل)</span>;`
- `96: approved: { label: 'معتمد', cls: 'bg-green-100 text-green-700' },`
- `97: rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700' },`
### payment_insurance_relevance
- `113: 'cr_number', 'tax_number', 'iban', 'bank_account_name',`
- `116: 'consultation_modes', 'price_clinic', 'price_online', 'price_home',`
- `117: 'home_visit_supported', 'coverage_radius_km', 'accepts_cash',`
- `118: 'accepts_insurance', 'accepted_insurance', 'insurance_clinic', 'insurance_online', 'insurance_home',`
- `119: 'has_insurance_officer', 'insurance_contracts', 'working_hours',`
- `129: 'clinic_duration', 'video_duration', 'home_transport_fee', 'home_transport_price',`
- `225: <Field label="الرقم الضريبي" value={prof.tax_number} mono />`
- `289: <Field label="الرقم الضريبي" value={ob.tax_number} mono />`
- `313: <Field label="سعر الكشف بالعيادة" value={ob.price_clinic != null ? `${ob.price_clinic} ر.س` : null} />`
- `314: <Field label="سعر الاستشارة عن بعد" value={ob.price_online != null ? `${ob.price_online} ر.س` : null} />`
- `315: <Field label="سعر الزيارة المنزلية" value={ob.price_home != null ? `${ob.price_home} ر.س` : null} />`
- `321: {ob.home_transport_fee && <Field label="سعر المواصلات" value={ob.home_transport_price != null ? `${ob.home_transport_price} ر.س` : null} />}`
### error_empty_loading_retry_cancel
- `31: } catch {`
- `39: const [failed, setFailed] = useState(false);`
- `42: setSrc(null); setFailed(false);`
- `43: resolveStorageUrl(id).then(u => { if (alive) { if (u) setSrc(u); else setFailed(true); } });`
- `47: if (failed) return <span className="text-xs text-red-400">تعذر تحميل الملف</span>;`
- `58: const [failed, setFailed] = useState(false);`
- `61: resolveStorageUrl(id).then(u => { if (alive) { if (u) setHref(u); else setFailed(true); } });`
- `65: if (failed) return <span className="text-xs bg-red-50 text-red-500 border border-red-200 rounded px-2 py-1">{label} (تعذر التحميل)</span>;`
- `100: pending: { label: 'قيد المراجعة', cls: 'bg-blue-100 text-blue-700' },`
- `104: const r = REVIEW_LABELS[String(status || 'pending')] || REVIEW_LABELS.pending;`
- `109: *  dumped automatically in the catch-all section so NO entered field is hidden. */`
- `160: if (!res.ok) throw new Error('no_contract');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
