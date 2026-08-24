# Phase 0B semantic evidence — paymob.service.ts

**Archive member:** `src/modules/payments/paymob.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–97; full 97-line member covered.

Lines 2–6 import axios and Nest Injectable/Logger and define PaymobService. Lines 8–18 `getMethods` returns a fixed three-entry list for mada, Visa/Mastercard and Apple Pay, including icon/label/sub/color; no configuration/database availability, currency, eligibility, outage or region policy is consulted despite the comment.

Lines 20–53 `initiate(payload: any)` requires PAYMOB_API_KEY, obtains an auth token, registers a Paymob order and creates a payment key. Both amount fields use `payload.amount * 100` (33,41); currency is hard-coded SAR, billing_data is caller-provided, items is empty, and integration/iframe IDs come from environment. The method returns a client_secret/payment URL/order ID. There is no booking/order lookup, patient ownership binding, server-authoritative amount resolution, amount finite/range/currency validation, idempotency key or persistence of a local payment intent before/after external calls. Repeated calls can create multiple Paymob orders/payment keys and any caller able to reach the method can control amount/billing payload.

Lines 56–96 `verify(payload: any)` requires PAYMOB_HMAC_SECRET, selects `obj`, requires hmac, concatenates the documented Paymob fields in order and performs timing-safe HMAC-SHA512 comparison. It returns verified/failed and raw transaction data. Signature verification is a positive control, but there is no event ID/replay ledger, timestamp/age check, local payment-intent/order binding, amount/currency comparison, state transition, persistence or settlement/notification side effect. HMAC-authenticated duplicate success callbacks can therefore be accepted repeatedly by downstream callers unless they add idempotent application.

**Findings:**

1. **P0 — client-controlled payment amount/no ownership contract:** initiate uses `payload.amount` directly and accepts `any` billing payload without resolving an authoritative order/booking or patient owner (20–53).
2. **P1 — duplicate payment-intent/order creation:** no idempotency or local unique intent claim surrounds external auth/order/payment-key calls (20–53).
3. **P1 — webhook verification without replay/state settlement:** HMAC is verified but no event replay protection, local intent binding, amount/currency verification or durable state transition exists (56–96).
4. **P2 — payment methods are hard-coded and not availability/eligibility-backed:** `getMethods` returns static methods and UI metadata (8–18).

No product code was changed and no tests were executed during this semantic read.
