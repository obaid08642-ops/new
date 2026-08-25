# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/shortage-reports.tsx`
- **Member SHA-256:** `b4d83c9685a2a70054c8bf4f8f31f820a41d4ceb14bef1c27b780deba257cbf1`
- **Line count:** 160
- **Read range:** `1-160`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: export default function ShortageReportsPage() {`
- `16: const [page, setPage] = useState(1);`
- `23: const r = await apiFetch(`/medicines/admin/shortage-reports?status=${tab}&page=${page}&limit=20`);`
- `34: useEffect(() => { load(); }, [tab, page]);`
- `76: onClick={() => { setTab(t.key); setPage(1); }}`
- `120: onClick={() => act(r.id, 'approve')}`
- `127: onClick={() => act(r.id, 'reject')}`
- `137: onClick={() => clearBadge(r.medicine_id)}`
- `152: <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded">السابق</button>`
- `153: <span className="px-2 py-1 text-sm">{page}</span>`
- `154: <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">التالي</button>`
### backend_consumers_or_contracts
- `23: const r = await apiFetch(`/medicines/admin/shortage-reports?status=${tab}&page=${page}&limit=20`);`
- `40: await apiFetch(`/medicines/admin/shortage-reports/${reportId}/${action}`, {`
- `54: await apiFetch(`/medicines/admin/catalog/${medicineId}/clear-shortage-badge`, { method: 'POST' }).catch(() => alert('فشل'));`
### auth_ownership
- `23: const r = await apiFetch(`/medicines/admin/shortage-reports?status=${tab}&page=${page}&limit=20`);`
- `40: await apiFetch(`/medicines/admin/shortage-reports/${reportId}/${action}`, {`
- `54: await apiFetch(`/medicines/admin/catalog/${medicineId}/clear-shortage-badge`, { method: 'POST' }).catch(() => alert('فشل'));`
- `109: <div>{r.reporter_role || 'pharmacy'}</div>`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `5: { key: 'pending', label: 'قيد الانتظار' },`
- `6: { key: 'approved', label: 'معتمدة' },`
- `7: { key: 'rejected', label: 'مرفوضة' },`
- `12: const [tab, setTab] = useState('pending');`
- `13: const [reports, setReports] = useState<any[]>([]);`
- `14: const [counts, setCounts] = useState<any>({});`
- `15: const [total, setTotal] = useState(0);`
- `16: const [page, setPage] = useState(1);`
- `17: const [loading, setLoading] = useState(true);`
- `18: const [acting, setActing] = useState<string | null>(null);`
- `21: setLoading(true);`
### payment_insurance_relevance
- `15: const [total, setTotal] = useState(0);`
- `25: setTotal(r?.total || 0);`
- `150: {total > 20 && (`
### error_empty_loading_retry_cancel
- `5: { key: 'pending', label: 'قيد الانتظار' },`
- `12: const [tab, setTab] = useState('pending');`
- `17: const [loading, setLoading] = useState(true);`
- `21: setLoading(true);`
- `27: } catch {`
- `30: setLoading(false);`
- `45: } catch (e: any) {`
- `54: await apiFetch(`/medicines/admin/catalog/${medicineId}/clear-shortage-badge`, { method: 'POST' }).catch(() => alert('فشل'));`
- `59: const map: any = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', superseded: 'bg-gray-100 text-gray-600' };`
- `60: const labels: any = { pending: 'قيد الانتظار', approved: 'معتمد', rejected: 'مرفوض', superseded: 'تم تجاوزه' };`
- `85: {loading ? (`
- `88: <div className="p-8 text-center text-gray-400">لا توجد بلاغات {tab === 'pending' ? 'قيد الانتظار 🎉' : ''}</div>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
