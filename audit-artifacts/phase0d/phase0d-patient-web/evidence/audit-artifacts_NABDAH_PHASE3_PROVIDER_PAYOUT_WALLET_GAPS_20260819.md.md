# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_PAYOUT_WALLET_GAPS_20260819.md`
- **Member SHA-256:** `baff52373b4c85966d5d3431ceb1b34dcad9eeb8164226e2eebf8476b4c3cee4`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Withdrawal check and creation are not atomic/idempotent | Backend calculates balance, checks for one pending withdrawal, then separately inserts a request. Parallel requests can both observe no pending request and each create a p`
- `13: | **P1** | UI success discards Backend withdrawal reference/status evidence | After request it switches to a local success view based on input `amount`, without retaining returned request ID, payout destination/amount confirmation, or refre`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | **P1** | Payout destination can be supplied/changed without a verified bank-account workflow | Request accepts body IBAN before profile/bank record, and UI can create a bank record then immediately request payout. Format validation alone `
- `13: | **P1** | UI success discards Backend withdrawal reference/status evidence | After request it switches to a local success view based on input `amount`, without retaining returned request ID, payout destination/amount confirmation, or refre`
### state_transitions
- `3: ## Confirmed controls`
- `5: The payout Controller is JWT-protected, derives a debit-aware available balance from the ledger, rejects negative/insufficient balances, validates Saudi IBAN format, keeps pending escrow separate, and scopes withdrawal history to the curren`
- `7: ## Confirmed defects`
- `11: | **P0** | Withdrawal check and creation are not atomic/idempotent | Backend calculates balance, checks for one pending withdrawal, then separately inserts a request. Parallel requests can both observe no pending request and each create a p`
- `13: | **P1** | UI success discards Backend withdrawal reference/status evidence | After request it switches to a local success view based on input `amount`, without retaining returned request ID, payout destination/amount confirmation, or refre`
- `14: | **P1** | Financial UI still contains raw AR/EN assumptions and emoji error icon | Bank, payout, pending/escrow, errors and minimum terms are not six-language complete or presented with approved locale/currency/legal terms. | Deliver revie`
### payment_insurance_relevance
- `1: # Phase 3 Provider — payout and wallet workflow gaps`
- `5: The payout Controller is JWT-protected, derives a debit-aware available balance from the ledger, rejects negative/insufficient balances, validates Saudi IBAN format, keeps pending escrow separate, and scopes withdrawal history to the curren`
- `11: | **P0** | Withdrawal check and creation are not atomic/idempotent | Backend calculates balance, checks for one pending withdrawal, then separately inserts a request. Parallel requests can both observe no pending request and each create a p`
- `12: | **P1** | Payout destination can be supplied/changed without a verified bank-account workflow | Request accepts body IBAN before profile/bank record, and UI can create a bank record then immediately request payout. Format validation alone `
- `13: | **P1** | UI success discards Backend withdrawal reference/status evidence | After request it switches to a local success view based on input `amount`, without retaining returned request ID, payout destination/amount confirmation, or refre`
- `14: | **P1** | Financial UI still contains raw AR/EN assumptions and emoji error icon | Bank, payout, pending/escrow, errors and minimum terms are not six-language complete or presented with approved locale/currency/legal terms. | Deliver revie`
- `18: Provider withdrawal is **FIX/BLOCKED** for concurrent financial integrity and verified payout-destination handling. It may not be treated as production-ready until atomic/idempotent reservation and account verification are demonstrably test`
### error_empty_loading_retry_cancel
- `5: The payout Controller is JWT-protected, derives a debit-aware available balance from the ledger, rejects negative/insufficient balances, validates Saudi IBAN format, keeps pending escrow separate, and scopes withdrawal history to the curren`
- `11: | **P0** | Withdrawal check and creation are not atomic/idempotent | Backend calculates balance, checks for one pending withdrawal, then separately inserts a request. Parallel requests can both observe no pending request and each create a p`
- `13: | **P1** | UI success discards Backend withdrawal reference/status evidence | After request it switches to a local success view based on input `amount`, without retaining returned request ID, payout destination/amount confirmation, or refre`
- `14: | **P1** | Financial UI still contains raw AR/EN assumptions and emoji error icon | Bank, payout, pending/escrow, errors and minimum terms are not six-language complete or presented with approved locale/currency/legal terms. | Deliver revie`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
