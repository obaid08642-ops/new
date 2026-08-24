# Phase 0B semantic evidence — payments.module.ts

**Archive member:** `src/modules/payments/payments.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–424; full member covered through overlapping reads 1–424 and 261–424.

## Adapters and normalization

Lines 1–19 import Nest/Mongoose, booking schemas, workflow/realtime/fraud/idempotency/auth/crypto dependencies. Lines 21–39 define GatewayAdapter and select Stripe, Tap or Moyasar based on environment keys, failing when none is configured. Lines 42–115 implement adapters: Stripe uses Payment Intents and refunds; Tap uses charges/refunds; Moyasar uses payments/refund. All take `any` options or amount/IDs, have gateway-specific status maps, and return raw gateway data in adapter results. No provider webhook signature verification is implemented in adapters; webhook verification is centralized later for Moyasar only.

Lines 117–121 map booking kinds to models and aliases. Unknown kinds are rejected by normalizeKind/modelFor.

## Ownership and payment intent creation

Lines 123–157 construct PaymentsService and define `assertBookingOwnerOrAdmin` and `assertTransactionVerifier`. These throw BadRequestException `not_authorized` rather than a resource-hiding 404. Ownership compares booking.patient_id to user.id and permits admin; transaction verification permits admin/system. There is no explicit finance/provider role or booking-kind participant policy in these helpers.

Lines 160–217 implement createPaymentIntent: require nonempty idempotency key <=128, load booking, enforce owner/admin, reject already-paid, derive amount from booking total/price/copay/wallet-applied values, reject nonpositive, reuse active transaction, then create an initiating transaction with idempotency_key before calling the gateway. A duplicate-key branch returns active transaction. Gateway failure marks transaction failed and returns safe 502. Success updates initiating→pending with gateway intent/client secret/checkout URL.

This is materially stronger than Paymob: server amount derivation, owner check, active reservation and interceptor exist. However, the create reservation’s uniqueness relies on an index not declared in this module/schema excerpt; the transaction document’s idempotency key is not checked for same-key/different-booking conflict; gateway intent creation can succeed while the post-gateway update fails, leaving an external charge/intent with local initiating state; and retry semantics depend on active row lookup. Insurance/copay and wallet-applied calculations use fields from booking without explicit currency/version/quote expiry validation.

## Verify, retry, refund, capture

Lines 219–264 verifyPayment loads transaction, checks owner/admin/system, calls gateway verify, sets transaction status/charge, and on paid updates booking payment_status, emits completion, realtime notification and fraud detection; on failed records gateway error, emits failure/realtime and checks velocity. The transaction is saved after side effects at lines 262–263 (from the preceding segment); event/realtime failures are not clearly awaited/compensated. Booking payment update is not conditional on expected state and repeated verification can repeat events/side effects.

Lines 266–278 retryPayment checks booking and ownership before cancelling pending/failed transactions, then calls createPaymentIntent. The cancellation update and new reservation are separate, and retry has interceptor metadata but no explicit same-key conflict/replay assertion in this module.

Lines 280–300 refundPayment is admin-only, requires paid/partially_refunded, calls adapter refund, updates local transaction status/refunded_amount/reason, booking payment_status to refunded, emits realtime and returns. It does not enforce amount >0 or amount <= remaining refundable amount; partial amount can exceed the paid balance, and booking status becomes fully refunded even for a partial refund. There is no refund idempotency interceptor or unique refund operation. Gateway success before local save/update can diverge under failure.

Lines 302–336 capturePayment is admin-only and Moyasar-only, calls capture for authorized transactions, saves paid state and booking update, emits events/realtime. It lacks idempotency/conditional atomic claim, amount/status reconciliation with gateway response and failure compensation; concurrent capture can duplicate downstream effects.

## Reads and webhook

Lines 338–349 listForBooking loads booking, returns NotFound if absent, permits patient or admin/finance, and returns transactions. Stranger receives BadRequest `not_authorized`, not 404. No response field minimization is applied.

Lines 351–373 handleWebhook verifies Moyasar HMAC over raw body/JSON fallback, extracts intent, returns no_match for absent local transaction, then calls verifyPayment as synthetic system user. HMAC is a positive control, but there is no event ID/replay ledger, timestamp/age, amount/currency/booking binding beyond local intent lookup, or atomic state transition. Duplicate success webhooks can repeat booking update/events/realtime/fraud checks. Signature header is `moyasar-signature` in controller, distinct from other Moyasar controller naming.

## Controllers and module wiring

Lines 376–390 define JwtAuthGuard PaymentsController routes: POST intent and retry use IdempotencyInterceptor and header; verify, refund, capture and list do not. Refund/capture have no Roles decorator in this controller, but service checks `user.role === 'admin'`; body is inline unvalidated amount/reason. Verify and capture are mutation-like routes without visible idempotency.

Lines 392–405 define public PaymentsWebhookController POST `payments/webhook/:provider`, with rawBody fallback and delegated HMAC. Public access is appropriate only with strict provider signature; unknown/non-Moyasar provider is rejected by service. No payload DTO or replay record exists.

Lines 407–424 register all booking models, controllers, PaymentsService and IdempotencyInterceptor. No schema/index definitions for the required unique active intent or webhook event ledger are present here.

## Findings register candidates

1. **P0 — refund amount/state integrity:** refund lacks remaining-balance validation/idempotency and sets booking fully refunded on partial refund (280–300).
2. **P0 — webhook replay/duplicate side effects:** verified webhook re-invokes verifyPayment without event replay/state guards (351–373).
3. **P1 — capture non-idempotency and multi-write divergence:** capture gateway call/local writes/events are not atomically claimed (302–336).
4. **P1 — intent reservation contract incompleteness:** active uniqueness index is not evidenced in this module, same-key conflict is not checked and gateway success/local persistence can diverge (160–217).
5. **P1 — payment ownership response mismatch:** stranger payment access yields 400 instead of contract-style 404 and list response lacks explicit minimization (338–349).
6. **P1 — webhook/raw payload and DTO hardening:** inline any bodies/raw JSON fallback and no event schema/timestamp/replay record (392–405,351–373).

No product code was changed and no tests were executed during this semantic read.
