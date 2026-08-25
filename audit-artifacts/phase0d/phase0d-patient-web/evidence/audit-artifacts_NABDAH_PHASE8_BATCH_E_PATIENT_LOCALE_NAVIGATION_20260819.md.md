# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_E_PATIENT_LOCALE_NAVIGATION_20260819.md`
- **Member SHA-256:** `0985455d8804708d8c5edb8bec9ed99652763feb6d388b87a9dd0a81cc175184`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: | Branch upload | **PASS** — source commit `ae0673a` (`fix: localize patient bottom navigation`) is on `manus/on-live-reconciliation`. |`
- `29: This fixes the global navigation shell, not every hard-coded RTL/LTR screen or all translation content. Phase 8 continues with feature-specific screen remediation and Phase 9/10 retain the mandatory six-language screen inventory, geometry, `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: | Accessibility | Every tab and the central consultation action now declare tab role, localized label, selected state and stable test ID. |`
### state_transitions
- `12: | Labels | A typed `bottomNavLocale` module supplies non-empty Home, Pharmacy, Consultations, Diagnostics and Nursing labels for all six supported locales. |`
- `13: | Accessibility | Every tab and the central consultation action now declare tab role, localized label, selected state and stable test ID. |`
- `20: | Focused locale test | **PASS** — `bottomNavLocale.test.ts`: 1 suite, 2 tests. It verifies that only Arabic/Urdu are RTL and that all five labels are non-empty in all six locales. |`
### payment_insurance_relevance
- `23: | Archive integrity | **PASS** — rebuilt `nabd_plus_patient_app.zip` validates with `unzip -tq`; `node_modules`, `dist` and coverage outputs are excluded. |`
### error_empty_loading_retry_cancel
- `12: | Labels | A typed `bottomNavLocale` module supplies non-empty Home, Pharmacy, Consultations, Diagnostics and Nursing labels for all six supported locales. |`
- `20: | Focused locale test | **PASS** — `bottomNavLocale.test.ts`: 1 suite, 2 tests. It verifies that only Arabic/Urdu are RTL and that all five labels are non-empty in all six locales. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
