# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/fraud-monitoring.tsx`
- **Member SHA-256:** `dd893f8f910cae17f8f9e877e4b4f8057675d8fbfd03ce152a5a88ebeccf1c70`
- **Line count:** 144
- **Read range:** `1-144`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `69: IMMUTABLE: No Write Routes`
### backend_consumers_or_contracts
- `35: const alertsRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/fraud-alerts`);`
- `42: const logsRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/audit-logs`);`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `17: actorRole: string;`
- `35: const alertsRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/fraud-alerts`);`
- `42: const logsRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/audit-logs`);`
- `112: <th className="px-6 py-3 font-medium">Role</th>`
- `123: <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider ${log.actorRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>`
- `124: {log.actorRole}`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `25: const [alerts, setAlerts] = useState<FraudAlert[]>([]);`
- `26: const [logs, setLogs] = useState<AuditLog[]>([]);`
- `27: const [isLoading, setIsLoading] = useState(true);`
- `32: setIsLoading(true);`
- `47: } catch (error) {`
- `48: console.error('Governance fetch error:', error);`
- `50: setIsLoading(false);`
### payment_insurance_relevance
- `20: payloadHash: string;`
- `114: <th className="px-6 py-3 font-medium">Payload Hash</th>`
- `132: {log.payloadHash}`
### error_empty_loading_retry_cancel
- `27: const [isLoading, setIsLoading] = useState(true);`
- `32: setIsLoading(true);`
- `47: } catch (error) {`
- `48: console.error('Governance fetch error:', error);`
- `50: setIsLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
