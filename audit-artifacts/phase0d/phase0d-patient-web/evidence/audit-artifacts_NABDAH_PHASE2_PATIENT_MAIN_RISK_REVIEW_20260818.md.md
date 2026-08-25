# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_PATIENT_MAIN_RISK_REVIEW_20260818.md`
- **Member SHA-256:** `c8a09aef6c1be24e49f2631f1e742d8193cd0bba6adc6e40b1b87f7c0e5d39bb`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `13: | Nutrition exercise plan | Comment states the previous version rendered a hardcoded gym plan for everyone | Verify current API/error/empty behavior; do not treat the comment as active fake data |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: A marker is not classified as a production defect solely because it contains the word `placeholder`, `sample`, or `example`. The reviewer must determine whether it is an input hint, a real empty-state label, a test-only value, a documented `
- `13: | Nutrition exercise plan | Comment states the previous version rendered a hardcoded gym plan for everyone | Verify current API/error/empty behavior; do not treat the comment as active fake data |`
- `15: | Reviews | Comment states a former fake success was replaced by a real endpoint | Positive evidence of prior remediation; runtime mutation test remains required |`
- `16: | Wearables | Comment states latest sample is real data only | Verify source and empty state; no synthetic-data defect inferred from comment |`
- `20: The scan therefore produces a **REVIEW queue**, not automatic deletion instructions. No source was modified based solely on these markers. The findings must feed Phase 8 remediation only where a real user-visible synthetic value or local-on`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: A marker is not classified as a production defect solely because it contains the word `placeholder`, `sample`, or `example`. The reviewer must determine whether it is an input hint, a real empty-state label, a test-only value, a documented `
- `13: | Nutrition exercise plan | Comment states the previous version rendered a hardcoded gym plan for everyone | Verify current API/error/empty behavior; do not treat the comment as active fake data |`
- `16: | Wearables | Comment states latest sample is real data only | Verify source and empty state; no synthetic-data defect inferred from comment |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
