# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_PAYOUT_FINANCE_GAPS_20260819.md`
- **Member SHA-256:** `35942332352b50d3613660e1579f9b10e845fffaadd139dec5be020893e2637d`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The payout Controller reconciles legacy/provider-ops queues, recomputes provider available balance, blocks an amount above availability, routes large payouts into a maker-checker approval service, and appends a payout ledger entry. These ar`
- `11: | **P0** | UI reports a completed transfer when Backend routes a large payout to maker-checker review | Backend returns `{success:false, routed_to_approval:true}` for threshold payouts; `handleExecutePayout` ignores the response and always `
- `13: | **P1** | One-click finance execution has no receipt/proof-of-payment workflow | Admin has a browser confirm only; no payment-provider transfer reference, beneficiary verification result, maker/executor distinction for normal payouts, or d`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — payout approval and finance gaps`
- `13: | **P1** | One-click finance execution has no receipt/proof-of-payment workflow | Admin has a browser confirm only; no payment-provider transfer reference, beneficiary verification result, maker/executor distinction for normal payouts, or d`
- `15: | **P1** | Full IBAN is displayed to every rendered admin | Pending table shows the full bank account number and no field-level permission/masking control. | Mask bank data by default, reveal only through audited role/step-up access, and bi`
- `20: Admin payout approval is **P0 FIX/BLOCKED**. Existing balance and maker-checker foundations are not sufficient while the UI can falsely declare payment complete and state/ledger execution is not demonstrably atomic.`
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed defects`
- `11: | **P0** | UI reports a completed transfer when Backend routes a large payout to maker-checker review | Backend returns `{success:false, routed_to_approval:true}` for threshold payouts; `handleExecutePayout` ignores the response and always `
- `12: | **P0** | Payout state update and ledger append are not one atomic operation | Controller validates, updates withdrawal state, then separately checks/appends ledger. Concurrent execute requests can race between read/update/duplicate check;`
- `14: | **P1** | Reject reason is optional and lost for legacy withdrawals | UI allows blank rejection; Backend persists reason only on provider-ops path, while legacy rejection changes status without reason/actor/time decision metadata shown. | `
- `15: | **P1** | Full IBAN is displayed to every rendered admin | Pending table shows the full bank account number and no field-level permission/masking control. | Mask bank data by default, reveal only through audited role/step-up access, and bi`
- `16: | **P1** | Payout UI remains Arabic-only and lacks accessible financial status detail | Status/confirmation/error/review content is Arabic/raw and does not handle maker-checker/reconciliation states. | Add reviewed six-language, accessible `
- `20: Admin payout approval is **P0 FIX/BLOCKED**. Existing balance and maker-checker foundations are not sufficient while the UI can falsely declare payment complete and state/ledger execution is not demonstrably atomic.`
### payment_insurance_relevance
- `1: # Phase 4 Admin Dashboard — payout approval and finance gaps`
- `5: The payout Controller reconciles legacy/provider-ops queues, recomputes provider available balance, blocks an amount above availability, routes large payouts into a maker-checker approval service, and appends a payout ledger entry. These ar`
- `11: | **P0** | UI reports a completed transfer when Backend routes a large payout to maker-checker review | Backend returns `{success:false, routed_to_approval:true}` for threshold payouts; `handleExecutePayout` ignores the response and always `
- `12: | **P0** | Payout state update and ledger append are not one atomic operation | Controller validates, updates withdrawal state, then separately checks/appends ledger. Concurrent execute requests can race between read/update/duplicate check;`
- `13: | **P1** | One-click finance execution has no receipt/proof-of-payment workflow | Admin has a browser confirm only; no payment-provider transfer reference, beneficiary verification result, maker/executor distinction for normal payouts, or d`
- `15: | **P1** | Full IBAN is displayed to every rendered admin | Pending table shows the full bank account number and no field-level permission/masking control. | Mask bank data by default, reveal only through audited role/step-up access, and bi`
- `16: | **P1** | Payout UI remains Arabic-only and lacks accessible financial status detail | Status/confirmation/error/review content is Arabic/raw and does not handle maker-checker/reconciliation states. | Add reviewed six-language, accessible `
- `20: Admin payout approval is **P0 FIX/BLOCKED**. Existing balance and maker-checker foundations are not sufficient while the UI can falsely declare payment complete and state/ledger execution is not demonstrably atomic.`
### error_empty_loading_retry_cancel
- `15: | **P1** | Full IBAN is displayed to every rendered admin | Pending table shows the full bank account number and no field-level permission/masking control. | Mask bank data by default, reveal only through audited role/step-up access, and bi`
- `16: | **P1** | Payout UI remains Arabic-only and lacks accessible financial status detail | Status/confirmation/error/review content is Arabic/raw and does not handle maker-checker/reconciliation states. | Add reviewed six-language, accessible `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
