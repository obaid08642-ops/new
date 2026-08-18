# Phase 3 Provider — payout and wallet workflow gaps

## Confirmed controls

The payout Controller is JWT-protected, derives a debit-aware available balance from the ledger, rejects negative/insufficient balances, validates Saudi IBAN format, keeps pending escrow separate, and scopes withdrawal history to the current provider. These are positive financial controls.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Withdrawal check and creation are not atomic/idempotent | Backend calculates balance, checks for one pending withdrawal, then separately inserts a request. Parallel requests can both observe no pending request and each create a payout, while the UI supplies no idempotency key. | Use an atomic transaction/conditional unique pending-withdrawal constraint plus provider request idempotency; reserve/reconcile available balance and return the same stable request on retry. |
| **P1** | Payout destination can be supplied/changed without a verified bank-account workflow | Request accepts body IBAN before profile/bank record, and UI can create a bank record then immediately request payout. Format validation alone does not verify ownership or provide a change-risk review. | Require a verified, owned bank account before payout; introduce out-of-band/change confirmation, cooling period or verified token as appropriate, audit and clear notification of destination changes. |
| **P1** | UI success discards Backend withdrawal reference/status evidence | After request it switches to a local success view based on input `amount`, without retaining returned request ID, payout destination/amount confirmation, or refreshing ledger/history. | Render the returned stable request reference and server state; reload history/balance, show review/paid/rejected transitions and safe retry semantics. |
| **P1** | Financial UI still contains raw AR/EN assumptions and emoji error icon | Bank, payout, pending/escrow, errors and minimum terms are not six-language complete or presented with approved locale/currency/legal terms. | Deliver reviewed AR/EN/UR/HI/BN/FIL finance copy, locale-safe currency/number display and accessible vector status controls. |

## Decision

Provider withdrawal is **FIX/BLOCKED** for concurrent financial integrity and verified payout-destination handling. It may not be treated as production-ready until atomic/idempotent reservation and account verification are demonstrably tested.
