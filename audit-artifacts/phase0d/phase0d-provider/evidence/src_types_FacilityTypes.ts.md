# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/types/FacilityTypes.ts`
- **Member SHA-256:** `d013ef6236265c7da5ea1e66910c2b227c4cc6e9ea77f9d1b8a100318c3ad0ba`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `35: permissions: FacilityPermissions;`
- `39: export interface FacilityPermissions {`
### state_transitions
- `7: status: 'active' | 'inactive';`
- `16: status: 'active' | 'inactive';`
- `26: status: 'active' | 'maintenance' | 'inactive';`
- `34: status: 'pending' | 'accepted' | 'rejected' | 'revoked';`
### payment_insurance_relevance
- `42: insurance: boolean;`
- `49: manage_wallet: boolean;`
- `68: supported_insurance: string[];`
### error_empty_loading_retry_cancel
- `34: status: 'pending' | 'accepted' | 'rejected' | 'revoked';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
