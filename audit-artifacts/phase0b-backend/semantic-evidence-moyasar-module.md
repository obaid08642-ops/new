# Phase 0B semantic evidence — moyasar.module.ts

**Archive member:** `src/modules/moyasar/moyasar.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–475; full member covered through overlapping reads 1–475 and 372–475.

## Schemas and service setup

Lines 1–25 import Nest/Mongoose/auth/idempotency/event/crypto dependencies. Lines 29–58 define MoyasarPayment in `moyasar_payments` with booking_id/kind/patient_id, SAR amount, status, gateway/source/raw response and refund fields; indexes cover booking/status, patient/time and sparse moyasar_id. There is no unique booking-level pending-payment index or explicit refund-reference/idempotency field.

Lines 62–78 initialize MoyasarService from environment API keys. Missing API key logs a warning and permits sandbox/dev mode (74–77), which is operationally useful but dangerous if production configuration can be absent without an environment gate.

## Server-authoritative booking amount and create payment (lines 80–219)

Lines 80–112 resolve booking collection and amount fields by booking kind, find by `id`, require a positive amount and return patient identity. Lines 122–142 createPayment re-resolves amount unless skipBookingValidation is set, checks patient ownership if booking stores patient/user id, and rejects nonpositive amount. Lines 148–153 return an existing initiated/authorized payment for the booking to avoid duplicate charges.

Lines 155–169 construct SAR/halalas request and include booking/patient metadata; source is hard-coded creditcard with comment that frontend overrides, but the controller does not expose source metadata. Lines 171–202 call Moyasar when API key exists, otherwise create a sandbox payment with a `nabd://` transaction URL. Lines 204–218 persist the payment after gateway success. The lookup-before-create is not an atomic unique claim, so concurrent create calls can both charge before either pending row exists; IdempotencyInterceptor is present at controller level but exact key binding/replay storage is not evidenced here. `skipBookingValidation` is an internal escape hatch and must never be reachable from an untrusted controller.

## Sync and refund (lines 221–311)

Lines 221–260 sync payment by moyasar_id, calls gateway when non-sandbox, maps statuses, saves fields and swallows sync errors after logging (255–257), returning potentially stale data as success. It does not verify that the caller owns the payment; controller sync endpoint passes only gateway ID.

Lines 263–310 refundPayment supports sandbox local mutation or real Moyasar POST refund. It does not validate amount against payment amount/refunded_amount before gateway request, does not enforce partial-refund bounds, and has no refund idempotency key. After gateway success it marks status `refunded` regardless of partial amount and adds amount to refunded_amount, with an emitted event actor hard-coded to `admin` (300–304). Database save failure after gateway success can cause retry divergence.

## Webhook and reads (lines 313–370)

Lines 313–332 verify HMAC-SHA256 with timing-safe compare; in production missing secret fails closed, while nonproduction missing secret returns true. Lines 334–342 handle webhook by extracting payment ID and calling sync, then returns `{ok:true}` even with missing ID or sync failure; it does not persist event id/replay state, verify event type/timestamp, or atomically apply status transition.

Lines 344–350 get payments by booking with projection excluding `_id`/`__v`, but service itself does not enforce owner. Lines 352–369 list patient payments with pagination parameters but no bounds/clamping for page/limit; controller always uses defaults and has no query exposure.

## Controller and module wiring (lines 372–475)

Lines 374–401 expose POST `moyasar/payments` under JwtAuthGuard and IdempotencyInterceptor. The inline body type includes client amount, but service re-resolves booking amount unless internal skip flag is used. There is no visible DTO validation for booking_id/kind/amount/description/callback URL.

Lines 403–412 expose booking payments under JwtAuthGuard. Ownership is checked after fetching all payments: non-admin is forbidden if any payment’s patient_id differs from user.id. This can leak existence/data for a stranger’s booking through the fetched result/error distinction, and does not first resolve booking ownership; an empty booking result can return 200 to any authenticated user. It also uses ForbiddenException (403) rather than the contract’s possible 404 resource-hiding rule.

Lines 414–419 expose authenticated patient payment history. Lines 421–425 expose authenticated sync by arbitrary moyasarId with no explicit payment ownership check before service sync; any authenticated user who guesses a gateway ID may cause a sync/read of another user’s payment status.

Lines 428–441 restrict refund endpoint to JwtAuthGuard + Roles(UserRole.ADMIN), addressing the documented prior privilege issue. However, body is `{amount?: number}` without DTO/range/currency validation and no idempotency interceptor; the service lacks partial-refund bound enforcement.

Lines 443–453 expose public webhook with HMAC verification and rawBody fallback to JSON.stringify(body). If raw body middleware is absent, signature verification may fail for valid signatures over the original bytes; there is no replay event ledger. Lines 455–460 expose a public callback returning success without validating state, payment identity, or initiating synchronization; it is an acknowledgment only and must not be treated as payment confirmation.

Lines 463–475 register the schema/controller/service. No unique pending-payment index, webhook event collection, transaction/outbox, or explicit payment/refund idempotency storage is wired in this module.

## Findings register candidates

1. **P0 — payment creation race:** existing pending lookup precedes gateway charge/persistence without atomic uniqueness; concurrent/replayed creates can double-charge (148–218).
2. **P1 — payment read/sync ownership gap:** booking payments are fetched before ownership filtering and sync accepts arbitrary gateway ID without owner verification (403–425).
3. **P1 — refund bounds/idempotency gap:** partial refund amount is not checked against paid/refunded amounts and no refund idempotency is visible; gateway success/database failure can diverge (263–310).
4. **P1 — webhook replay/error truthfulness gap:** HMAC is verified, but event replay/state transition/idempotent application is absent and handler returns ok for missing/sync-failed events (313–342, 443–453).
5. **P2 — production configuration/sandbox fallback:** missing API key enables sandbox behavior based on configuration absence, with no production hard stop in constructor (74–77,190–202).
6. **P2 — public callback is non-authoritative:** callback returns success without payment verification and must not be used as paid proof (455–460).

No product code was changed and no tests were executed during this semantic read.
