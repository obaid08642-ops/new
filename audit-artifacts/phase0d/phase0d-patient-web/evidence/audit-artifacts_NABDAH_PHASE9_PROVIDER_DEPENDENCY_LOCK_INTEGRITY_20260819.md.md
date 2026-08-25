# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE9_PROVIDER_DEPENDENCY_LOCK_INTEGRITY_20260819.md`
- **Member SHA-256:** `f3097d3587812c502cfac6b84b3caa2e8beb28d230c4289e2518dae872d69ef9`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The provider clean-install gate initially failed because the project combined Expo 54 and Expo Router 6 with `jest-expo` 52, which resolved an incompatible React Server Components peer. A second resolver pass exposed that the caret range fo`
- `18: | Branch upload | **PASS** — archive commit `b3849e9` (`fix: align provider Expo test dependencies`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: The provider clean-install gate initially failed because the project combined Expo 54 and Expo Router 6 with `jest-expo` 52, which resolved an incompatible React Server Components peer. A second resolver pass exposed that the caret range fo`
- `16: | Provider production web export | **PASS** — Expo web bundle completed. |`
### payment_insurance_relevance
- `22: This repairs clean dependency resolution and test-renderer version consistency. It does not resolve dependency audit advisories, replace Android/iOS build evidence, or waive the documented real-device, live-E2E, legal/consent, payment and d`
### error_empty_loading_retry_cancel
- `5: The provider clean-install gate initially failed because the project combined Expo 54 and Expo Router 6 with `jest-expo` 52, which resolved an incompatible React Server Components peer. A second resolver pass exposed that the caret range fo`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
