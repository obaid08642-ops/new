# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/medicines-catalog.tsx`
- **Member SHA-256:** `442e55a22862bbf77777874d2ddd1c8fc7040502d15ad3be25f8f17b5a80e7ad`
- **Line count:** 512
- **Read range:** `1-512`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `36: /** Upload a medicine image to Cloudflare R2 (default storage target) and return its public URL. */`
- `37: async function uploadMedicineImage(file: File): Promise<string> {`
- `44: const up = await apiFetch('/storage/upload', {`
- `55: export default function MedicinesCatalogPage() {`
- `61: const [page, setPage] = useState(1);`
- `90: const params = new URLSearchParams({ page: String(page), limit: '25' });`
- `102: }, [page, q, category, includeDeleted]);`
- `107: const res = await apiFetch(`/medicines/admin/change-requests?status=${reqStatus}&page=1&limit=50`);`
- `220: const pages = Math.max(1, Math.ceil(total / 25));`
- `233: <button key={t} onClick={() => setTab(t)}`
- `246: <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="بحث بالاسم / المادة الفعالة / الباركود / الشركة..." className="border rounded px-4 py-2 w-80" />`
- `247: <input value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} placeholder="الفئة (اختياري)" className="border rounded px-3 py-2 w-48" />`
### backend_consumers_or_contracts
- `44: const up = await apiFetch('/storage/upload', {`
- `48: const signed = await apiFetch(`/storage/${up.id}/signed-url`);`
- `94: const res = await apiFetch(`/medicines/admin/catalog?${params.toString()}`);`
- `107: const res = await apiFetch(`/medicines/admin/change-requests?status=${reqStatus}&page=1&limit=50`);`
- `114: try { setReports(await apiFetch('/medicines/admin/reports')); }`
- `152: await apiFetch('/medicines/admin/catalog', { method: 'POST', body: JSON.stringify(payload) });`
- `154: await apiFetch(`/medicines/admin/catalog/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });`
- `167: await apiFetch(`/medicines/admin/catalog/${m.id}/delete`, { method: 'POST', body: JSON.stringify({ restore }) });`
- `176: await apiFetch(`/medicines/admin/catalog/${m.id}/availability`, {`
- `201: await apiFetch(`/medicines/admin/change-requests/${id}/${action}`, {`
### auth_ownership
- `15: * Backend: /medicines/admin/catalog[...], /medicines/admin/change-requests[...],`
- `16: *          /medicines/admin/reports`
- `79: // Partial approval: per-request field selection + admin value overrides`
- `94: const res = await apiFetch(`/medicines/admin/catalog?${params.toString()}`);`
- `107: const res = await apiFetch(`/medicines/admin/change-requests?status=${reqStatus}&page=1&limit=50`);`
- `114: try { setReports(await apiFetch('/medicines/admin/reports')); }`
- `152: await apiFetch('/medicines/admin/catalog', { method: 'POST', body: JSON.stringify(payload) });`
- `154: await apiFetch(`/medicines/admin/catalog/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });`
- `167: await apiFetch(`/medicines/admin/catalog/${m.id}/delete`, { method: 'POST', body: JSON.stringify({ restore }) });`
- `173: const flagged = m.availability_status === 'admin_flagged_shortage' || m.availability_status === 'availability_may_be_limited';`
- `176: await apiFetch(`/medicines/admin/catalog/${m.id}/availability`, {`
- `178: body: JSON.stringify({ status: flagged ? 'none' : 'admin_flagged_shortage' }),`
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `19: const EMPTY_FORM: any = {`
- `41: r.onerror = reject;`
- `56: const [tab, setTab] = useState<'catalog' | 'requests' | 'reports'>('catalog');`
- `58: // catalog state`
- `59: const [items, setItems] = useState<any[]>([]);`
- `60: const [total, setTotal] = useState(0);`
- `61: const [page, setPage] = useState(1);`
- `62: const [q, setQ] = useState('');`
- `63: const [category, setCategory] = useState('');`
- `64: const [includeDeleted, setIncludeDeleted] = useState(false);`
- `65: const [loading, setLoading] = useState(true);`
### payment_insurance_relevance
- `9: *    side effects, price, category/sub-category) / soft-delete / restore`
- `12: *    approve → applied to DB, reject → discarded`
- `23: price: '', requires_prescription: false,`
- `60: const [total, setTotal] = useState(0);`
- `96: setTotal(res?.total || 0);`
- `134: price: m.price ?? '',`
- `142: const payload: any = { ...form };`
- `144: payload[f] = toArr(form[f]);`
- `146: payload.images = imageUrls;`
- `147: payload.image = imageUrls[0] || '';`
- `148: payload.price = parseFloat(form.price) || 0;`
- `152: await apiFetch('/medicines/admin/catalog', { method: 'POST', body: JSON.stringify(payload) });`
### error_empty_loading_retry_cancel
- `19: const EMPTY_FORM: any = {`
- `41: r.onerror = reject;`
- `65: const [loading, setLoading] = useState(true);`
- `66: const [error, setError] = useState('');`
- `71: const [form, setForm] = useState<any>(EMPTY_FORM);`
- `78: const [reqStatus, setReqStatus] = useState('pending');`
- `87: setLoading(true);`
- `88: setError('');`
- `97: } catch (e: any) {`
- `98: setError(e?.message || 'تعذر تحميل الكتالوج');`
- `100: setLoading(false);`
- `105: setLoading(true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
