# Phase 4 Admin Dashboard — dispute-resolution gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation pathway as a purported refund. | Separate dispute decision, cancellation, refund authorization and payment execution into explicit server state transitions; add end-to-end contract tests for approve/refund/reject/cancel and strict idempotency. |
| **P0** | UI declares financial resolution without checking Backend response or payment evidence | It ignores HTTP status/body and always alerts refund approved/closed or complaint rejected, with no refund ID, amount, gateway state, booking/order status or ledger reconciliation. | Require typed returned decision/payment state, stable case/refund reference, receipt, actor/audit and explicit error/retry/reconciliation before presenting success. |
| **P1** | Dispute decisions lack case evidence, reason codes, partial decision, appeals and maker-checker controls | One click provides a fixed reason, no evidence/communications/timeline/amount review, no policy/role/step-up, and no appeal or patient/provider notifications. | Implement an owned dispute-case workflow with evidence, controlled outcome/reason, partial remedies, dual approval where required, notification/appeal and immutable audit. |
| **P1** | Browser token reuse and data outage are handled unsafely | Page reads `admin_token` from `localStorage`; failed/non-OK list load renders no disputes and makes a false “transactions normal” statement. | Use unified secure session client and error/stale/retry state; never infer no disputes or system normalcy from a failed source. |
| **P1** | Missing dispute fields are fabricated | UI substitutes patient, provider, SAR 150 and generic quality objection values, which can distort high-impact decisions. | Render verified source values or explicit unavailable/malformed state, never synthetic case facts. |
| **P1** | Dispute UI is Arabic-only and omits accessible high-risk warnings | Financial/legal actions, status and case data lack six-language/accessibility and confidentiality treatment. | Provide reviewed multilingual accessible decision UI with minimum-data and high-risk safeguards. |

## Decision

Admin dispute resolution is **P0 FIX/BLOCKED**. It must not resolve, cancel or refund an order until decision and money-movement semantics are separated, verified and audited.
