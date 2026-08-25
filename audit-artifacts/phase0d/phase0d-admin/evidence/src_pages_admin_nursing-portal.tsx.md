# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/nursing-portal.tsx`
- **Member SHA-256:** `68bdd356f7b27a7e0dae8d49e45d9259a70bb0119d3c1ed1041b1cb3501686f4`
- **Line count:** 76
- **Read range:** `1-76`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export default function NursingPortalPage() {`
- `61: onClick={() => handleAssignNurse(req.id || req._id)}`
### backend_consumers_or_contracts
- `15: const res = await apiFetch('/admin/nursing/requests');`
- `29: await apiFetch(`/admin/nursing/requests/${requestId}/assign`, {`
### auth_ownership
- `15: const res = await apiFetch('/admin/nursing/requests');`
- `29: await apiFetch(`/admin/nursing/requests/${requestId}/assign`, {`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `5: const [requests, setRequests] = useState<any[]>([]);`
- `6: const [loading, setLoading] = useState(true);`
- `13: setLoading(true);`
- `18: console.error('Failed to fetch nursing requests:', err);`
- `21: setLoading(false);`
- `43: {loading ? (`
- `55: <span className={`px-3 py-1 text-xs font-bold rounded-full ${req.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>`
- `56: {req.status === 'ASSIGNED' ? 'تم التعيين' : 'في الانتظار'}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: const [loading, setLoading] = useState(true);`
- `13: setLoading(true);`
- `17: } catch (err) {`
- `18: console.error('Failed to fetch nursing requests:', err);`
- `21: setLoading(false);`
- `35: } catch (err) {`
- `43: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
