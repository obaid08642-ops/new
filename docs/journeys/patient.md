# Patient journey audit (read-only), 2026-10-08

Branch `design/journeys-patient` (main with Batches 1 to 12; Batch 14 merges and Emergency are NOT done). Problems: `docs/design/needs-review/journeys.json` (86 lines, sorted by scenario, each with the exact client file:line). Nothing was fixed.

**How it was walked.** Web: production build of this worktree behind the nonce server (:4101) and the fault proxy (:4100) on the seeded backend, driven with Playwright at 390 (ar, ur, en) for the screens below. App: cannot run here; each scenario was followed by reading the screen code and every `router.push/replace/Redirect` target, a static link check of both clients (every in-code `/route` resolves to a page; only stale links that next.config redirects remain), `runtime-check-api.mjs` for Batches 1 to 7 (0 failures in 7 runs) and one render (`render-native-screen`, pharmacy cart/checkout empty states).

**Environment limits that blocked live steps (not product defects):** the seeded catalogue is empty (no browse/add: the cart was filled with TEST lines through localStorage); the backend's MongoDB is not a replica set, so `POST /patient/pharmacy/orders/:id/submit` answers 500 ("Transaction numbers are only allowed on a replica set member") and no order ever reaches offers; 0 published doctors and no lab able to run a test; OCR answers 503. Test data created: one address "TEST عنوان" and 3 draft pharmacy orders of the seeded patient.

| Scenario | Completed live (web) | Completed by code only | Blocked at | Problems |
|---|---|---|---|---|
| 1 Guest OTC order to tracking | no | app and web steps 5 to 9 | web live: step 5 (submit 500 in this env); step 1 (empty catalogue) | 17 |
| 2 Rx upload, offers, insurance | no | yes (app + web) | live: step 2 (OCR 503) | 8 |
| 3 No Rx, consult, prescription, order | no | partly | step 2 ("استشر طبيب" does not exist); live step 3 (no doctor) | 17 |
| 4 Clinic booking, cancel, reschedule, refund | no | yes | live: step 1 (no bookable doctor) | 7 |
| 5 Home lab, result, "ناقش النتيجة مع طبيب" | no | yes | live: step 3 (no compatible lab); step 6 (button does not exist) | 11 |
| 6 Home nursing booking and visit | no | app yes | web: step 2 (no booking on web, by design of the page) | 7 |
| 7 Family reminders, missed-dose alert | steps 1 to 3 (own reminders form, family hub) | yes | step 4 (no reminder for a member), step 6 (alert never fires) | 4 |
| 8 Item not in catalogue, offer, price review | request form opened, no send | yes | step 1 (no entry from the empty catalogue); live: submit 500 | 5 |
| 9 Payment failure, connection loss | send failure, double tap, offline send, offline navigation | payment result, app | gateway not reachable here | 3 |
| 10 ur (RTL) and en | 24 routes in ur, 19 in en | app by code | none | 7 |

Top-line facts: no step "استشر طبيب", "ناقش النتيجة مع طبيب" or the cart-filling "اطلب الأدوية دي" (web) exists; web cannot book nursing, read doctor chat or open a lab report; web refund text is hard-coded and wrong against decision 26.

---

