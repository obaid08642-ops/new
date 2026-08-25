# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_LAB_TRUTHFULNESS_20260819.md`
- **Member SHA-256:** `7d00af49488d4eb46ca054457a28dfd738511046d3d59473050b16be0d27e41e`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `42: This source correction does not prove that the laboratory workflow works on production. Provider inbox access, patient ownership, sample registration and transition, report upload/access, insurance decisions, and signed report delivery stil`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `42: This source correction does not prove that the laboratory workflow works on production. Provider inbox access, patient ownership, sample registration and transition, report upload/access, insurance decisions, and signed report delivery stil`
### state_transitions
- `7: ## Confirmed Finding`
- `16: | Test collection | `['cbc']` | Empty list when the backend value is not an array |`
### payment_insurance_relevance
- `9: The laboratory home queue and its sample/result surfaces used presentation fallbacks when records did not include expected fields. Those fallbacks included a branded patient name, a `cbc` test set, a `Cash` insurance classification, a numer`
- `17: | Insurance | `Cash` | `—` when missing |`
- `18: | Total | `150` | Backend total/price or `null` |`
- `42: This source correction does not prove that the laboratory workflow works on production. Provider inbox access, patient ownership, sample registration and transition, report upload/access, insurance decisions, and signed report delivery stil`
### error_empty_loading_retry_cancel
- `16: | Test collection | `['cbc']` | Empty list when the backend value is not an array |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
