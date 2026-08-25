# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_DIRECT_SOURCE_BRANCH_EVIDENCE_20260818.md`
- **Member SHA-256:** `ebacbb0393afe06cd58d0199961fae8d3889a4e0892c12eca0b064cd398514bc`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | Admin | `admin-app/` | 125 |`
- `14: The current reconciliation branch contains QA artifacts, a Provider source tree, and compressed Backend/Patient/Admin archives, so it is not a complete direct-source tree for all four applications. Therefore the next source work must be bas`
- `16: No files from `Alhrajplus`, `Naps-admin`, or any repository outside `obaid08642-ops/new` were used in this determination.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
