# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AJ_PATIENT_LOCALE_TECHNICAL_KEY_CONTAINMENT_20260819.md`
- **Member SHA-256:** `2baf16b9532c1376c6ebed3d782c215304fe1668008e1f7ff57fab5fac422da4`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: | Branch upload | **PASS** — archive commit `8d7ca1d` (`fix: prevent raw patient locale keys`) is pushed to `manus/on-live-reconciliation`. |`
- `28: This test proves renderability and prevents technical-key leakage; it does **not** prove idiomatic, medically reviewed, culturally appropriate or layout-safe language in every screen. No patient data or production/sandbox account was access`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `13: | Regression coverage | A central i18n test walks all Arabic shared/feature keys in all six languages, rejects empty or raw-key output, verifies known exact dynamic translation, and ensures unknown server content is not silently mutated. |`
- `20: | Patient full test suite | **PASS** — full Jest command completed. |`
- `22: | Patient production web export | **PASS** — Expo web bundle completed. |`
### payment_insurance_relevance
- `13: | Regression coverage | A central i18n test walks all Arabic shared/feature keys in all six languages, rejects empty or raw-key output, verifies known exact dynamic translation, and ensures unknown server content is not silently mutated. |`
### error_empty_loading_retry_cancel
- `13: | Regression coverage | A central i18n test walks all Arabic shared/feature keys in all six languages, rejects empty or raw-key output, verifies known exact dynamic translation, and ensures unknown server content is not silently mutated. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
