# Q-3 — governed pharmacy states ORDER_BROADCASTING, OFFERS_READY, CO_PAY_PENDING

Queue: `docs/review/OPENCODE_QUEUE.md`, Queue A (base `main`). Run: `cd backend && node scripts/run-acceptance.mjs q-3`.

The patient order view (`GET /patient/pharmacy/orders/:id`, `PharmacyOrderService.detail` -> `governed_state`) must say:

| Order | governed_state |
|---|---|
| `broadcasting`, no live offer for this order | `ORDER_BROADCASTING` |
| `broadcasting`, at least one live offer (`submitted`, `quote_expires_at` in the future) | `OFFERS_READY` (back to `ORDER_BROADCASTING` when it expires) |
| partial insurance decision, co-pay not answered | `INSURANCE_DECISION_READY` (unchanged) |
| partial decision, `insurance_decision.patient_acceptance.kind = co-pay`, not paid | `CO_PAY_PENDING` |
| same, `payment_status = paid` (set by the payment finalisation) | `CONFIRMED` |

Documents are seeded exactly as the real flow writes them. The service is built through Nest DI with the real Mongoose module, so the implementation may inject the offer model or repository as it likes. Out of scope (not tested here): card orders after payment still read `FINAL_QUOTE_ACCEPTED`, never `PAYMENT_PENDING`; the order `status` stays `waiting_copay` after the co-pay is paid.
