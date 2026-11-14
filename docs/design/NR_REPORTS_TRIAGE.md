# Needs-review reports from #1255 / #1256: triage on main (2026-10-18)

Each issue was opened and checked against the code on `origin/main`, not against its old note. Verdict per row.

| Issue | Screen | On main now | Verdict |
|---|---|---|---|
| #519 | web offers: arrival estimate, insurance and COD chips | backend sends `insurance_ready` (null when unknown), `cod_allowed: false`, `approx_delivery` null (no invented ETA) | Fixed on main; no screen change |
| #531 | app payment method choice | backend reads and validates `method` (Q-6, `payments.module.ts:480-486`); the app sends the chosen method and draws only the methods the server advertises (`pharmacy/payment.tsx:94,254`) | Fixed on main (checked 2026-10-18) |
| #368 | app orders: legacy rows with no action | legacy rows still listed without action | **Backend gap** (reviewer) |
| #376 | web: reorder via `/orders/:id/reorder` | BFF route already gone; reorder goes through the cart | Fixed on main |
| #485 | app scan: OCR lines become catalogue entries | backend creates manual entries; no patient review step before saving | **Owner / reviewer decision** (review step is a flow change) |
| #1027 | app scan: empty OCR result | app blocks with "unreadable" and saves nothing (same as web) | Fixed on main |
| #385 | app home-visit tracking: doctor on the way, map | en-route (`PATCH :id/en-route`), position (`POST :id/position`) and the map are on main | Fixed on main |
| #1161 | provider app: "start trip" does not set in-transit | provider-side state logic | **Backend/provider logic** (reviewer); not a screen |
| #399 | web call history: list | no call-record endpoint | **Backend gap** |
| #405 | web appointments: specialty line | list and detail read `specialty_name_en` | Fixed on main |
| #395 | app doctor detail: verified badge, clinic photos, rating bars | `verified` and `clinicPhotos` are on main and used; no rating-distribution field | Partly fixed; **rating bars: backend gap** |
| #401 | web doctors: photo and verified seal | `photo_url` and `verified` sent and read | Fixed on main |
| #953 | admin system-ops: feature switch with no effect | feature flags are read by no client; module switches (#1286) are the real switch | **Owner decision**: remove the feature-flag form from system-ops or keep it labelled |
| #366, #375, #514 | pharmacy name on tracking and final quote | `pharmacy_name_ar/en` on the order detail (#1317); clients read it | Fixed on main |

Re-checked on main at bab83c42 (2026-10-18): no screen in this list has its backend missing on main except the rows marked as backend gaps or owner decisions, so none was built. #531 is fixed on main.

Screens built in this pass: none. Every open row needs a backend change or an owner decision, so no screen was built on mock data.
