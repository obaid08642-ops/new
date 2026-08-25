# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_NEW_REPOSITORY_BRANCH_INDEX_20260818.txt`
- **Member SHA-256:** `65381805c8fd0ce343541fb16fdb724d805a2a75d958fdb3e8166cbf03a49ab8`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: m5-admin-pages`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: m5-admin-pages`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `10: m3-insurance-finance`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
