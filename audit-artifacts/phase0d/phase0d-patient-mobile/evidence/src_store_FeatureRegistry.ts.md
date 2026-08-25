# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/FeatureRegistry.ts`
- **Member SHA-256:** `e7a3787d107f2952d376806402afd368220bf5128f8cbf966f9474cc9f830628`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: // Inject any reducers that were registered before the store was created`
- `33: * Register a new business module (e.g., Pharmacy, Consultations)`
- `35: public register(feature: FeatureModule) {`
- `37: console.warn(`[FeatureRegistry] Feature ${feature.name} is already registered.`);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: permissions?: string[];`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
