# Patient-web parity: pharmacy

Audit: `docs/review/walkthrough/parity-pharmacy.md` (2026-10-16, 38 rows). Verified against `main` on 2026-10-23 and fixed on branch `design/parity-pharmacy`.
Needs-review lines for the blocked rows: `docs/design/needs-review/parity-pharmacy.json`.

Round 2 (2026-10-23): row 14 fixed; row 4 reclassified [owner]. Now 23 fixed, 8 blocked (4, 8, 24, 25, 26, 27, 37, 38) plus the partial parts of 34 and 36.

Result (round 1): 38 rows = 7 already fixed or not a gap, 22 fixed now (rows 34 and 36 only in part), 9 blocked (rows 4, 8, 14, 24, 25, 26, 27, 37, 38). The blocked parts of rows 34 (quantity) and 36 (arrival time, tax) are in the needs-review file too. Blocked by class: different 2 (4, 8), missing 7 (14, 24, 25, 26, 27, 37, 38). Blocked by cause: backend 6 (24, 25, 26, 27, 37, 38), owner 1 (8), new web feature 2 (4, 14).

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | /cart | remove one line | already fixed | per-line trash button (`cart-screen.tsx`, `removeLine`) |
| 2 | /cart/checkout | payment method choice | no gap | the app's checkout (`patient-app/app/pharmacy/checkout.tsx`) has the same cash/insurance segmented; the audit row was wrong. Where coverage is chosen is an owner question, see row 8 |
| 3 | /cart/checkout | pickup note | fixed now | `PharmacyCheckout.pickupNote`; the address card stays, as in the app (pickup still uses the location) |
| 4 | /cart/checkout | change delivery location (map) | partly fixed, blocked [owner] for the draggable pin (decision 2026-10-24: saved list first, add opens the picker; list and current-location/National Address add exist, a map pin needs a library) | a web map picker is a new shared component, needs go-ahead and a board; needs-review |
| 5 | rx-order photo/upload | privacy line | fixed now | `RxUpload.privacy` under the note field |
| 6 | offers / broadcast-status | cancel while offers are listed | fixed now | `CancelOrder` under the offer list |
| 7 | offers / broadcast-status | live refresh | fixed now | `OffersLiveRefresh` active for the whole search (15 s plus the refresh button) |
| 8 | offers / broadcast-status | choose an offer (footer confirm) | fixed (owner 2026-10-24) | coverage is chosen at checkout only; the web offers list has no coverage choice (read-only legend of the order's choice) |
| 9 | offers | notification ask | fixed now | `NotificationAsk` (browser permission, `enableWebPush`), shown while the search is open |
| 10 | final-quote | item lines | fixed now | `quoteLines` from the chosen allocation, drawn above the totals (offers page and final-quote) |
| 11 | payment | order header card | fixed now | order number, pharmacy name, address or the pickup line |
| 12 | payment | started but no provider page | fixed now | the transaction is kept; link to `/payments/result?orderId&ref` |
| 13 | tracking | chat with the pharmacy | fixed now | outline button to `/pharmacy/chat?orderId` |
| 14 | tracking | rate after delivery | fixed now (round 2) | outline button on a delivered/completed order to `/reviews?booking_kind=pharmacy&booking_id=`; the reviews page shows the shared rating form (`PostCallRatingForm` now takes `bookingKind`) sent to `POST /patient-ux/review` |
| 15 | tracking | old-flow order fallback | fixed now | `GET /orders/:id/tracking` when the governed read answers 404 |
| 16 | tracking | pickup order summary | fixed now | pickup / home delivery wording from the order's fulfillment |
| 17 | /orders | service filter | fixed now | `Chip` per service present, after All |
| 18 | /orders | sources of the list | fixed now | `GET /orders/mine` rows added (returns were already listed) |
| 19 | /pharmacy/reorder | what reorder does | fixed now | address card, "Send request" (same single-flight send as checkout, cart untouched), "Add to cart" kept as the second action |
| 20 | /p/[slug] | gallery swipe | already fixed | scroll-snap strip (issue 1547) |
| 21 | /p/[slug] | image zoom | already fixed | `ImageViewer`: pinch, double tap, swipe between pictures |
| 22 | /p/[slug] | share | fixed now | Web Share or copy link |
| 23 | /p/[slug] | suggest a correction | fixed now | form to `POST /medicines/:id/suggest-change` (allowlist entry added); sign-in needed on the web |
| 24 | /p/[slug] | cold-chain chip | blocked [backend] | public product DTO has no `cold_chain` |
| 25 | /p/[slug] | interactions section | blocked [backend] | public product DTO has no `interactions` |
| 26 | /p/[slug] | related products | blocked [backend] | public product DTO has no `related_product_ids` |
| 27 | /c | filters (forms, brands, Rx, price) | blocked [backend] | public category items endpoint takes category, sub, q, page, limit, sort only |
| 28 | /c | hub shortcuts | fixed now | upload-prescription card, favorites, reminders, orders, cart, and the "order again" card (client read, signed-in only) |
| 29 | /wishlist | row actions | already fixed | `WishlistRowActions` |
| 30 | /pharmacy/barcode | find by photo | already fixed | the AI scanner (`POST /ai/scan`) already takes a photo of a pack, barcode or prescription |
| 31 | /medicines/compare | images and product link | fixed now | picture and link per column head |
| 32 | /medicines/compare | lowest-price mark | already fixed | `lowestTag` |
| 33 | /medicines/compare | add to cart | fixed now | `CompareAddButton` per column |
| 34 | rx-order?prescriptionId | Rx number and quantity | fixed now (number), blocked [backend] (quantity) | number drawn; the patient prescription view has no quantity |
| 35 | /orders/[id] | pharmacy name | fixed now | name under "pharmacy order" |
| 36 | payment (CheckoutV2) | pharmacy, arrival time, tax | fixed now (pharmacy), blocked [backend] (arrival, tax) | no field on the order read |
| 37 | tracking (OrderTracking) | courier vehicle | blocked [backend] | no vehicle field on the order's delivery |
| 38 | /p/[slug] | availability and coverage | blocked [backend / owner] | per-patient data on a cached public page, no public endpoint |
