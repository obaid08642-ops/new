# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md`
- **Member SHA-256:** `09eac3a2b77a4188d32975122705be2881fae1953cd3e5d8c7c6a6d326c87234`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: The same `ProviderOnboardingService` contains `getProgress(user)` but no `getMyProfile(user)` implementation. The Provider App consumer inventory does not call `my-profile`; its onboarding API calls `start`, `step2`, `step3`, and `submit`.`
- `27: Classify as **UNRECONCILED_SOURCE_DRIFT**, not as a confirmed production route defect. The backend snapshot is not a Git working tree in the current workspace, so no backend patch is applied from this snapshot. Before any code fix, reconcil`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `23: No token or response body was persisted.`
### state_transitions
- `18: | Path | Status | Classification |`
- `27: Classify as **UNRECONCILED_SOURCE_DRIFT**, not as a confirmed production route defect. The backend snapshot is not a Git working tree in the current workspace, so no backend patch is applied from this snapshot. Before any code fix, reconcil`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