## Scenario 1: guest OTC order to tracking
1. **Browse** `/{locale}/c` (app: Pharmacy tab). Expect product grid. Found: empty catalogue in this env, state is fine ("no products"); the empty/search state offers no "request by name" (problem 8.1).
2. **Add to local cart** product page BuyBar/BuyActions. Expect a local line, no request. Found by code: local only, "added to cart" line; no Rx notice (decision 10); the bar shows a catalogue total while the cart says prices come from offers.
3. **Cart** `/cart` (live, guest, 2 TEST lines). Expect lines, qty stepper, request button. Found: works offline too (qty changed with the network off); Rx line shows "needs prescription" banner with Upload only.
4. **Send** "اطلب عروض الصيدليات" -> `/cart/checkout`. Guest is redirected to `/login` (live); after sign-in the patient lands on `/dashboard`, not the checkout; the cart is kept and merged into the account (live). Checkout (signed in, with the TEST address): delivery/pickup, "direct payment" or "insurance", summary without price.
5. **Submit** POST orders then `/submit`. Live: create 201, submit 500 (env), message "service unreachable, order will not be sent twice"; cart kept; retry reuses the idempotency key (no second order: 2 sends and a double click made one order).
6. **Offers** `/pharmacy/broadcast-status?orderId=` (live with a stuck order: "no offers yet", 15 s countdown, refresh button, no cancel). By code: offer cards (price, delivery, expiry, insurance/COD chips), select.
7. **Accept price** after select the broadcast variant replaces to `/orders/:id/tracking?selectedOfferId=` which ignores the parameter and has no next button (app has one); the quote step is `/pharmacy/final-quote` or inline on `/orders/:id/offers`.
8. **Pay** inline method buttons (offers page) or `/pharmacy/payment` (two UIs); gateway; `/payments/result` (checks the order then the transaction; success only on "paid").
9. **Tracking** `/orders/:id/tracking`: timeline from server steps, courier phone, 30 s refresh. Live with a ready_for_split order: status "قيد التجهيز" and "order accepted" step although nobody accepted.

## Scenario 2: Rx upload with offers and insurance
1. Cart with an Rx line or `/pharmacy/scan-prescription` (guest goes to login). 2. Choose photo (camera/photos, one image only). 3. "احفظ الوصفة وتابع": OCR then save. Live: OCR 503 -> "could not analyse the image", no way on (problem 2.1). 4. `/pharmacy/rx-order?prescriptionId=` lists the lines, address, send (no pickup, no insurance choice). 5. Offers with a per-offer coverage radio (insurance only if the offer is insurance-ready). 6. Insurance request page (`/pharmacy/insurance-decision`, `/insurance/requests/:id`): relay-only text is correct (en: "Nabd does not contact your insurer"). 7. Co-pay or self-pay, pay, tracking. Steps 4 to 7 by code. The app differs: cart with an Rx line goes to rx-order first, the checkout has no insurance choice.

## Scenario 3: no Rx, "استشر طبيب", video consultation, prescription, "اطلب الأدوية دي", cart
1. Cart with Rx item. 2. **"استشر طبيب": the button does not exist** in web or app (cart banner, checkout banner, product page all offer only upload). 3. Doctors `/consultations/doctors` (live: "no results", no action). 4. Booking `/consultations/book/:id` (live with a seeded doctor id: form shown under "الطبيب غير متاح"; cash hidden for video/home, correct; home visit asks for typed lat/lng). 5. Pay by card on `/appointments/:id` (payment block), call from the same page (token launcher) -> video-call -> post-call rating. 6. Summary `/appointments/:id/summary`: follow-up and order buttons point to wrong targets. 7. Prescription: web "اطلب الأدوية دي" goes to rx-order (broadcast); the app fills the local cart and opens it (decision 18 as written), skipping hand-written lines. 8. Chat: web thread is activity-only; app chat is text only and can be opened without a booking from a push.

## Scenario 4: clinic booking, cancel, reschedule, refund
1. Book (as 3.4; clinic offers cash). 2. Appointment page: status, cancel (reason), reschedule form, call. 3. List "edit" opens `/consultations/cancel-reschedule`: second cancel/reschedule UI with a refund computed on the page from 24 h / 12 h (decision 26 says 2 h, one free reschedule, text from server). The app reads the server policy (still computes the percentage on device). 4. After cancel the web gives no refund figure; app alert shows `consult.cancel.doneRefund`. 5. Card payment result for a consultation lands on pharmacy "my orders". Walked by code only (no bookable doctor).

## Scenario 5: home lab, result, "ناقش النتيجة مع طبيب"
1. `/diagnostics` hub (live, seeded packages and tests, prices, filters place/pay). 2. Package or test -> "book" (`/diagnostics/labs/book`) or "add to my order" (`/diagnostics/cart`): live both stop at "no lab available". 3. Checkout, success, bookings, sample/technician tracking (by code). 4. Result: web booking page shows "report ready" without a link; app opens `/reports/view-report`. 5. **"ناقش النتيجة مع طبيب" is absent** everywhere (decision 19).

