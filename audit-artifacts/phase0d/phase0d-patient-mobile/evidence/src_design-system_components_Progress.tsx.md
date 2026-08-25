# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Progress.tsx`
- **Member SHA-256:** `807d8a4f462b57cef77869a1e33d63e81c82aa53c925045e218b0e33d6bf4cf7`
- **Line count:** 276
- **Read range:** `1-276`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * indicators for upload, loading, onboarding steps, etc.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: import { BorderRadius, Spacing } from '../tokens';`
- `81: accessibilityRole="progressbar"`
### state_transitions
- `3: * indicators for upload, loading, onboarding steps, etc.`
### payment_insurance_relevance
- `26: striped?: boolean;`
- `107: totalSteps: number;`
- `115: totalSteps,`
- `127: {Array.from({ length: totalSteps }).map((_, i) => (`
- `147: {Array.from({ length: totalSteps }).map((_, i) => (`
- `167: {Array.from({ length: totalSteps }).map((_, i) => {`
### error_empty_loading_retry_cancel
- `3: * indicators for upload, loading, onboarding steps, etc.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
