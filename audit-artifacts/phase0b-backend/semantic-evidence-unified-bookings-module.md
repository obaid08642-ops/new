# Phase 0B semantic evidence — Unified Bookings module

**Archive member:** `src/modules/unified-bookings/unified-bookings.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 1–249 and 250–462 from the baseline archive extraction.

Lines 1–25 import Nest/Mongoose primitives, auth/idempotency infrastructure, domain schemas/services, workflow engine, cart, and LiveKit. Lines 26–52 define an injectable orchestrator with model/service dependencies across orders, pharmacy, labs, radiology, home-care, appointments, provider profiles, workflow, and calls. Lines 54–58 map public kinds (`pharmacy`, `lab`, `radiology`, `nursing`, `home_care`, `consultation`, `doctor`) to service domains.

Lines 60–100 implement `myTimeline`. It queries six patient-scoped collections using `user.id`, removes `_id`/`__v`, limits each to 50, maps domain states through `toUniversal`, and emits normalized fields including total, title, payment method, insurance status, schedule, account ID, and derived cancel/reschedule booleans. The pharmacy kind is used for both `Order` and `PharmacyOrder`; `total` falls back through `total || subtotal || price || 0`, and payment method falls back to `cash`, which are truthfulness risks if persisted values are absent.

Lines 103–114 implement `getOne`, mapping kind to a patient-scoped query `{id, patient_id:user.id}` and returning `404 booking_not_found` when absent. This is the explicit stranger/non-disclosure path for unified detail. Lines 116–125 delegate cancellation to the domain service. Lines 127–161 implement kind-specific reschedule. Lab/radiology/nursing directly mutate `scheduled_at` after state checks and emit a `service.confirmed` event; consultation delegates to `AppointmentsService`. The radiology allowed-state array repeats `CONFIRMED`, and no slot availability/lock is resolved for lab/radiology/nursing in this method.

Lines 163–180 implement consultation slot resolution against provider existence and server-generated availability. The requested slot is parsed as a date, matched exactly against an availability slot’s `start`, and rejected when unavailable. Lines 182–206 implement patient-web consultation creation. It is explicitly cash-only; any non-cash `payment_method_id` fails closed with `payment_method_not_supported`. The server resolves the slot and delegates creation to appointments.

Lines 208–220 implement owner-scoped consultation cancel/reschedule contracts. Both call `getOne` first, ensuring foreign IDs become 404 before mutation; reschedule re-resolves the server slot. Lines 223–225 delegate call-token issue to LiveKit. Lines 228–249 delegate smart matching to WorkflowEngine with capability/insurance/availability/distance inputs.

Lines 252–298 implement nursing radius broadcast. It tries 3/5/10 km filters, returns an empty result if no provider matches, optionally auto-books cash-only home care, then uses WorkflowEngine to transition a booking to provider assigned and writes provider account/state history. Errors from the transition are swallowed with `.catch(() => null)`, so the response may contain a booking even if assignment transition failed.

Lines 300–397 implement cart checkout across lab, radiology, home-care, doctor, and pharmacy groups. The cart is loaded server-side and rejected when empty. A specified provider is checked for `verified === true`. Group item prices/names are copied from cart lines into service calls; no price revalidation is visible in this orchestrator. Each group is processed in a loop with per-group error capture. Pharmacy requires delivery address lat/lng; unsupported kinds return an error result. If any group fails, already-created successful groups are cancelled using a synthetic system user and the cart is retained; rollback errors are ignored. If all succeed, the cart is cleared per successful kind. This is atomic-ish compensation, not a database transaction.

Lines 399–430 define `UnifiedBookingsController` under `unified-bookings`, guarded by JWT. `GET /mine` reads the patient timeline. `POST /` creates consultation and requires idempotency. `POST /:id/cancel` and `POST /:id/reschedule` are idempotent root consultation mutations; the latter passes `new_slot_id`. `GET /:id/call-token` issues call token. `GET /:kind/:id` reads domain detail. `POST /:kind/:id/cancel` and `PATCH /:kind/:id/reschedule` are idempotent generic domain mutations. `POST /match`, `/nursing-broadcast`, and `/checkout-cart` expose matching, nursing broadcast, and cart checkout; nursing and checkout require idempotency, while match does not.

Lines 432–462 wire domain modules, schemas, controller, and provider. The module registers all six domain models plus provider profile and imports Labs, Radiology, HomeCare, Care, Orders, Cart, WorkflowEngine, and LiveKit modules.

**Auth/ownership:** controller-level JWT guard; `getOne` and timeline queries are patient-scoped. Service delegations must retain user ownership. Synthetic `system` actor is used for rollback and requires audit/authorization review.

**State transitions:** consultation slot availability → create/cancel/reschedule; lab/radiology/nursing direct schedule mutation; nursing match → auto-book → assigned; cart groups → domain bookings/orders → compensating cancellation or cart clearing; call-token issuance is delegated to LiveKit.

**Price/payment/insurance source:** consultation contract is cash-only. Cart item price is copied from cart input into domain calls; provider verification is checked, but server-side price/catalog revalidation is not visible. Insurance is passed through to lab/radiology/matching, but exact eligibility/payment semantics are delegated.

**Security/contract findings:** baseline source contains route/method contracts for generic and root reschedule (`PATCH /:kind/:id/reschedule` versus `POST /:id/reschedule`), a 5-domain orchestrator comment but 6 mapped service kinds including consultation, fallback cash/zero total normalization, direct schedule writes without slot locking for non-consultation domains, swallowed assignment/rollback errors, and non-transactional multi-domain compensation. These are observations only.

**Test implications:** require route/method probes, unauth 401, owner/stranger 404 for every kind, idempotency replay for all mutations, slot availability and concurrency tests, payment-method fail-closed tests, server-price truthfulness tests, cart partial-failure compensation tests, rollback-failure visibility, role/actor audit tests, call-token ownership/expiry, and exact state-machine assertions. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
