# Phase 8 — Batch AD: admin refund decision integrity

## Purpose

The Admin disputes page exposed a **Refund** action but posted the same order `force-cancel` request used for rejection. This could imply a financial settlement when the Backend had only cancelled an order. The actual refund execution is a distinct server-side flow with payment eligibility, ledger, provider-debit, notification and gateway checks.

## Source change

| Surface | Implemented control |
|---|---|
| Dispute refund button | The refund action no longer calls `force-cancel`. It explicitly blocks direct execution and tells the reviewer to use the approved refund queue, where the server can validate eligibility/payment before any settlement. |
| Dispute rejection button | Rejection still submits the force-cancel decision, but its message explicitly states that it is not a financial refund. |
| Existing server boundary | `RefundExecutor` remains the authority for approved refunds: it checks total paid/refunded amount, gateway success where applicable, append-only refund ledger record, patient wallet handling, provider debit/reversal and notifications. No client-side financial state is added. |
| Build repair | Next.js 16 treated the project’s custom `src/pages/_document.tsx` as an invalid Document import during prerender. The obsolete custom template was removed so the framework default Document is used; the full 34-page production build now completes. |

## Verification

| Gate | Result |
|---|---|
| Admin refund decision contract | **PASS** — verifies direct refund branch, approved-queue message and absence of the old conditional success wording. |
| Next.js production build | **PASS** — TypeScript, compilation, prerender and 34 static admin routes completed. |
| Archive integrity | **PASS** — rebuilt Admin archive validates with `unzip -tq`; `node_modules`, `.next`, outputs and coverage are excluded. |
| Admin archive SHA-256 | `2854af2b85440775d1a02c6f2a2fb721b95677aa9896b946bb19dcb4407eb974` |
| Branch upload | **PASS** — source commit `4128f99` (`fix: separate admin refund decisions from cancellations`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No dispute, cancellation, refund, payment gateway call, wallet or production record was created or changed. The insurance refund queue and `RefundExecutor` remain the only eligible settlement path. Phase 11 requires a reviewer-authorized, sandbox-only flow covering approval/rejection, full/partial refund eligibility, duplicate request idempotency, no gateway activation, ledger/provider-balance result, notification/audit records and foreign admin denial. Moyasar is still deferred.
