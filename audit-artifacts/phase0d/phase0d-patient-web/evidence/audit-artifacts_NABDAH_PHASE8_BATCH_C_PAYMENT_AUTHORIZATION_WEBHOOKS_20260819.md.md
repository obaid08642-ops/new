# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_C_PAYMENT_AUTHORIZATION_WEBHOOKS_20260819.md`
- **Member SHA-256:** `9c6325dbbd26f15c4e158c8478766bb7cd93c1b3a15fd4402a150f4a57741fda`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: This batch resolves three confirmed P0/P1 financial integrity gaps: transaction verification accepted generic provider roles, payment retry cancelled existing transaction records before proving the caller owned the booking, and the public p`
- `11: | Intent and retry ownership | The same explicit owner-or-admin guard is applied before intent/retry mutation. Retry now resolves the booking, rejects unknown/foreign/paid booking requests, and only then cancels that booking kind’s pending/`
- `13: | Payment-history access | Transaction lists are limited to booking owner, `admin`, or `finance`; unrelated operational providers no longer receive payment metadata by generic role. |`
- `21: | Focused payment regression | **PASS** — `payments-idor.spec.ts`: 1 suite, 11 tests. It covers foreign owner, foreign provider, retry-before-mutation, restricted list, missing signature, valid/malformed HMAC, admin-only refund and safe gat`
- `26: | Branch upload | **PASS** — source commit `35d5587` (`fix: harden payment ownership and webhooks`) is on `manus/on-live-reconciliation`. |`
- `30: No Moyasar account, credential, secret, live intent, capture, refund or webhook was invoked. This change requires deployment configuration of `MOYASAR_WEBHOOK_SECRET` before any valid production callback can be accepted. The owner’s Moyasar`
### backend_consumers_or_contracts
- `14: | Capture | Capture now requires admin authorization; it no longer accepts generic provider/pharmacy/doctor role claims. |`
### auth_ownership
- `1: # Phase 8 — Batch C: payment ownership and webhook integrity remediation`
- `5: This batch resolves three confirmed P0/P1 financial integrity gaps: transaction verification accepted generic provider roles, payment retry cancelled existing transaction records before proving the caller owned the booking, and the public p`
- `11: | Intent and retry ownership | The same explicit owner-or-admin guard is applied before intent/retry mutation. Retry now resolves the booking, rejects unknown/foreign/paid booking requests, and only then cancels that booking kind’s pending/`
- `12: | Transaction verification | Verification may be triggered only by the transaction owner, an admin, or the internal `system` path reached after signature validation. Generic `provider`, `pharmacy`, and `doctor` roles no longer qualify by ro`
- `13: | Payment-history access | Transaction lists are limited to booking owner, `admin`, or `finance`; unrelated operational providers no longer receive payment metadata by generic role. |`
- `14: | Capture | Capture now requires admin authorization; it no longer accepts generic provider/pharmacy/doctor role claims. |`
- `21: | Focused payment regression | **PASS** — `payments-idor.spec.ts`: 1 suite, 11 tests. It covers foreign owner, foreign provider, retry-before-mutation, restricted list, missing signature, valid/malformed HMAC, admin-only refund and safe gat`
- `22: | Combined Phase 8 regressions | **PASS** — 3 suites, 19 tests across public-care discovery, Realtime room authorization and payment security. |`
- `26: | Branch upload | **PASS** — source commit `35d5587` (`fix: harden payment ownership and webhooks`) is on `manus/on-live-reconciliation`. |`
- `30: No Moyasar account, credential, secret, live intent, capture, refund or webhook was invoked. This change requires deployment configuration of `MOYASAR_WEBHOOK_SECRET` before any valid production callback can be accepted. The owner’s Moyasar`
### state_transitions
- `5: This batch resolves three confirmed P0/P1 financial integrity gaps: transaction verification accepted generic provider roles, payment retry cancelled existing transaction records before proving the caller owned the booking, and the public p`
- `11: | Intent and retry ownership | The same explicit owner-or-admin guard is applied before intent/retry mutation. Retry now resolves the booking, rejects unknown/foreign/paid booking requests, and only then cancels that booking kind’s pending/`
- `21: | Focused payment regression | **PASS** — `payments-idor.spec.ts`: 1 suite, 11 tests. It covers foreign owner, foreign provider, retry-before-mutation, restricted list, missing signature, valid/malformed HMAC, admin-only refund and safe gat`
- `30: No Moyasar account, credential, secret, live intent, capture, refund or webhook was invoked. This change requires deployment configuration of `MOYASAR_WEBHOOK_SECRET` before any valid production callback can be accepted. The owner’s Moyasar`
### payment_insurance_relevance
- `1: # Phase 8 — Batch C: payment ownership and webhook integrity remediation`
- `5: This batch resolves three confirmed P0/P1 financial integrity gaps: transaction verification accepted generic provider roles, payment retry cancelled existing transaction records before proving the caller owned the booking, and the public p`
- `13: | Payment-history access | Transaction lists are limited to booking owner, `admin`, or `finance`; unrelated operational providers no longer receive payment metadata by generic role. |`
- `15: | Public payment webhook | `/payments/webhook/:provider` now receives the raw request body and `moyasar-signature`; only provider `moyasar` with a configured `MOYASAR_WEBHOOK_SECRET` and exact constant-time HMAC-SHA256 signature reaches pay`
- `21: | Focused payment regression | **PASS** — `payments-idor.spec.ts`: 1 suite, 11 tests. It covers foreign owner, foreign provider, retry-before-mutation, restricted list, missing signature, valid/malformed HMAC, admin-only refund and safe gat`
- `22: | Combined Phase 8 regressions | **PASS** — 3 suites, 19 tests across public-care discovery, Realtime room authorization and payment security. |`
- `24: | Archive integrity | **PASS** — rebuilt `nabdah-backend.zip` validates with `unzip -tq`; `node_modules`, `dist`, and `coverage` are excluded. |`
- `26: | Branch upload | **PASS** — source commit `35d5587` (`fix: harden payment ownership and webhooks`) is on `manus/on-live-reconciliation`. |`
- `30: No Moyasar account, credential, secret, live intent, capture, refund or webhook was invoked. This change requires deployment configuration of `MOYASAR_WEBHOOK_SECRET` before any valid production callback can be accepted. The owner’s Moyasar`
### error_empty_loading_retry_cancel
- `5: This batch resolves three confirmed P0/P1 financial integrity gaps: transaction verification accepted generic provider roles, payment retry cancelled existing transaction records before proving the caller owned the booking, and the public p`
- `11: | Intent and retry ownership | The same explicit owner-or-admin guard is applied before intent/retry mutation. Retry now resolves the booking, rejects unknown/foreign/paid booking requests, and only then cancels that booking kind’s pending/`
- `21: | Focused payment regression | **PASS** — `payments-idor.spec.ts`: 1 suite, 11 tests. It covers foreign owner, foreign provider, retry-before-mutation, restricted list, missing signature, valid/malformed HMAC, admin-only refund and safe gat`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
