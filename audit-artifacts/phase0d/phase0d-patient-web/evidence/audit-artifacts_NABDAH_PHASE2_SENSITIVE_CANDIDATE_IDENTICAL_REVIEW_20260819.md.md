# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_SENSITIVE_CANDIDATE_IDENTICAL_REVIEW_20260819.md`
- **Member SHA-256:** `defd8f0432c65bbf02a4549b5d33654ccf21e36b4d87e6d0c564977ed1449980`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `17: No exception to the `main`-default source policy exists for these five files: the current reconciled reference contains the same bytes. The older matrix values therefore do not justify a source replacement or merge. Their actual API, loadin`
### state_transitions
- `17: No exception to the `main`-default source policy exists for these five files: the current reconciled reference contains the same bytes. The older matrix values therefore do not justify a source replacement or merge. Their actual API, loadin`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: No exception to the `main`-default source policy exists for these five files: the current reconciled reference contains the same bytes. The older matrix values therefore do not justify a source replacement or merge. Their actual API, loadin`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
