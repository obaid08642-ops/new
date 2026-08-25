# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_EXPO_BUILD_BLOCKER_20260818.md`
- **Member SHA-256:** `bccc7cc39dce5842ac34a4c97e3c2642c8f526adb1fbb14d0f8d183708b57225`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Provider snapshot at `/home/ubuntu/nabdah-live-work/provider-app` declares `main: node_modules/expo/AppEntry.js` in `package.json`, but the project root contains no `App.tsx`, `App.jsx`, or `App.js`. The source tree contains screens, co`
- `17: Restore the real Provider `App` entrypoint and navigation graph from the authoritative source register, then run TypeScript, Jest, Expo export/prebuild, and device/farm tests. No store-readiness claim is valid while this blocker remains.`
### backend_consumers_or_contracts
- `13: **BLOCKED_BUILD_SOURCE_SNAPSHOT**. This is not a runtime API failure and not fixed by changing Expo configuration. Creating a guessed App entrypoint would risk discarding the authoritative navigation/auth wiring and is therefore prohibited `
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `13: **BLOCKED_BUILD_SOURCE_SNAPSHOT**. This is not a runtime API failure and not fixed by changing Expo configuration. Creating a guessed App entrypoint would risk discarding the authoritative navigation/auth wiring and is therefore prohibited `
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
