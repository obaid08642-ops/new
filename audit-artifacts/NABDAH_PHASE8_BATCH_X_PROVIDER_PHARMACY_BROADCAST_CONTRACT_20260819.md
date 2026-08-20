# Phase 8 — Batch X: Provider pharmacy broadcast contract integrity

## Purpose

Two Provider pharmacy broadcast screens listed `/provider/pharmacy/broadcasts` but accepted an order using the separate legacy order-accept route. The broadcast service owns winner locking, notification membership, inventory reservation and allocation materialization; bypassing it produced an incorrect client assumption about accepted state and failed to consume the allocation returned by the authoritative workflow.

## Source change

| Surface | Implemented control |
|---|---|
| Broadcast acceptance | Both live radar and secondary broadcast screens now call `POST /provider/pharmacy/broadcasts/:orderId/i-have-all`, the canonical winner-lock route. |
| Response contract | The UI requires a server-returned allocation ID before considering acceptance successful. It carries the actual order ID and allocation ID forward; no local terminal order state is manufactured. |
| Broadcast identity | The secondary screen resolves `order_id`/nested order ID only, not the broadcast document ID. Rows lacking a valid order identity are not actionable. |
| Rejection | Rejection remains on the canonical broadcast route with an explicit error state. The modal closes in `finally` and clears its local selection only after the attempt, rather than silently swallowing failure. |
| Regression guard | Provider static contracts reject all remaining legacy `orders/:id/accept` strings in the pharmacy dashboard and assert the broadcast allocation response requirement. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend broadcast-service suite | **PASS** — 10 tests. |
| Full Backend regression suite | **PASS** — 54 suites, 338 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release-contract suite | **PASS** — 1 suite, 11 tests. |
| Provider TypeScript check | **PASS** — `npx tsc --noEmit`. |
| Provider production Expo web export | **PASS**. |
| Archive integrity | **PASS** — Provider archive validates with `unzip -tq`; dependencies and build outputs are excluded. Backend archive was unchanged by this client-only correction. |
| Provider archive SHA-256 | `4ade901c3379df4fbbf5cd1e689eaf5ecf6d247ffb95f453ed25270521c39efe` |
| Branch upload | **PASS** — source commit `6836563` (`fix: use pharmacy broadcast allocation contract`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No broadcast, inventory, allocation, order, patient record, or production provider account was changed. Phase 11 must exercise a linked sandbox pharmacy broadcast through listed → rejected → partial → full accept/race → allocation review → dispatch/delivered, checking foreign pharmacy denial, duplicate acceptance, inventory reservation/release and patient/provider notifications.
