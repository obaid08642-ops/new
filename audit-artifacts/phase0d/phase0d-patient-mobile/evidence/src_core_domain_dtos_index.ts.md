# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/domain/dtos/index.ts`
- **Member SHA-256:** `612db9a0d982a13a3ec31e4fdff2da763a786ac604f9a1bc2d24b1a6e18d8982`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: success: boolean;`
- `11: errorCode?: string;`
- `17: errors?: Record<string, string[]>;`
### payment_insurance_relevance
- `2: payload: T;`
### error_empty_loading_retry_cancel
- `11: errorCode?: string;`
- `17: errors?: Record<string, string[]>;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
