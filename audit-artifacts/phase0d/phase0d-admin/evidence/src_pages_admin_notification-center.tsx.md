# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/notification-center.tsx`
- **Member SHA-256:** `71a4deb864ea99684ed4551066b6a2132eaefc8f6721ddbd91720a3dca6f163c`
- **Line count:** 242
- **Read range:** `1-242`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: export default function NotificationCenterPage() {`
- `19: const [page, setPage] = useState(1);`
- `38: apiFetch(`/admin/notification-center/campaigns?page=${page}&limit=15`).catch(() => ({ data: [] })),`
- `49: useEffect(() => { load(); }, [page]);`
- `60: ...(deepLink.trim() ? { deep_link: { route: deepLink.trim() } } : {}),`
- `85: const cancel = async (id: string) => {`
- `100: cancelled: 'bg-gray-100 text-gray-600', draft: 'bg-purple-100 text-purple-800',`
- `102: const labels: any = { sent: 'مُرسلة', scheduled: 'مجدولة', sending: 'جارٍ الإرسال', failed: 'فشلت', cancelled: 'ملغاة', draft: 'مسودة' };`
- `175: <button onClick={send} disabled={sending} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">`
- `178: <button onClick={runRetarget} className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600">`
- `189: <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded">السابق</button>`
- `190: <span className="px-2 py-1 text-sm">{page}</span>`
### backend_consumers_or_contracts
- `36: apiFetch('/admin/notification-center/stats/overview').catch(() => null),`
- `37: apiFetch('/admin/notification-center/segments').catch(() => null),`
- `38: apiFetch(`/admin/notification-center/campaigns?page=${page}&limit=15`).catch(() => ({ data: [] })),`
- `64: await apiFetch('/admin/notification-center/campaigns', { method: 'POST', body: JSON.stringify(payload) });`
- `67: await apiFetch('/admin/notification-center/broadcasts', { method: 'POST', body: JSON.stringify(payload) });`
- `81: await apiFetch(`/admin/notification-center/campaigns/${id}/send`, { method: 'POST' }).catch(() => alert('فشل'));`
- `87: await apiFetch(`/admin/notification-center/campaigns/${id}`, { method: 'DELETE' }).catch(() => alert('فشل'));`
- `92: await apiFetch('/admin/notification-center/retarget/run', { method: 'POST' }).catch(() => null);`
- `161: <input value={deepLink} onChange={e => setDeepLink(e.target.value)} className="w-full border rounded p-2" placeholder="/pharmacy/cart" dir="ltr" />`
### auth_ownership
- `8: { value: 'role:pharmacy', label: 'الصيدليات' },`
- `9: { value: 'role:doctor', label: 'الأطباء' },`
- `10: { value: 'role:driver', label: 'السائقون' },`
- `11: { value: 'role:admin', label: 'الإداريون' },`
- `36: apiFetch('/admin/notification-center/stats/overview').catch(() => null),`
- `37: apiFetch('/admin/notification-center/segments').catch(() => null),`
- `38: apiFetch(`/admin/notification-center/campaigns?page=${page}&limit=15`).catch(() => ({ data: [] })),`
- `64: await apiFetch('/admin/notification-center/campaigns', { method: 'POST', body: JSON.stringify(payload) });`
- `67: await apiFetch('/admin/notification-center/broadcasts', { method: 'POST', body: JSON.stringify(payload) });`
- `81: await apiFetch(`/admin/notification-center/campaigns/${id}/send`, { method: 'POST' }).catch(() => alert('فشل'));`
- `87: await apiFetch(`/admin/notification-center/campaigns/${id}`, { method: 'DELETE' }).catch(() => alert('فشل'));`
- `92: await apiFetch('/admin/notification-center/retarget/run', { method: 'POST' }).catch(() => null);`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `15: const [stats, setStats] = useState<any>(null);`
- `16: const [segmentCounts, setSegmentCounts] = useState<any>(null);`
- `17: const [campaigns, setCampaigns] = useState<any[]>([]);`
- `18: const [total, setTotal] = useState(0);`
- `19: const [page, setPage] = useState(1);`
- `20: const [loading, setLoading] = useState(true);`
- `21: const [sending, setSending] = useState(false);`
- `24: const [title, setTitle] = useState('');`
- `25: const [body, setBody] = useState('');`
- `26: const [segment, setSegment] = useState('all');`
- `27: const [singleUser, setSingleUser] = useState('');`
### payment_insurance_relevance
- `18: const [total, setTotal] = useState(0);`
- `43: setTotal(c?.total || 0);`
- `58: const payload: any = {`
- `63: payload.scheduled_at = new Date(scheduledAt).toISOString();`
- `64: await apiFetch('/admin/notification-center/campaigns', { method: 'POST', body: JSON.stringify(payload) });`
- `67: await apiFetch('/admin/notification-center/broadcasts', { method: 'POST', body: JSON.stringify(payload) });`
- `187: <h2 className="text-lg font-bold">الحملات ({total})</h2>`
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(true);`
- `33: setLoading(true);`
- `36: apiFetch('/admin/notification-center/stats/overview').catch(() => null),`
- `37: apiFetch('/admin/notification-center/segments').catch(() => null),`
- `38: apiFetch(`/admin/notification-center/campaigns?page=${page}&limit=15`).catch(() => ({ data: [] })),`
- `45: setLoading(false);`
- `72: } catch (e: any) {`
- `81: await apiFetch(`/admin/notification-center/campaigns/${id}/send`, { method: 'POST' }).catch(() => alert('فشل'));`
- `85: const cancel = async (id: string) => {`
- `87: await apiFetch(`/admin/notification-center/campaigns/${id}`, { method: 'DELETE' }).catch(() => alert('فشل'));`
- `92: await apiFetch('/admin/notification-center/retarget/run', { method: 'POST' }).catch(() => null);`
- `99: sending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
