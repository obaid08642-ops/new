# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/guided-tour/core/TourEngine.ts`
- **Member SHA-256:** `0b9dbc46c51ee69865f6d1b968f38438901e67dbae594e28595d3205a6942d7e`
- **Line count:** 49
- **Read range:** `1-49`
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
- `1: import { TourStatus, TourDefinition } from '../types';`
- `4: private status: TourStatus = 'idle';`
- `9: this.status = 'starting';`
- `12: this.status = 'active';`
- `30: this.status = 'skipped';`
- `35: this.status = 'celebrating';`
- `37: this.status = 'completed';`
- `47: getStatus(): TourStatus { return this.status; }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `36: setTimeout(() => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
