# Phase 8 — Batch R: chronic medication refill integrity

## Purpose

The Patient audit found that a chronic refill created a real pharmacy order but opened the tracking screen without the returned `order_id`. More seriously, the Backend immediately replaced the reminder’s stock with a fixed `30` pills and advanced its date by a guessed 30 days, even though no pharmacy fulfilment had occurred. This batch removes the false state transition and preserves the distinction between **order created** and **medication dispensed**.

## Source change

| Surface | Implemented control |
|---|---|
| Patient tracking handoff | The refill screen accepts tracking only when the server response contains `ok: true` and a non-empty `order_id`, then routes with the real `orderId` parameter expected by the tracking screen. Incomplete responses cannot manufacture a tracking identity. |
| Patient claims | Refill copy now states that pricing, availability, and dispensed quantity are confirmed inside the pharmacy order. It does not claim a local restock, automatic dosage inference, or a changed medication state after order creation. |
| Backend eligibility | Refill requires an owned chronic reminder with a real medicine ID and a valid delivery address. It rejects a manual/non-eligible reminder rather than allowing `OrdersService` to manufacture an unverified medicine record. |
| Duplicate prevention | The service returns an existing pending order on retry and uses a conditional server-side creation lock before creating a new order. The lock is released if order creation fails. |
| Reminder persistence | After a successful order creation, the reminder stores only `refill_pending_order_id`; the previous fixed `pills_remaining: 30` and synthetic next-refill date update were removed. |
| Fulfilment boundary | On verified pharmacy `DELIVERED`, the order transition clears the pending link and records `refill_fulfilled_at`/`order_id`. It deliberately does **not** invent a dispensed quantity or next-refill date, because that requires a separate pharmacy dispensing contract. |
| Radiology regression repair | The full Backend suite exposed an ordering issue in the intentionally disabled legacy radiology raw-URL endpoint. It now checks provider booking ownership before returning the migration error, preserving foreign-provider denial and the raw-URL fail-closed rule. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend health/refill and order-delivery tests | **PASS** — 11 tests across 2 suites. |
| Focused Patient refill contract tests | **PASS** — 2 tests. |
| Full Backend regression suite | **PASS** — 54 suites, 332 tests. |
| Backend production build | **PASS** — `nest build`. |
| Full Patient Jest suite | **PASS** — 17 suites, 47 tests. |
| Patient TypeScript check and production Expo web export | **PASS**. |
| Archive integrity | **PASS** — both rebuilt archives validate with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `a20c70a418386957f7531b3f68a01b64dba6ad25ad88f59a05722b9d5607bbf1` |
| Patient archive SHA-256 | `421a7ef1254ef487d456095a01f9b4403ffe1c3c4cee8538b9d4db411a9bba14` |
| Branch upload | **PASS** — source commit `0633f61` (`fix: preserve chronic refill fulfillment integrity`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No refill, order, payment, inventory record, or patient data was created on production in this batch. The remaining pharmacy acceptance evidence requires a real linked sandbox patient/pharmacy request, a verified pharmacy dispense/quantity contract, payment activation where applicable, lifecycle notifications, and cross-account BOLA checks in Phase 11. Moyasar remains deferred and no deployment was attempted.
