# Q-21 — a paid pharmacy order reaches CONFIRMED

Run: `cd backend && node scripts/run-acceptance.mjs q-21` (needs `redis-server`; a local fake Moyasar gateway answers `GET /payments/:id`; keys generated per run). `live-server.ts` is part of the spec.

Payment is confirmed through the real `POST /payments/verify/:txn`.
- Card order with an accepted quote and a payment in progress: `governed_state` = `PAYMENT_PENDING`.
- Card paid: `status` = `confirmed`, `governed_state` = `CONFIRMED`.
- Co-pay paid (partial decision, co-pay accepted): `status` = `confirmed`, `governed_state` = `CONFIRMED`.
- A failed payment changes nothing.

Related: Q-3 (`CO_PAY_PENDING`, governed view), D-13 (no pharmacy available).
