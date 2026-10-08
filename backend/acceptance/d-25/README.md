# D-25 — payment method by service (owner decision 2026-10-06 item 25)

Run: `cd backend && node scripts/run-acceptance.mjs d-25` (needs `redis-server`; builds and starts `dist/main.js`). `live-server.ts` is part of the spec.

1. No cash for online consultations, home doctor visits and home nursing on every booking path (`/care/appointments`, `/unified-bookings`, `/nursing/bookings`, compat `/home-care/bookings`): 400 naming the payment method, nothing stored. Clinic visits keep cash and card.
2. Pharmacy cash on delivery (`/patient/pharmacy/orders/:id/cod/register`) only with no prescription item, no insurance, under the admin cap, a patient with a completed order, and a pharmacy that has not switched cash off; otherwise 400 with "cod" in the code.
3. `PUT /api/v1/admin/payment-rules { pharmacy_cod_max_sar }` (admin, > 0), `GET /api/v1/payment-rules` (public), `PUT /api/v1/provider/pharmacy/cod { enabled }` (the pharmacy itself).

The legacy `POST /doctors/appointments` is not covered: on `main` the write guard already refuses it for every caller (no role declaration).
