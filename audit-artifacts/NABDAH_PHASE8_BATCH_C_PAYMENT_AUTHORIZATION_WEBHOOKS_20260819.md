# Phase 8 — Batch C: payment ownership and webhook integrity remediation

## Purpose

This batch resolves three confirmed P0/P1 financial integrity gaps: transaction verification accepted generic provider roles, payment retry cancelled existing transaction records before proving the caller owned the booking, and the public payment webhook could mutate payment state without a verified gateway signature.

## Source change

| Surface | Implemented control |
|---|---|
| Intent and retry ownership | The same explicit owner-or-admin guard is applied before intent/retry mutation. Retry now resolves the booking, rejects unknown/foreign/paid booking requests, and only then cancels that booking kind’s pending/failed attempts. |
| Transaction verification | Verification may be triggered only by the transaction owner, an admin, or the internal `system` path reached after signature validation. Generic `provider`, `pharmacy`, and `doctor` roles no longer qualify by role name alone. |
| Payment-history access | Transaction lists are limited to booking owner, `admin`, or `finance`; unrelated operational providers no longer receive payment metadata by generic role. |
| Capture | Capture now requires admin authorization; it no longer accepts generic provider/pharmacy/doctor role claims. |
| Public payment webhook | `/payments/webhook/:provider` now receives the raw request body and `moyasar-signature`; only provider `moyasar` with a configured `MOYASAR_WEBHOOK_SECRET` and exact constant-time HMAC-SHA256 signature reaches payment lookup/verification. Missing secret, missing signature, invalid signature, and unsupported provider fail closed. |

## Verification

| Gate | Result |
|---|---|
| Focused payment regression | **PASS** — `payments-idor.spec.ts`: 1 suite, 11 tests. It covers foreign owner, foreign provider, retry-before-mutation, restricted list, missing signature, valid/malformed HMAC, admin-only refund and safe gateway failure response. |
| Combined Phase 8 regressions | **PASS** — 3 suites, 19 tests across public-care discovery, Realtime room authorization and payment security. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — rebuilt `nabdah-backend.zip` validates with `unzip -tq`; `node_modules`, `dist`, and `coverage` are excluded. |
| Source archive SHA-256 | `c4548f7a51ab38f64f50b72033649366a08c50fedeeb01c133452ae721d24724` |
| Branch upload | **PASS** — source commit `35d5587` (`fix: harden payment ownership and webhooks`) is on `manus/on-live-reconciliation`. |

## Deployment and acceptance limitation

No Moyasar account, credential, secret, live intent, capture, refund or webhook was invoked. This change requires deployment configuration of `MOYASAR_WEBHOOK_SECRET` before any valid production callback can be accepted. The owner’s Moyasar activation remains deferred. Phase 9 must add broader payment/idempotency tests; Phase 11 must use sandbox-only controlled gateway verification once the owner authorizes and configures the provider.
