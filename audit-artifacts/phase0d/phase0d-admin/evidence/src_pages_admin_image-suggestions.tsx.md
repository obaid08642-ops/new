# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/image-suggestions.tsx`
- **Member SHA-256:** `bf384dba3b0c6992820fd56788d142c79b8b7c1266aa6d573931f85a7dbebe8d`
- **Line count:** 131
- **Read range:** `1-131`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default function ImageSuggestionsPage() {`
- `16: const [page, setPage] = useState(1);`
- `23: const r = await apiFetch(`/medicines/admin/image-suggestions?status=${tab}&page=${page}&limit=20`);`
- `33: useEffect(() => { load(); }, [tab, page]);`
- `67: <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}`
- `96: {/* uploaded files arrive as a private storage object (storage_id);`
- `107: <button onClick={() => act(s.id, 'approve')} disabled={acting === s.id}`
- `111: <button onClick={() => act(s.id, 'reject')} disabled={acting === s.id}`
- `124: <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded bg-white">السابق</button>`
- `125: <span className="px-2 py-1 text-sm">{page}</span>`
- `126: <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white">التالي</button>`
### backend_consumers_or_contracts
- `23: const r = await apiFetch(`/medicines/admin/image-suggestions?status=${tab}&page=${page}&limit=20`);`
- `40: await apiFetch(`/medicines/admin/image-suggestions/${id}/${action}`, {`
### auth_ownership
- `23: const r = await apiFetch(`/medicines/admin/image-suggestions?status=${tab}&page=${page}&limit=20`);`
- `40: await apiFetch(`/medicines/admin/image-suggestions/${id}/${action}`, {`
- `97: the resolver fetches it with the admin token — no broken links */}`
- `101: <div className="text-xs text-gray-500 mb-1">المقترح: {s.suggested_by_role === 'guest' ? 'زائر (غير مسجل)' : s.suggested_by_role} · {s.note || 'بدون ملاحظة'}</div>`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `6: { key: 'pending', label: 'قيد الانتظار' },`
- `7: { key: 'approved', label: 'معتمدة' },`
- `8: { key: 'rejected', label: 'مرفوضة' },`
- `13: const [tab, setTab] = useState('pending');`
- `14: const [items, setItems] = useState<any[]>([]);`
- `15: const [total, setTotal] = useState(0);`
- `16: const [page, setPage] = useState(1);`
- `17: const [loading, setLoading] = useState(true);`
- `18: const [acting, setActing] = useState<string | null>(null);`
- `21: setLoading(true);`
- `23: const r = await apiFetch(`/medicines/admin/image-suggestions?status=${tab}&page=${page}&limit=20`);`
### payment_insurance_relevance
- `15: const [total, setTotal] = useState(0);`
- `25: setTotal(r?.total || 0);`
- `122: {total > 20 && (`
### error_empty_loading_retry_cancel
- `6: { key: 'pending', label: 'قيد الانتظار' },`
- `13: const [tab, setTab] = useState('pending');`
- `17: const [loading, setLoading] = useState(true);`
- `21: setLoading(true);`
- `26: } catch {`
- `29: setLoading(false);`
- `45: } catch (e: any) {`
- `53: const map: any = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };`
- `54: const labels: any = { pending: 'قيد الانتظار', approved: 'معتمد', rejected: 'مرفوض' };`
- `74: {loading ? (`
- `77: <div className="p-8 text-center text-gray-400 bg-white rounded-lg border">لا توجد اقتراحات {tab === 'pending' ? 'قيد الانتظار 🎉' : ''}</div>`
- `105: {s.status === 'pending' && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
