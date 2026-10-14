# D-26 — cancellation and refund policy (owner decision 2026-10-06 item 26)

Run: `cd backend && node scripts/run-acceptance.mjs d-26` (needs `redis-server`; builds and starts `dist/main.js`; a local fake Moyasar gateway records every refund call, keys generated per run). `live-server.ts` is part of the spec.

- `GET /api/v1/refund-policy` (public), `GET|PUT /api/v1/admin/refund-policy` (admin, validated). Defaults = the owner's table; every value admin-editable; `home_visit.trip_fee_sar` is set by the admin (the test sets 40).
- Every appointment, home-care booking and pharmacy order carries `cancellation.refund_now { percent, amount }`.
- Refunds go to the original payment method (checked as the exact amount the fake gateway receives), never to a wallet.
- Consultation: ≥ 2 h before 100%, otherwise 50%; doctor cancels 100%; one free reschedule up to 2 h before, a second or later one is refused.
- Home nursing: before `IN_TRANSIT` 100%, after it 100% minus the trip fee.
- Pharmacy delivery: before dispatch 100% including delivery; after dispatch (`out_for_delivery`) minus the delivery fee.

Not covered (no path exists yet): provider no-show and call technical-failure refunds; a patient-chosen wallet refund; post-delivery returns (existing returns flow).
