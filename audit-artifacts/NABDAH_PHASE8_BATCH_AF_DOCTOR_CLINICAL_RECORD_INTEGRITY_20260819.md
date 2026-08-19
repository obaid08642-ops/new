# Phase 8 — Batch AF: doctor clinical-record and communications integrity

## Purpose

The doctor dashboard still mixed operational data with local fixtures and success-only UI. It could substitute wallet balances, transactions, patient chats, pre-visit content and inbound diagnostic reports after a failed request. It also contained an insurance-claim form that generated policy/member values and a Backend request controller that could expose or mutate clinical data without consistently passing through the provider-owned request boundary.

## Source change

| Surface | Implemented control |
|---|---|
| Prescription/lab orders | `GET /provider/requests/:id/orders` now requires `@CurrentUser()` and resolves through `ProviderRequestEngineService.detail()`, which scopes the record to the authenticated provider account. |
| Consultation end | `POST /provider/requests/:id/end` obtains the owned request, requires the canonical in-progress state, stores SOAP/orders only against that owned request, then calls the canonical completion transition before emitting the clinical-order event. The prior logging-only “atomic” assertions were removed. |
| Medical report | The report route resolves the owned request first, derives patient identity/name server-side, rejects a supplied foreign patient ID, and does not honor a caller-selected appointment. |
| Insurance decision | The decision route resolves the owned request, derives service price from its server record, bounds patient copay to that price, requires a verified patient insurance policy, and has no `unknown` policy fallback. The provider client claim form is fail-closed until a verified pending-insurance decision contract is supplied. |
| Wallet and doctor chat | Request failure produces explicit empty/error state. Fixed balances, transaction ledger rows, named chats and optimistic unacknowledged messages were removed. A sent message is displayed only after the server mutation and message refresh succeed. |
| Pre-visit and inbound reports | The fabricated patient attachment and the timeout-created radiology/lab reports with external example URLs were removed. The private report list remains empty until its authorized list contract is implemented. |
| Unapproved integrations | The dashboard no longer claims a Ministry-verified QR, starts a video session with a toast, or presents Google/Apple calendar synchronization as connected. These surfaces are explicit fail-closed states pending their approved contracts. |
| Waiting room | Ping and no-show success feedback now requires an HTTP success response; rejected responses keep error feedback. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend doctor-record contract | **PASS** — 5/5: owned order retrieval, non-progress end rejection, canonical owned completion, foreign-patient report rejection, and missing-policy insurance rejection. |
| Backend regression suite | **PASS** — 59 suites, 356 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release contracts | **PASS** — 16/16, including absence of doctor financial/clinical fixtures and guarded waiting-room feedback. |
| Provider TypeScript | **PASS** — `npx tsc --noEmit`. |
| Provider production web export | **PASS** — Expo web bundle completed. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `595c78f6c484d4e7b47196e77c58c3cb74e22fc766a3b4f7144cd8a0faba3c20`. |
| Provider archive integrity | **PASS** — `unzip -tq`; SHA-256 `f8107760ccd174eb63aa847d24cb1160bbd0ca5ac81abd2774ebb305f4711005`. |
| Branch upload | **PASS** — archive commit `7ea7d4f` (`fix: enforce doctor clinical record ownership`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No patient, report, appointment, insurance decision, wallet record, chat, diagnostic file, calendar connection or call session was read, created or altered in production or sandbox. This source-level result does not authorize clinical reporting, external QR verification, insurance processing, calendar export or video consultations. Phase 11 must run reviewer-authorized sandbox acceptance for cross-provider order/report denial, permitted in-progress completion, patient timeline/notification result, report tracking and private storage boundaries, insurance state/payment propagation, chat delivery/follow-up window, waiting-room rejection behavior, and the legally approved QR/consent/location boundaries.
