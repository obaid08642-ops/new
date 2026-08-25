# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_AUTH_CONTRACT_DRIFT_20260818.md`
- **Member SHA-256:** `333c27b1bc7179613e27e0cb224a88282179211cbaf4b944eda4ff2ee2cef233`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: `provider-app/src/api/provider.ts` exposes a dormant `ProviderApi.login(phone, password)` helper that posts to `/auth/login` with `{ phone, password }`. A source-wide search found no current screen consumer of this helper. The controlled pr`
- `5: The current Provider onboarding flow uses `start`, `step2`, `step3`, `submit`; its login helper is not an active consumer in the inspected source. Therefore this is classified as **DORMANT_CONTRACT_DRIFT**, not patched speculatively. Before`
### backend_consumers_or_contracts
- `3: `provider-app/src/api/provider.ts` exposes a dormant `ProviderApi.login(phone, password)` helper that posts to `/auth/login` with `{ phone, password }`. A source-wide search found no current screen consumer of this helper. The controlled pr`
- `5: The current Provider onboarding flow uses `start`, `step2`, `step3`, `submit`; its login helper is not an active consumer in the inspected source. Therefore this is classified as **DORMANT_CONTRACT_DRIFT**, not patched speculatively. Before`
### auth_ownership
- `3: `provider-app/src/api/provider.ts` exposes a dormant `ProviderApi.login(phone, password)` helper that posts to `/auth/login` with `{ phone, password }`. A source-wide search found no current screen consumer of this helper. The controlled pr`
- `5: The current Provider onboarding flow uses `start`, `step2`, `step3`, `submit`; its login helper is not an active consumer in the inspected source. Therefore this is classified as **DORMANT_CONTRACT_DRIFT**, not patched speculatively. Before`
### state_transitions
- `5: The current Provider onboarding flow uses `start`, `step2`, `step3`, `submit`; its login helper is not an active consumer in the inspected source. Therefore this is classified as **DORMANT_CONTRACT_DRIFT**, not patched speculatively. Before`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
