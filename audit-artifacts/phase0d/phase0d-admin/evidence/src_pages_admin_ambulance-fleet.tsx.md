# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/ambulance-fleet.tsx`
- **Member SHA-256:** `c307f2eb7e373b5fe9c6c7681bf2b778c7e0bd74d2842f3ad23a130fbd9b75d8`
- **Line count:** 173
- **Read range:** `1-173`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `98: <button key={t} onClick={() => setTab(t)}`
- `109: <button onClick={load} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">إعادة المحاولة</button>`
- `136: <a key={i} href={d} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">مستند {i + 1}</a>`
- `146: <button onClick={() => approve(v)} disabled={busyId === v.id}`
- `150: <button onClick={() => { setRejectingId(rejectingId === v.id ? null : v.id); setRejectReason(''); }}`
- `162: <button onClick={() => reject(v)} disabled={busyId === v.id}`
### backend_consumers_or_contracts
- `41: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet?status=${tab}`);`
- `58: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet/${v.id}/approve`, { method: 'POST' });`
- `73: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet/${v.id}/reject`, {`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `16: admin_notes?: string;`
- `41: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet?status=${tab}`);`
- `58: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet/${v.id}/approve`, { method: 'POST' });`
- `73: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/ambulance/fleet/${v.id}/reject`, {`
- `140: {v.status === 'rejected' && v.admin_notes && (`
- `141: <p className="text-xs text-rose-600 mt-2">سبب الرفض: {v.admin_notes}</p>`
### state_transitions
- `1: import React, { useState, useEffect, useCallback } from 'react';`
- `15: status: 'pending' | 'approved' | 'rejected' | 'suspended';`
- `21: const STATUS_LABELS: Record<string, { ar: string; cls: string }> = {`
- `22: pending: { ar: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-800' },`
- `23: approved: { ar: 'معتمدة', cls: 'bg-emerald-100 text-emerald-800' },`
- `24: rejected: { ar: 'مرفوضة', cls: 'bg-rose-100 text-rose-800' },`
- `30: const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');`
- `31: const [vehicles, setVehicles] = useState<Vehicle[]>([]);`
- `32: const [loading, setLoading] = useState(true);`
- `33: const [error, setError] = useState('');`
- `34: const [rejectingId, setRejectingId] = useState<string | null>(null);`
- `35: const [rejectReason, setRejectReason] = useState('');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `15: status: 'pending' | 'approved' | 'rejected' | 'suspended';`
- `22: pending: { ar: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-800' },`
- `30: const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');`
- `32: const [loading, setLoading] = useState(true);`
- `33: const [error, setError] = useState('');`
- `39: setLoading(true); setError('');`
- `42: if (!res.ok) throw new Error();`
- `45: } catch {`
- `46: setError('تعذر تحميل الأسطول — تحقق من الاتصال');`
- `49: setLoading(false);`
- `59: if (!res.ok) throw new Error();`
- `62: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
