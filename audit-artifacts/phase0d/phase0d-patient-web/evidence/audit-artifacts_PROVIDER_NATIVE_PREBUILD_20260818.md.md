# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_NATIVE_PREBUILD_20260818.md`
- **Member SHA-256:** `15843bfcc0dda493a34ae2064fc1a6044d6d70493b36ef2ad7846499c16ed964`
- **Line count:** 7
- **Read range:** `1-7`
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
- `3: `npx expo prebuild --no-install --clean` completed successfully after restoring the verified App entrypoint. It generated Android and iOS native projects and did not modify `package.json` or `app.json`.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
