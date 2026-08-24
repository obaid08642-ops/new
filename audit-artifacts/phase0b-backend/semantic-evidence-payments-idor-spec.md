# Phase 0B semantic evidence — payments-idor.spec.ts

**Archive member:** `src/modules/payments/payments-idor.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–132; full 132-line member covered.

Lines 2–4 import BadGatewayException and crypto. Lines 5–28 create a regression suite for `PaymentsService` using Object.create and hand-built transaction/order/gateway/realtime/fraud mocks. The suite is distinct from the PaymobService implementation and does not instantiate the PaymobController/PaymobService path directly.

Lines 30–43 test listForBooking: unrelated patient rejects with not_authorized, owner succeeds, and admin staff succeeds. Lines 45–66 test verifyPayment and retryPayment reject an attacker/unassigned provider before gateway or transaction cancellation, and unassigned provider list access is rejected. These are useful service-level BOLA regressions, but they are not HTTP 401/404 contract tests and do not cover Paymob endpoints.

Lines 68–90 test webhook signature behavior for the PaymentsService: absent secret rejects without looking up a transaction; exact raw Moyasar HMAC-SHA256 is accepted; altered signature and wrong provider are rejected. This is positive signature/short-circuit coverage, but no event replay ID, timestamp, local intent binding, state transition or concurrent duplicate callback is tested.

Lines 92–97 test refundPayment rejects provider and pharmacy roles, establishing an admin-only role rule in this service. Lines 99–117 map a gateway failure to a safe 502 response without leaking PSP text. Lines 119–131 test required idempotency key and returning an active intent without a second gateway call. These tests do not prove atomic intent claim, database uniqueness, payload conflict handling, gateway retry/crash reconciliation, amount/currency authority, or duplicate calls racing concurrently.

**Audit judgment:** This is meaningful regression coverage for a separate PaymentsService’s ownership, role, signature, safe-error and basic idempotency behavior. It must not be used as evidence that PaymobController/PaymobService (`payments/paymob`) or Moyasar’s own controller/module has equivalent contract coverage. No HTTP unauth/owner/stranger status matrix, live database, real gateway sandbox, webhook replay ledger or settlement reconciliation is covered.

No product code was changed and no tests were executed during this semantic read.
