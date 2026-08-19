# Phase 4 Admin Dashboard — payout approval and finance gaps

## Confirmed controls

The payout Controller reconciles legacy/provider-ops queues, recomputes provider available balance, blocks an amount above availability, routes large payouts into a maker-checker approval service, and appends a payout ledger entry. These are meaningful controls.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | UI reports a completed transfer when Backend routes a large payout to maker-checker review | Backend returns `{success:false, routed_to_approval:true}` for threshold payouts; `handleExecutePayout` ignores the response and always alerts “transferred successfully.” | Parse and render the returned operation state/reference; do not mark payment complete until an independent authorized approver and execution evidence are confirmed. |
| **P0** | Payout state update and ledger append are not one atomic operation | Controller validates, updates withdrawal state, then separately checks/appends ledger. Concurrent execute requests can race between read/update/duplicate check; a failure after state update can yield paid-without-ledger. | Use a transactional/conditional compare-and-set state transition, unique ledger reference, idempotency key and outbox/reconciliation path; test parallel execution and fault injection. |
| **P1** | One-click finance execution has no receipt/proof-of-payment workflow | Admin has a browser confirm only; no payment-provider transfer reference, beneficiary verification result, maker/executor distinction for normal payouts, or downloadable/audited execution record is displayed. | Require an explicit reviewed payout detail, verified destination, execution reference/evidence, actor/time audit, configurable maker-checker policy and post-transfer reconciliation. |
| **P1** | Reject reason is optional and lost for legacy withdrawals | UI allows blank rejection; Backend persists reason only on provider-ops path, while legacy rejection changes status without reason/actor/time decision metadata shown. | Require standardized reason codes plus narrative where appropriate; store/return actor, decision time, reason and provider notification for every source. |
| **P1** | Full IBAN is displayed to every rendered admin | Pending table shows the full bank account number and no field-level permission/masking control. | Mask bank data by default, reveal only through audited role/step-up access, and bind payout data to minimum-necessary finance roles. |
| **P1** | Payout UI remains Arabic-only and lacks accessible financial status detail | Status/confirmation/error/review content is Arabic/raw and does not handle maker-checker/reconciliation states. | Add reviewed six-language, accessible finance status/receipt UI with locale currency/date formatting. |

## Decision

Admin payout approval is **P0 FIX/BLOCKED**. Existing balance and maker-checker foundations are not sufficient while the UI can falsely declare payment complete and state/ledger execution is not demonstrably atomic.
