# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE10_FINAL_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `21d122dffc1acf05c644031954e73786a1b75066ccff4afb03e8111e3bc0e666`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: > **PASS for the bounded dependency remediation performed; BLOCKED for deployment.** Admin dependency risks were remediated to zero findings and all available source gates remain green. Backend, Patient and Provider have high-severity findi`
- `16: | Admin | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | **PASS** |`
- `25: | Admin | 0 | 0 | 0 | 0 | **Remediated and revalidated.** |`
- `29: No force update, production deployment, database mutation, payment mutation or emergency activation was performed. Phase 10 is complete as a risk triage and bounded remediation phase. The next executable phase is reviewer-authorized **sandb`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `29: No force update, production deployment, database mutation, payment mutation or emergency activation was performed. Phase 10 is complete as a risk triage and bounded remediation phase. The next executable phase is reviewer-authorized **sandb`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
