# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/input-group.tsx`
- **Member SHA-256:** `f62f2be2ad4c2c7711e7b25b0d6c03572f7871cb4022e9f4f6860dcd77dd9e57`
- **Line count:** 168
- **Read range:** `1-168`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `69: onClick={e => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: role="group"`
- `65: role="group"`
### state_transitions
- `24: // Focus state.`
- `27: // Error state.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `27: // Error state.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
