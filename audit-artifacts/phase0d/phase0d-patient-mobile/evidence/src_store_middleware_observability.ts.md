# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/middleware/observability.ts`
- **Member SHA-256:** `42781719c18d7bec2450f40dca0e0b7e709df40649ff1e04befa91feb8bba08e`
- **Line count:** 48
- **Read range:** `1-48`
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
- `7: * Provides an abstract, provider-independent way to monitor state health,`
- `28: // Track specific critical errors`
- `29: if (action.type.endsWith('/rejected')) {`
- `30: analytics.track('store_action_rejected', {`
- `32: error_message: action.error?.message,`
### payment_insurance_relevance
- `24: payload_size: JSON.stringify(action.payload || {}).length`
### error_empty_loading_retry_cancel
- `28: // Track specific critical errors`
- `32: error_message: action.error?.message,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
