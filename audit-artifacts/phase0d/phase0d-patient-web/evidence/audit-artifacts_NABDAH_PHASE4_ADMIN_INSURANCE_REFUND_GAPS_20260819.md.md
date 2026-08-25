# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_INSURANCE_REFUND_GAPS_20260819.md`
- **Member SHA-256:** `f7f316e935de490ad381486f69530d1f00756ab18d611bd70134e69922d2fad5`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 4 Admin Dashboard — insurance and refund supervision gaps`
- `5: Refund requests enforce a positive paid amount/reason, avoid a second open request by booking, apply policy-based calculated refund amount, record request/decision history, and expose a request-state guard. Insurance/refund Controllers use `
- `12: | **P1** | Refund decision is a one-step optional-note state flip without a financial execution/reconciliation UI | Admin can approve/reject with no mandatory policy reason, payment-refund evidence, provider/payment-gateway reference, maker`
- `13: | **P1** | Refund decision uses read-then-save rather than conditional atomic transition | Service loads `REQUESTED`, changes state, then saves. Concurrent decisions can race between the state read and save. | Use a conditional `findOneAndU`
- `14: | **P1** | UI masks partial system failure as empty insurance/refund queues | Each API request is individually caught as `null`/`[]` inside `Promise.all`; outer error is not set, so an outage displays zero counts/no requests. | Track per-so`
- `16: | **P1** | Insurance/refund decision UI is Arabic/raw and lacks robust status semantics | It has limited state mapping, no failure/reconciliation status and no six-language/RTL-LTR accessibility coverage. | Complete typed status model and r`
- `20: Insurance and refund supervision is **FIX/BLOCKED**. JWT alone is not a sufficient declared privilege boundary, and decision/reconciliation/data-minimization requirements remain incomplete.`
### backend_consumers_or_contracts
- `11: | **P0** | Admin finance/insurance Controllers declare JWT only, without explicit administrative role or permission guard | `AdminFinanceCoreController` and `AdminInsuranceController` use `JwtAuthGuard` but declare no admin/finance-role/per`
### auth_ownership
- `1: # Phase 4 Admin Dashboard — insurance and refund supervision gaps`
- `11: | **P0** | Admin finance/insurance Controllers declare JWT only, without explicit administrative role or permission guard | `AdminFinanceCoreController` and `AdminInsuranceController` use `JwtAuthGuard` but declare no admin/finance-role/per`
- `12: | **P1** | Refund decision is a one-step optional-note state flip without a financial execution/reconciliation UI | Admin can approve/reject with no mandatory policy reason, payment-refund evidence, provider/payment-gateway reference, maker`
- `15: | **P1** | Insurance details expose all raw fields to every rendered admin | Drawer includes a “all raw fields” JSON dump containing identity, policy, provider, NPHIES, note and unknown extra fields. | Apply typed minimum-necessary DTO, fie`
### state_transitions
- `1: # Phase 4 Admin Dashboard — insurance and refund supervision gaps`
- `3: ## Confirmed controls`
- `5: Refund requests enforce a positive paid amount/reason, avoid a second open request by booking, apply policy-based calculated refund amount, record request/decision history, and expose a request-state guard. Insurance/refund Controllers use `
- `7: ## Confirmed defects`
- `12: | **P1** | Refund decision is a one-step optional-note state flip without a financial execution/reconciliation UI | Admin can approve/reject with no mandatory policy reason, payment-refund evidence, provider/payment-gateway reference, maker`
- `13: | **P1** | Refund decision uses read-then-save rather than conditional atomic transition | Service loads `REQUESTED`, changes state, then saves. Concurrent decisions can race between the state read and save. | Use a conditional `findOneAndU`
- `14: | **P1** | UI masks partial system failure as empty insurance/refund queues | Each API request is individually caught as `null`/`[]` inside `Promise.all`; outer error is not set, so an outage displays zero counts/no requests. | Track per-so`
- `16: | **P1** | Insurance/refund decision UI is Arabic/raw and lacks robust status semantics | It has limited state mapping, no failure/reconciliation status and no six-language/RTL-LTR accessibility coverage. | Complete typed status model and r`
- `20: Insurance and refund supervision is **FIX/BLOCKED**. JWT alone is not a sufficient declared privilege boundary, and decision/reconciliation/data-minimization requirements remain incomplete.`
### payment_insurance_relevance
- `1: # Phase 4 Admin Dashboard — insurance and refund supervision gaps`
- `5: Refund requests enforce a positive paid amount/reason, avoid a second open request by booking, apply policy-based calculated refund amount, record request/decision history, and expose a request-state guard. Insurance/refund Controllers use `
- `11: | **P0** | Admin finance/insurance Controllers declare JWT only, without explicit administrative role or permission guard | `AdminFinanceCoreController` and `AdminInsuranceController` use `JwtAuthGuard` but declare no admin/finance-role/per`
- `12: | **P1** | Refund decision is a one-step optional-note state flip without a financial execution/reconciliation UI | Admin can approve/reject with no mandatory policy reason, payment-refund evidence, provider/payment-gateway reference, maker`
- `13: | **P1** | Refund decision uses read-then-save rather than conditional atomic transition | Service loads `REQUESTED`, changes state, then saves. Concurrent decisions can race between the state read and save. | Use a conditional `findOneAndU`
- `14: | **P1** | UI masks partial system failure as empty insurance/refund queues | Each API request is individually caught as `null`/`[]` inside `Promise.all`; outer error is not set, so an outage displays zero counts/no requests. | Track per-so`
- `15: | **P1** | Insurance details expose all raw fields to every rendered admin | Drawer includes a “all raw fields” JSON dump containing identity, policy, provider, NPHIES, note and unknown extra fields. | Apply typed minimum-necessary DTO, fie`
- `16: | **P1** | Insurance/refund decision UI is Arabic/raw and lacks robust status semantics | It has limited state mapping, no failure/reconciliation status and no six-language/RTL-LTR accessibility coverage. | Complete typed status model and r`
- `20: Insurance and refund supervision is **FIX/BLOCKED**. JWT alone is not a sufficient declared privilege boundary, and decision/reconciliation/data-minimization requirements remain incomplete.`
### error_empty_loading_retry_cancel
- `14: | **P1** | UI masks partial system failure as empty insurance/refund queues | Each API request is individually caught as `null`/`[]` inside `Promise.all`; outer error is not set, so an outage displays zero counts/no requests. | Track per-so`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
