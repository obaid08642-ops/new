# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/audit-logs.tsx`
- **Member SHA-256:** `2244739d97bca0472269257229a840a39d02a0d0c63ef50868c8b50d1ffe1558`
- **Line count:** 106
- **Read range:** `1-106`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: export default function AuditLogsPage() {`
- `54: onClick={fetchLogs}`
### backend_consumers_or_contracts
- `27: const res = await fetch(`${API_BASE}/api/v1/admin/governance/audit-logs`, {`
### auth_ownership
- `7: adminId: string;`
- `26: const token = localStorage.getItem('admin_token');`
- `27: const res = await fetch(`${API_BASE}/api/v1/admin/governance/audit-logs`, {`
- `28: headers: { Authorization: `Bearer ${token}` }`
- `85: <td className="p-4 font-medium text-slate-900">{log.adminId || 'Super Admin'}</td>`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `3: import EmptyIcon from '../../components/EmptyIcon';`
- `15: const [logs, setLogs] = useState<AuditLogItem[]>([]);`
- `16: const [loading, setLoading] = useState(true);`
- `24: setLoading(true);`
- `35: console.error('Failed to fetch audit logs', e);`
- `37: setLoading(false);`
- `61: {loading ? (`
- `65: <EmptyIcon name="shield" size={44} color="#0D9488" className="mb-3 mx-auto" />`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: import EmptyIcon from '../../components/EmptyIcon';`
- `16: const [loading, setLoading] = useState(true);`
- `24: setLoading(true);`
- `34: } catch (e) {`
- `35: console.error('Failed to fetch audit logs', e);`
- `37: setLoading(false);`
- `61: {loading ? (`
- `65: <EmptyIcon name="shield" size={44} color="#0D9488" className="mb-3 mx-auto" />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
