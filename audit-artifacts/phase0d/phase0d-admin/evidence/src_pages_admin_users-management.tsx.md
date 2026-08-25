# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/users-management.tsx`
- **Member SHA-256:** `aaf12290cc7a8235122f50853963ea2c17908ef73c4eee3e2986cb4427b7d89c`
- **Line count:** 474
- **Read range:** `1-474`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `33: export default function UsersManagementPage() {`
- `63: // the moderation screen reviews: every entered field + contract).`
- `275: onClick={() => openUserFile(u)}`
- `282: onClick={() => handleReactivate(u)}`
- `290: onClick={() => handleSuspend(u)}`
- `298: onClick={() => handleDelete(u)}`
- `323: <div className="min-h-screen w-full">`
- `330: <button onClick={() => setViewUser(null)} className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-2 rounded-lg">← عودة لإدارة المستخدمين</button>`
- `331: <button onClick={() => setViewUser(null)} className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg">✕ خروج</button>`
- `344: <button key={p.d} onClick={() => reloadActivity(p.d)}`
- `358: <div className="space-y-1"><label className="text-sm font-bold text-gray-500">الأجهزة المسجلة</label><p className="text-gray-800">{userOverview.devices?.registered_count ?? 0}</p></div>`
- `359: <div className="space-y-1"><label className="text-sm font-bold text-gray-500">آخر دخول</label><p className="text-gray-800 font-mono text-sm">{userOverview.user.last_login_at ? String(userOverview.user.last_login_at).slice(0, 19).replace('T'`
### backend_consumers_or_contracts
- `58: const ov = await apiFetch(`/admin/users/${id}/overview?days=${days}`).catch(() => null);`
- `64: const pf = await apiFetch(`/admin/providers/by-user/${id}`).catch(() => null);`
- `75: const ov = await apiFetch(`/admin/users/${viewUser.id || viewUser._id}/overview?days=${days}`).catch(() => null);`
- `86: const res = await apiFetch(`/admin/users?${params.toString()}`);`
- `109: await apiFetch(`/admin/users/${id}/ban`, { method: 'POST' });`
- `123: await apiFetch(`/admin/users/${id}/unban`, { method: 'POST' });`
- `148: await apiFetch(`/admin/providers/${accountId}/${action}`, { method: 'POST', body: JSON.stringify(body) });`
- `166: await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });`
- `398: {/* Recent orders/appointments */}`
### auth_ownership
- `5: const ROLE_LABELS: Record<string, string> = {`
- `17: admin: 'أدمن',`
- `18: super_admin: 'أدمن رئيسي',`
- `21: const ROLE_FILTERS = [`
- `38: const [roleFilter, setRoleFilter] = useState('');`
- `58: const ov = await apiFetch(`/admin/users/${id}/overview?days=${days}`).catch(() => null);`
- `60: const role = String(u.role || '').toLowerCase();`
- `61: if (role && role !== 'patient' && role !== 'guest' && role !== 'admin' && role !== 'super_admin') {`
- `64: const pf = await apiFetch(`/admin/providers/by-user/${id}`).catch(() => null);`
- `75: const ov = await apiFetch(`/admin/users/${viewUser.id || viewUser._id}/overview?days=${days}`).catch(() => null);`
- `84: if (roleFilter) params.set('role', roleFilter);`
- `86: const res = await apiFetch(`/admin/users?${params.toString()}`);`
### state_transitions
- `1: import { useState, useEffect, useMemo } from 'react';`
- `34: const [users, setUsers] = useState<any[]>([]);`
- `35: const [total, setTotal] = useState(0);`
- `36: const [loading, setLoading] = useState(true);`
- `37: const [searchTerm, setSearchTerm] = useState('');`
- `38: const [roleFilter, setRoleFilter] = useState('');`
- `39: const [statusFilter, setStatusFilter] = useState('');`
- `40: const [actionBusy, setActionBusy] = useState<string | null>(null);`
- `41: const [errorMsg, setErrorMsg] = useState('');`
- `44: const [viewUser, setViewUser] = useState<any | null>(null);`
- `45: const [viewLoading, setViewLoading] = useState(false);`
- `46: const [userOverview, setUserOverview] = useState<any | null>(null);`
### payment_insurance_relevance
- `35: const [total, setTotal] = useState(0);`
- `88: setTotal(res?.total ?? (Array.isArray(res) ? res.length : res?.data?.length ?? 0));`
- `199: <h1 className="text-2xl font-bold">إدارة المستخدمين ({total})</h1>`
- `367: <p className="text-2xl font-black text-slate-800">{userOverview.activity?.appointments_total ?? 0}</p>`
- `371: <p className="text-2xl font-black text-slate-800">{userOverview.activity?.sos_total ?? 0}</p>`
- `376: <p className="text-2xl font-black text-slate-800">{userOverview.activity?.provider_requests_total ?? 0}</p>`
- `410: <td className="px-2 py-1.5" dir="ltr">{a.price ?? a.fee ?? '—'}</td>`
- `427: <span className="font-mono" dir="ltr">{r.amount_total ? `${r.amount_total} ${r.currency || 'SAR'}` : ''} {String(r.createdAt || '').slice(0, 10)}</span>`
### error_empty_loading_retry_cancel
- `36: const [loading, setLoading] = useState(true);`
- `41: const [errorMsg, setErrorMsg] = useState('');`
- `45: const [viewLoading, setViewLoading] = useState(false);`
- `54: setViewLoading(true);`
- `58: const ov = await apiFetch(`/admin/users/${id}/overview?days=${days}`).catch(() => null);`
- `64: const pf = await apiFetch(`/admin/providers/by-user/${id}`).catch(() => null);`
- `68: setViewLoading(false);`
- `75: const ov = await apiFetch(`/admin/users/${viewUser.id || viewUser._id}/overview?days=${days}`).catch(() => null);`
- `80: setLoading(true);`
- `81: setErrorMsg('');`
- `89: } catch (err: any) {`
- `90: setErrorMsg(err?.message || 'فشل تحميل المستخدمين');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
