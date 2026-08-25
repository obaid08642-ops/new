# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/utils/api.ts`
- **Member SHA-256:** `fb9f1432a4cc8a843338bfee2b684773001a0b67e2601fb308018f56b38373d4`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: // In production: window.location.href = '/login';`
### backend_consumers_or_contracts
- `10: const response = await fetch(url, {`
- `27: const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;`
### auth_ownership
- `1: export const fetchWithAdminGuard = async (url: string, options: RequestInit = {}) => {`
- `2: const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;`
- `6: ...(token && { Authorization: `Bearer ${token}` }),`
- `17: console.error('Admin Guard strictly rejected access. You lack @Roles(UserRole.ADMIN) permission.');`
- `18: // In production: window.location.href = '/login';`
- `28: const response = await fetchWithAdminGuard(url, options);`
### state_transitions
- `15: if (response.status === 401 || response.status === 403) {`
- `17: console.error('Admin Guard strictly rejected access. You lack @Roles(UserRole.ADMIN) permission.');`
- `19: throw new Error('Access denied by backend guard.');`
- `30: throw new Error(`HTTP ${response.status}: ${response.statusText}`);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: console.error('Admin Guard strictly rejected access. You lack @Roles(UserRole.ADMIN) permission.');`
- `19: throw new Error('Access denied by backend guard.');`
- `30: throw new Error(`HTTP ${response.status}: ${response.statusText}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
