# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AD_ADMIN_REFUND_DECISION_INTEGRITY_20260819.md`
- **Member SHA-256:** `46797a6d1105f42cbf38fb58fe7bcb5967b47453ec2df2d33f9e470a0199770f`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 8 — Batch AD: admin refund decision integrity`
- `5: The Admin disputes page exposed a **Refund** action but posted the same order `force-cancel` request used for rejection. This could imply a financial settlement when the Backend had only cancelled an order. The actual refund execution is a `
- `11: | Dispute refund button | The refund action no longer calls `force-cancel`. It explicitly blocks direct execution and tells the reviewer to use the approved refund queue, where the server can validate eligibility/payment before any settleme`
- `12: | Dispute rejection button | Rejection still submits the force-cancel decision, but its message explicitly states that it is not a financial refund. |`
- `13: | Existing server boundary | `RefundExecutor` remains the authority for approved refunds: it checks total paid/refunded amount, gateway success where applicable, append-only refund ledger record, patient wallet handling, provider debit/reve`
- `14: | Build repair | Next.js 16 treated the project’s custom `src/pages/_document.tsx` as an invalid Document import during prerender. The obsolete custom template was removed so the framework default Document is used; the full 34-page producti`
- `20: | Admin refund decision contract | **PASS** — verifies direct refund branch, approved-queue message and absence of the old conditional success wording. |`
- `21: | Next.js production build | **PASS** — TypeScript, compilation, prerender and 34 static admin routes completed. |`
- `24: | Branch upload | **PASS** — source commit `4128f99` (`fix: separate admin refund decisions from cancellations`) is on `manus/on-live-reconciliation`. |`
- `28: No dispute, cancellation, refund, payment gateway call, wallet or production record was created or changed. The insurance refund queue and `RefundExecutor` remain the only eligible settlement path. Phase 11 requires a reviewer-authorized, s`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AD: admin refund decision integrity`
- `5: The Admin disputes page exposed a **Refund** action but posted the same order `force-cancel` request used for rejection. This could imply a financial settlement when the Backend had only cancelled an order. The actual refund execution is a `
- `20: | Admin refund decision contract | **PASS** — verifies direct refund branch, approved-queue message and absence of the old conditional success wording. |`
- `21: | Next.js production build | **PASS** — TypeScript, compilation, prerender and 34 static admin routes completed. |`
- `22: | Archive integrity | **PASS** — rebuilt Admin archive validates with `unzip -tq`; `node_modules`, `.next`, outputs and coverage are excluded. |`
- `23: | Admin archive SHA-256 | `2854af2b85440775d1a02c6f2a2fb721b95677aa9896b946bb19dcb4407eb974` |`
- `24: | Branch upload | **PASS** — source commit `4128f99` (`fix: separate admin refund decisions from cancellations`) is on `manus/on-live-reconciliation`. |`
- `28: No dispute, cancellation, refund, payment gateway call, wallet or production record was created or changed. The insurance refund queue and `RefundExecutor` remain the only eligible settlement path. Phase 11 requires a reviewer-authorized, s`
### state_transitions
- `1: # Phase 8 — Batch AD: admin refund decision integrity`
- `5: The Admin disputes page exposed a **Refund** action but posted the same order `force-cancel` request used for rejection. This could imply a financial settlement when the Backend had only cancelled an order. The actual refund execution is a `
- `11: | Dispute refund button | The refund action no longer calls `force-cancel`. It explicitly blocks direct execution and tells the reviewer to use the approved refund queue, where the server can validate eligibility/payment before any settleme`
- `12: | Dispute rejection button | Rejection still submits the force-cancel decision, but its message explicitly states that it is not a financial refund. |`
- `13: | Existing server boundary | `RefundExecutor` remains the authority for approved refunds: it checks total paid/refunded amount, gateway success where applicable, append-only refund ledger record, patient wallet handling, provider debit/reve`
- `20: | Admin refund decision contract | **PASS** — verifies direct refund branch, approved-queue message and absence of the old conditional success wording. |`
- `21: | Next.js production build | **PASS** — TypeScript, compilation, prerender and 34 static admin routes completed. |`
- `24: | Branch upload | **PASS** — source commit `4128f99` (`fix: separate admin refund decisions from cancellations`) is on `manus/on-live-reconciliation`. |`
- `28: No dispute, cancellation, refund, payment gateway call, wallet or production record was created or changed. The insurance refund queue and `RefundExecutor` remain the only eligible settlement path. Phase 11 requires a reviewer-authorized, s`
### payment_insurance_relevance
- `1: # Phase 8 — Batch AD: admin refund decision integrity`
- `5: The Admin disputes page exposed a **Refund** action but posted the same order `force-cancel` request used for rejection. This could imply a financial settlement when the Backend had only cancelled an order. The actual refund execution is a `
- `11: | Dispute refund button | The refund action no longer calls `force-cancel`. It explicitly blocks direct execution and tells the reviewer to use the approved refund queue, where the server can validate eligibility/payment before any settleme`
- `12: | Dispute rejection button | Rejection still submits the force-cancel decision, but its message explicitly states that it is not a financial refund. |`
- `13: | Existing server boundary | `RefundExecutor` remains the authority for approved refunds: it checks total paid/refunded amount, gateway success where applicable, append-only refund ledger record, patient wallet handling, provider debit/reve`
- `20: | Admin refund decision contract | **PASS** — verifies direct refund branch, approved-queue message and absence of the old conditional success wording. |`
- `22: | Archive integrity | **PASS** — rebuilt Admin archive validates with `unzip -tq`; `node_modules`, `.next`, outputs and coverage are excluded. |`
- `24: | Branch upload | **PASS** — source commit `4128f99` (`fix: separate admin refund decisions from cancellations`) is on `manus/on-live-reconciliation`. |`
- `28: No dispute, cancellation, refund, payment gateway call, wallet or production record was created or changed. The insurance refund queue and `RefundExecutor` remain the only eligible settlement path. Phase 11 requires a reviewer-authorized, s`
### error_empty_loading_retry_cancel
- `5: The Admin disputes page exposed a **Refund** action but posted the same order `force-cancel` request used for rejection. This could imply a financial settlement when the Backend had only cancelled an order. The actual refund execution is a `
- `11: | Dispute refund button | The refund action no longer calls `force-cancel`. It explicitly blocks direct execution and tells the reviewer to use the approved refund queue, where the server can validate eligibility/payment before any settleme`
- `12: | Dispute rejection button | Rejection still submits the force-cancel decision, but its message explicitly states that it is not a financial refund. |`
- `24: | Branch upload | **PASS** — source commit `4128f99` (`fix: separate admin refund decisions from cancellations`) is on `manus/on-live-reconciliation`. |`
- `28: No dispute, cancellation, refund, payment gateway call, wallet or production record was created or changed. The insurance refund queue and `RefundExecutor` remain the only eligible settlement path. Phase 11 requires a reviewer-authorized, s`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
