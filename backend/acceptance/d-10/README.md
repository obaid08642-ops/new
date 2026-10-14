# D-10 — prescription-only rules on the server (owner decision 2026-10-06 item 10, issue #329)

Run: `cd backend && node scripts/run-acceptance.mjs d-10` (needs `redis-server`; the test builds the backend and starts `dist/main.js` on an in-memory MongoDB replica set). `live-server.ts` is part of the spec.

On the canonical pharmacy flow (`/patient/pharmacy/orders` create / PATCH / submit):
1. Rx and controlled are decided from the catalogue (`medicines.requires_prescription`, `medicines.controlled`), never from client flags. A line is a catalogue item when it carries its `medicine_id`, its `sku`, or exactly its `name_ar` / `name_en` (trimmed, case-insensitive).
2. Rx line without a prescription → 400 `prescription_required` no later than submit, no broadcast. A prescription is an attached image/pdf with a `uri`, or the same patient's `prescription_id`.
3. Controlled line → always 400 (code contains `controlled`), even with a prescription; the whole order is refused.
4. A pharmacy cannot quote an Rx line below its listed inventory price (`unit_price_override` lower → 400). OTC keeps the override.
5. A delivered order whose lines are all Rx earns no loyalty points; an OTC order still does.

Out of scope here: coupons have no path into pharmacy orders today; when one is added it must exclude Rx lines. The UI parts (badge, cart notice, "استشر طبيب") are the design session's.
