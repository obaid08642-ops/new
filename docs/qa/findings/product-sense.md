# Product-sense findings: P0 / P1 / P2 (2026-10-29)

Walked on 2026-10-28 (see `docs/qa/product-sense.md` for the full one-line-per-issue table). Public pages on production by GET only; signed-in screens on the local stack with a test account. Test data (test names, "اختبار", the QA tag on medicine names) is not counted as a product issue.

## P0

| ID | Screen | Finding | Evidence | Fix |
|---|---|---|---|---|
| PS-P0-1 | Map, ar and en | Test and junk providers are visible to patients on the public map: "لنبتبت", "مسينيزيزسزس اال", "د. اختبار ساندبوكس الرياض" (ar); "Sandbox Doctor Riyadh", "Reee riyadh", "sudden riyadh" (en). | `https://nabd.plus/ar/map`, `https://nabd.plus/en/map`. | Unpublish these providers on production (owner decision and an admin action); stop test-name patterns from being approved publicly. |
| PS-P0-2 | Consultation booking (web) | A web visit with a duration cannot be booked: the website sends `duration_minutes`, and the booking route refuses it with 400 `invalid_appointment_payload`. | `patient-web/components-next/booking-flow.tsx:164`; `patient-web/app/api/appointments/book/route.ts:8-28` (`.strict()` without the field). Reproduced on the local stack 2026-10-28; production not tested (no write). | Accept `duration_minutes` in the route schema, or stop sending it from the client. Confirm on production with a read-only check of the code path. |

## P1

| ID | Screen | Finding | Evidence | Fix |
|---|---|---|---|---|
| PS-P1-1 | Labs and nursing lists | Each provider's own price is not shown; the catalogue price is. | `docs/qa/findings/provider-services.md` gaps 1, 2, 7 (local reproduction 2026-10-28). | As in `provider-services.md`. |
| PS-P1-2 | Labs, nursing | Home and insurance filters are ignored by the server. | `docs/qa/findings/provider-services.md` gaps 4, 5, 9. | Add the filters to the endpoints, or filter on the client with the per-provider fields. |
| PS-P1-3 | Diagnostics | Only 21 of 120 lab tests are reachable from `/diagnostics`. | `docs/qa/findings/catalogue-and-entry-points.md` CAT-1. | As in CAT-1. |

## P2

| ID | Screen | Finding | Evidence | Fix |
|---|---|---|---|---|
| PS-P2-1 | Consultations, specialties (ar, en) | Every specialty shows "0 doctors available": a dead end. | `https://nabd.plus/ar/consultations/specialties`, `https://nabd.plus/en/consultations/specialties`. | Show only specialties with a doctor, or give a next step. |
| PS-P2-2 | Medicine catalogue (ar) | An English product name ("Panadol Blue Tablets") on the Arabic page; "Blue Tablets" looks like a test product. | `https://nabd.plus/ar/medicine-catalog`. | Check whether it is test data; if real, add the Arabic name. |
| PS-P2-3 | Medicine catalogue (en) | Arabic form word "جل" on an English card. | `https://nabd.plus/en/medicine-catalog`. | Translate the form name in English. |
| PS-P2-4 | Cart (ar) | "tablet · 500mg" in English inside the Arabic cart line. | Local cart, `/ar/cart`. | Localise the form and strength. |
| PS-P2-5 | Map (ar, en) | City shown in English ("riyadh") on each card. | `https://nabd.plus/ar/map`. | Localise the city. |
| PS-P2-6 | Home (ar) | First load 1.6 s; labs 1.2 s, diagnostics 1.06 s (cold, one run each). | `https://nabd.plus/ar`, `/ar/labs`, `/ar/diagnostics`. | Measure again with several runs before tuning. |
| PS-P2-7 | Labs and diagnostics | No "notify me" for a test with no provider; the cart says "No lab can run this test right now." and stops. | `patient-web/components-next/diagnostics-cart-client.tsx:152`. | As in CAT-5. |
