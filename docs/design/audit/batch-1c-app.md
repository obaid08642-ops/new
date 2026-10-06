# Batch 1, slice 1c, patient-app: per-screen element audit (pharmacy offers, high effort)

Screens: `/pharmacy/broadcast-status` (`app/pharmacy/broadcast-status.tsx`, board PharmacyOffers), `/pharmacy/final-quote` (`app/pharmacy/final-quote.tsx`, the same board's offer card and sticky bar; there is no board of its own) and the `/pharmacy/waiting-for-pharmacy` redirect (`app/pharmacy/waiting-for-pharmacy.tsx`). Branch `wip-b1c-app` from `design/batch-1`. Paths are relative to `patient-app/`. Shared pieces: `src/components/pharmacy/OfferKit.tsx` (hero, offer card, notice, money, quote lines), `src/utils/pharmacyOffers.ts` (reads the server answers; nothing in it computes a price). Needs review (NR) = `docs/design/needs-review/batch-1c-app.json`. Runtime: `runtime-batch-1c-app.md`.

Source values: `API <METHOD> <path> field <name>` · `user input` · `static copy` (a key of `src/i18n/locales/*.json`, all six languages, read with `useScreenUi().k`) · `derived` (a comparison or a format of server values, never a new price).

**High-effort rules kept.** Offer prices, delivery fees, subtotals, totals, expiry and the accepted state are the server's numbers, formatted with `Intl` (`useScreenUi().money / num`); no total is added up, no fee guessed. A field the server does not send is not drawn. Choosing an offer and accepting a quote are mutations: one explicit confirm, the control is disabled while pending (and a synchronous guard stops a second tap before the next render), a retry after "no answer" sends the same idempotency key, a refusal shows a sentence mapped from the server code (never the raw text), no success is shown unless the server answered. Expired, cancelled, never-sent, ended-without-offers and failed states use the board's state components (`EmptyState`, `ErrorState`, `OfflineState`).

Backend (grep-checked): `backend/src/modules/pharmacy/pharmacy.controllers.ts` `PatientPharmacyController` lines 28-56: `GET orders/:id/offers` (42), `POST orders/:id/offers/:offerId/select` (43), `GET orders/:id` (36), `POST orders/:id/cancel` (39), `POST orders/:id/final-quote/accept` (47), `POST orders/:id/cod/register` (51). Offer fields: `pharmacy-offer.service.ts` `listForPatient` / `patientDtoAsync` (lines 264-310). Order state: `pharmacy-order.service.ts` `detail` / `governedView`.

## 1. `/pharmacy/broadcast-status`

Params: `orderId` (what every caller sends: checkout, request, reorder, order-history, order-confirm) or the older `requestId`. **Defect fixed:** the screen read only `requestId`, so after a broadcast it said "order id unavailable" (see NR last entry).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Header title "عروض الصيدليات" + back | header | static copy | `router.back()` (pharmacy tab if no history) | broadcast-status.tsx:221 |
| Hero: storefront on the pulse (two rings; still when the OS reduces motion or the search is over) | hero | static; board geometry | none | OfferKit.tsx (OfferHero) |
| Hero title "نبحث في الصيدليات القريبة" | text | static copy | none | broadcast-status.tsx:300 |
| Hero line "العروض الواصلة: N" / "لم تصل عروض بعد" | text, live region | count of the open offers of `GET .../orders/:id/offers` | none | :302 |
| Range line "3 / 5 / 8 km" and the three round bars (board) | not drawn | no patient endpoint sends the broadcast radius or round (NR) | none | |
| Sort control (lowest price / nearest / fastest) | segmented | derived: sorts by `totals.total`, `approx_distance_km`, `preparation_minutes`; an option appears only if some offer has that number; an offer without it goes last | none | :318 |
| Offer card: tile with storefront glyph (board "[شعار]") | icon | static; the API has no logo | none | OfferKit.tsx (PharmacyOfferCard) |
| Pharmacy name | text | `pharmacy_name_ar` / `pharmacy_name_en` by reading language; generic "صيدلية" when the server sent none (NR) | none | |
| "1.5 km away · ready in about 20 min" | text | `approx_distance_km`, `preparation_minutes`; each only when present; the constant `approx_delivery` is not drawn (NR) | none | |
| Chip "الأقل سعرًا" | chip | derived: the lowest `totals.total` among open, unexpired offers, only when there are two or more | none | :`lowestPriceIds` |
| Chip "كل الأصناف متوفرة" / "N من M أصناف متوفرة" | chip | `lines[].available` | none | |
| Chip "يقبل التأمين" (board) | not drawn | `insurance_ready` is a constant true (NR) | none | |
| Countdown "ينتهي العرض خلال mm:ss" / chip "انتهت صلاحية العرض" | text / chip | `expires_at` (= `quote_expires_at`) minus the phone clock, once a second; at 0 the card is disabled and the list is read again (NR: clock skew) | none | :119-136 |
| "عرض الأصناف" toggle (44 tall) | button | static | expands the lines | |
| Lines: name × qty, "In stock / Not available", unit price, "alternative offered", pharmacy note | rows | `lines[]`: `name`, `offered_qty`, `available`, `unit_price`, `alternative`; `provider_note` | none | OfferKit.tsx (LineRows) |
| Total label "الإجمالي شامل التوصيل" / "إجمالي العرض" | text | static; the first only when `totals.delivery_fee` > 0 | none | |
| Total amount | text | `totals.total`, `totals.currency` (SAR drawn as "ر.س"); "السعر غير متاح" when absent and the card cannot be chosen | none | |
| "التوصيل: X" | text | `totals.delivery_fee`, only when > 0 | none | |
| "اختر" button (46 tall, ink, grows with the label) | button | static; disabled when expired, pending or without a total | marks the card (second tap clears); nothing is sent | :320 |
| Confirm bar (sticky): "عرض {name}" + total | text | the chosen offer's `totals` | none | :272 |
| Coverage control "دفع مباشر / بالتأمين" | segmented | user input; default from the order (`payment_mode` or `payment_method` = insurance); insurance disabled only if the server says `insurance_ready` false | sent as `coverage_mode` | :280 |
| "لا يتم أي دفع عند تأكيد الاختيار" | text | static | none | |
| "تأكيد هذا العرض" (becomes "حاول مرة أخرى" after a refusal) | button | static; loading and disabled while pending | `POST /patient/pharmacy/orders/:id/offers/:offerId/select` `{coverage_mode}` + `Idempotency-Key`; success: `router.replace /pharmacy/order-tracking {orderId, selectedOfferId}` (unchanged) | :168 |
| Refusal notice | alert | server code mapped to a sentence (unavailable, stock, prescription for insurance, session ...) | after "offer gone" codes the list is read again and the choice cleared | :282, :307 |
| Privacy line "لن نشارك عنوانك أو رقمك ..." | text | static (board copy) | none | :333 |
| "إلغاء الطلب" (outline) | button | static; shown while the order is searching or in review | confirm alert, then `POST /patient/pharmacy/orders/:id/cancel {reason:'patient_requested'}`, then the pharmacy tab; failure shows a notice | :196, :208 |
| Refresh (pull down; "تحديث العروض" when none) | gesture / button | static | re-reads both GETs; also every 20 s while searching and on focus | :104, :314 |
| "تعذر تحديث العروض" notice | alert | a later refresh failed; the data on screen is kept | retry | :306 |
| States: loading (skeleton), offline, error, no order id, cancelled, offer already chosen, draft (not sent), review (search ended), searching with none | states | `GET .../orders/:id` `status`, `selected_offer_id`, `governed_state`; failures of the offers call | retry, order list, pharmacy tab, or `postSelectionRoute` (final-quote / insurance-decision / order-tracking, the same split as the order list) | :226-259, :310 |

## 2. `/pharmacy/final-quote`

One call: `GET /patient/pharmacy/orders/:id`. `governed_state` decides what the screen offers; the amounts are the snapshot's own `totals`.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Header "السعر النهائي" + back | header | static | back | final-quote.tsx:152 |
| Status chip "تم قبول السعر" / "سُجّل الدفع عند الاستلام" | chip | `governed_state` FINAL_QUOTE_ACCEPTED / COD_REGISTERED | none | :187 |
| Heading (review / accepted / cod) | text | static by state | none | :189 |
| Lines: name × qty, unit price, "صنف بديل", "غير متوفر" | rows | `allocations_detail[]` of `selected_allocation_id`: `name`, `qty_offered`, `unit_price`, `action` | none | OfferKit.tsx (QuoteLines) |
| "الأصناف" subtotal, "التوصيل", "الإجمالي" | rows | the snapshot's `totals.subtotal`, `delivery_fee` (only > 0), `total`, `currency`; the pending snapshot when FINAL_QUOTE_READY (unreachable today, NR) | none | :195-197 |
| "لا يتم أي دفع قبل قبول هذا السعر النهائي ..." | text | static | none | |
| Sticky bar: total + "قبول السعر النهائي" | text + button | only for OFFER_SELECTED / FINAL_QUOTE_READY with hash, integer revision and a total >= 0; disabled while pending | `POST .../final-quote/accept {quote_hash, quote_revision}` of the snapshot + `Idempotency-Key` (same key on a retry after no answer); then the order is read again | :157, :90 |
| "ادفع إلكترونيًا" | button | static; shown once the server accepted the quote (**new**: it was unreachable, see NR) | `router.push /pharmacy/payment {orderId}` | :206 |
| "الدفع عند الاستلام" + note | button + text | shown only when `coverage_mode` is cash and `accepted_quote_snapshot.cod_allowed` is true; disabled while pending | `POST .../cod/register`, then `router.replace /pharmacy/order-tracking` | :209 |
| "حالة الطلب" | button | static | `/pharmacy/order-tracking` | :219 |
| Error notice | alert | server code mapped (quote changed, insurance flow, accept first ...) | retry | :159, :223 |
| States: loading, offline, error, no order id, cancelled, no quote to accept | states | `governed_state`; failures | retry, order list, pharmacy tab, order status | :126-148 |

## 3. `/pharmacy/waiting-for-pharmacy` (redirect)

Lands on `/pharmacy/broadcast-status` with `orderId` (from `orderId`, or the older `requestId`), which reads the order's own state (searching, offers in, already chosen, cancelled). Before it passed `requestId` to a screen that is now also reading `orderId` first; with no id it used to open an offers screen with nothing to show, now it opens `/pharmacy/order-history`. Checked: no other app file links to it (grep), only deep links and old notifications can.

## Colours, translation, layout

- Raw colours in the three screens, `OfferKit.tsx` and `pharmacyOffers.ts`: 0 (hex, rgb and named). `final-quote.tsx` had 3 and was removed from the `no-raw-color` baseline (8139 -> 8136). Tones come from `SERVICE_ICONS.pharmacy.tone` and the status/service tokens; the pulse ring is the coral service solid at 25 %.
- Literals: 0 in the touched files (`no-literal-ui-string --changed origin/design/batch-1`); 96 keys `pharmacy.offers.*` / `pharmacy.quote.*` in ar, en, ur, hi, bn, tl with the same `{slots}`; `locale-parity --base origin/design/batch-1`: no new problem.
- Buttons grow with their label (minimum heights, no fixed widths, no `numberOfLines` on a label); numbers, money and the countdown through `Intl`; the back chevron mirrors in RTL (shell); logos and check marks do not.
- Reduced motion: the pulse is not drawn when the OS asks for less motion.

## Board deviations and data not drawn

Range line and round bars, delivery time, "accepts insurance" chip, pharmacy logo (neutral tile instead), final-quote pharmacy name: all because the backend sends no real value (NR). Added beyond the board, from real data: the lines toggle, the expiry countdown, the confirm bar with the coverage choice, the state screens. The board's "تم الاختيار" green button is drawn as "محدد" with a check, because nothing has been done on the server at that point.

## Mock / placeholder found

`node tools/design/screen-inventory.mjs` (mock-scan): 0 hits in the three screens and the new components (the old screens carried none either; their `Math.random` idempotency keys are replaced by `newIdempotencyKey` and the stable keys of `idemKey`). The only fixtures are in `tools/design/render-native-screen.fixtures.json` (TEST values, never read by shipped code) and in the jest test.

## Tests

`src/utils/pharmacyOffers.test.ts` (25) and `src/__tests__/pharmacy/offers-screens.test.tsx` (24): server totals and fee drawn as sent, countdown from the server expiry, one request on a double tap with the pending control disabled, same key after no answer and a new key after a server answer, real sentence on refusal (no success, control back), expired offer disabled, accept sends the snapshot's own hash and revision once, cash on delivery only when allowed, each real state, error state with retry, redirect targets. No old test was changed or removed (there were none for these screens).
