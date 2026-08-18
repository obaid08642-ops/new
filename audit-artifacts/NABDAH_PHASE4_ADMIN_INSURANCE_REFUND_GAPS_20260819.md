# Phase 4 Admin Dashboard — insurance and refund supervision gaps

## Confirmed controls

Refund requests enforce a positive paid amount/reason, avoid a second open request by booking, apply policy-based calculated refund amount, record request/decision history, and expose a request-state guard. Insurance/refund Controllers use JWT authentication.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Admin finance/insurance Controllers declare JWT only, without explicit administrative role or permission guard | `AdminFinanceCoreController` and `AdminInsuranceController` use `JwtAuthGuard` but declare no admin/finance-role/permission decorator at controller or method level. | Enforce explicit server-side permission policy for every queue/read/decision; add patient/provider/non-finance-admin negative tests and audit all privileged access. |
| **P1** | Refund decision is a one-step optional-note state flip without a financial execution/reconciliation UI | Admin can approve/reject with no mandatory policy reason, payment-refund evidence, provider/payment-gateway reference, maker-checker, receipt or post-decision reconciliation displayed. | Define decision versus payment-execution state machine, mandatory reason policy, actor/timestamp audit, configurable dual approval, payment reference and patient notification/receipt. |
| **P1** | Refund decision uses read-then-save rather than conditional atomic transition | Service loads `REQUESTED`, changes state, then saves. Concurrent decisions can race between the state read and save. | Use a conditional `findOneAndUpdate({id,state:REQUESTED})` or transaction with versioning/idempotency; test simultaneous approve/reject calls. |
| **P1** | UI masks partial system failure as empty insurance/refund queues | Each API request is individually caught as `null`/`[]` inside `Promise.all`; outer error is not set, so an outage displays zero counts/no requests. | Track per-source failures/staleness and retries; never permit operational decisions from incomplete aggregate data. |
| **P1** | Insurance details expose all raw fields to every rendered admin | Drawer includes a “all raw fields” JSON dump containing identity, policy, provider, NPHIES, note and unknown extra fields. | Apply typed minimum-necessary DTO, field redaction/masking, role-based reveal and viewer audit; remove raw JSON from production UI. |
| **P1** | Insurance/refund decision UI is Arabic/raw and lacks robust status semantics | It has limited state mapping, no failure/reconciliation status and no six-language/RTL-LTR accessibility coverage. | Complete typed status model and reviewed AR/EN/UR/HI/BN/FIL accessible decision UI. |

## Decision

Insurance and refund supervision is **FIX/BLOCKED**. JWT alone is not a sufficient declared privilege boundary, and decision/reconciliation/data-minimization requirements remain incomplete.