## Scenario 6: home nursing booking and visit
1. Dashboard "تمريض" -> `/nursing/catalog` (live, 8 services, duration shown as raw "1 hour"). 2. Service page `/home-care/services/:id`: read-only, no booking (web dead end; `/nursing/booking` redirects to the catalogue). 3. App: service-info -> providers -> nurse-profile: address, date/time, card or insurance; POST booking, payment intent, `/payments/result`, live-tracking. A failed intent still ends on tracking of an unpaid booking. 4. Visits `/nursing/visits` (empty live). 5. `/home-care` hub lists non-nursing bookings as "unavailable" rows (live).

## Scenario 7: family reminders and missed-dose alert
1. Own reminders `/health/medications` (live): add form has name, dose, comma-separated times, frequency, chronic; no member. 2. `/family` (live): hub, one member, requests, calendar, chat, emergency contacts; two identical "إضافة فرد" links. 3. Member page: the member's active medicines, read-only. 4. Reminder for a member: not possible. 5. Mark taken: only for your own pending doses. 6. Missed-dose alert: backend `medication.missed` is never emitted and its handlers notify only the patient; no family recipient, no client UI.

## Scenario 8: item not in catalogue, manual request, offer, price review
1. Catalogue search with no result: no action (web). Entries to `/pharmacy/request` exist only in the app cart, barcode screen, reorder picker and failed OCR; three old URLs redirect to it. 2. Form: name (min length) + details, address; no photo, no quantity. 3. Submit (create + submit, idempotent). 4. Offers as scenario 1 step 6. 5. Price review: final-quote shows server totals; there is no "price not verified" state (decision 12).

## Scenario 9: payment failure and connection loss (live on web)
- Send with backend 500 on submit: message shown, cart kept, order not duplicated (1 order after 2 sends + double click); misleading wording ("check your connection") and an orphan draft (problem 9.1).
- Send with the network dropped (route aborted): same message, cart kept, no order created.
- Qty change offline: works (local-first). Navigating to checkout offline: the browser's own error page (no offline fallback).
- Payment result (by code): backend-only truth, states paid/pending/failed/refunded/expired/unknown/error, retry goes back to `/pharmacy/payment`; pharmacy-specific. App payment failures by code (nursing alert + tracking).
- Server-side backend errors (fault proxy "error"): `/orders`, `/appointments`, `/family`, `/prescriptions`, `/dashboard` show an error state with retry; `/health/*` is not faultable through the proxy (excluded by it), so health was not checked.

## Scenario 10: the flow in ur (RTL) and en
- 24 routes in ur: `dir=rtl` everywhere, no English except `SAR` and test codes (CBC, HbA...), plus `/emergency` ("Red Crescent Ambulance", "Unified Emergency (911)", "NABD INSTANT"), nursing "hour", ICU/shift service names from data. 19 routes in en: `dir=ltr`, no key leaks; Arabic only in `/en/emergency` and user data (names, group name).
- Formats: dates via Intl in the locale; currency "SAR" code in ur. Mirrored icons: cart/tracking pick caret by direction (checked in code); the app render shows the back arrow on the right in RTL.
- Not walked: hi, bn, fil, and the full transaction flow in ur/en (blocked by the env limits above).

## Leftovers of removed features
Web: `/emergency/sos`, `/emergency/sos-active`, `/emergency/tracking` (ambulance request and tracking), `/chat` list and dashboard tile. App: `app/emergency/{sos,sos-active,tracking}.tsx`. Redirected correctly: community, leaderboard, skin analysis, self-assessment, crisis contacts, voice.

## Could not be verified
App on a device; offers, price, payment, tracking and order-detail screens against live data (submit 500); booking, cancel and refund of a consultation (no doctor); lab booking past the lab choice; nursing booking (no providers); gateway returns; push notifications; hi/bn/fil.
