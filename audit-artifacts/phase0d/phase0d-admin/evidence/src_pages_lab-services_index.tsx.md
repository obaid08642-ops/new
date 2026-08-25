# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/lab-services/index.tsx`
- **Member SHA-256:** `02cf719a0fcabdd74d814dad7a1c389e7139552f00644af2b2449b147be87d8c`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export default function LabServicesPage({ items }: { items: any[] }) {`
### backend_consumers_or_contracts
- `20: const items = await fetchDirectory('/labs/services');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `12: itemBadge: (e) => (e.price ? `${e.price} ر.س` : null),`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
