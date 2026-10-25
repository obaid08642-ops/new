# Patient-web static routes, anonymous sweep (390 and 1280 px)

Source: sweep script on the local production build (merged main). Auth-gated routes redirect to login as expected; they are covered by the signed-in sweep (not yet run). Re-run on the production layout (nonce server on :3000) at 19:10 UTC: all 141 routes recorded, same flags as the first pass. Per-route flags only; the defects are in docs/qa/findings/web-sweep-static.md.

| route | 390 px | 1280 px |
|---|---|---|
| / | HTTP 200 | HTTP 200 |
| /ai | HTTP 200 | HTTP 200 |
| /ai/monthly-report | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /appointments | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /articles | HTTP 200 | HTTP 200 |
| /cart | HTTP 200 | HTTP 200 |
| /cart/checkout | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /cart/prescription | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/booking-status | HTTP 200 | HTTP 200 |
| /consultations/call-history | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/cancel-reschedule | HTTP 200 | HTTP 200 |
| /consultations/clinic-confirm | HTTP 200 → /en/consultations/booking-status | HTTP 200 → /en/consultations/booking-status |
| /consultations/clinic-location | HTTP 200 → /en/consultations/booking-status | HTTP 200 → /en/consultations/booking-status |
| /consultations/doctor-profile | HTTP 200, console err → /en/consultations/doctors | HTTP 200 → /en/consultations/doctors |
| /consultations/doctors | HTTP 200, console err | HTTP 200 |
| /consultations/follow-up | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/home-visit-tracking | HTTP 200 | HTTP 200 |
| /consultations/instant | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/post-call-rating | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/prescription | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/share-report | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/specialties | HTTP 200, console err | HTTP 200 |
| /consultations/video-call | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /consultations/virtual-waiting-room | HTTP 200 | HTTP 200 |
| /consultations/waiting-room | HTTP 200 → /en/consultations/virtual-waiting-room | HTTP 200 → /en/consultations/virtual-waiting-room |
| /dashboard | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /delivery/address-select | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics | HTTP 200, 10 unnamed | HTTP 200, 10 unnamed |
| /diagnostics/booking-success | HTTP 200 | HTTP 200 |
| /diagnostics/bookings | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics/cart | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics/checkout | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics/insurance-approval | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics/insurance-upload | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics/lab-comparison | HTTP 200 | HTTP 200 |
| /diagnostics/labs | HTTP 200 | HTTP 200, 3 broken img, console err |
| /diagnostics/labs/book | HTTP 404, console err | HTTP 404, console err |
| /diagnostics/packages | HTTP 200 | HTTP 200 |
| /diagnostics/radiology | HTTP 200, 2 broken img, console err | HTTP 200, 3 broken img, console err |
| /diagnostics/results | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /diagnostics/sample-tracking | HTTP 200 | HTTP 200 |
| /diagnostics/search | HTTP 200 | HTTP 200 |
| /diagnostics/test-detail | HTTP 200 | HTTP 200 |
| /drug-scanner | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /emergency | HTTP 200 | HTTP 200 |
| /family | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /family/add | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /family/calendar | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /family/chat | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /forgot-password | HTTP 200 | HTTP 200 |
| /health | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /health/medications | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /health/profile | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /health/records | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /health/sleep | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /health/vitals | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /health/wearables | HTTP 200 | HTTP 200 |
| /home-care | HTTP 200 | HTTP 200 |
| /home-care/providers | HTTP 200 | HTTP 200 |
| /insurance | HTTP 200 | HTTP 200 |
| /insurance/add-policy | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /insurance/approval-pending | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /insurance/copay | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /insurance/coverage-check | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /insurance/payment-split | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /labs | HTTP 200 → /en/diagnostics/labs | HTTP 200, 3 broken img, console err → /en/diagnostics/labs |
| /labs/basket | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /labs/confirm | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /labs/providers | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /labs/when | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /login | HTTP 200 | HTTP 200 |
| /login/social-callback | HTTP 200 | HTTP 200 |
| /loyalty | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /map | HTTP 200 | HTTP 200 |
| /maternity | HTTP 200 | HTTP 200 |
| /maternity/maternity-setup | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /medical-orders | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /medicine | HTTP 200, 2 unnamed, api 401, console err → /en/c | HTTP 200, 2 unnamed, api 401, console err → /en/c |
| /medicine-catalog | HTTP 200, 2 unnamed, api 401, console err → /en/c | HTTP 200, 2 unnamed, api 401, console err → /en/c |
| /medicines | HTTP 200, 2 unnamed, api 401, console err → /en/c | HTTP 200, 2 unnamed, api 401, console err → /en/c |
| /medicines/compare | HTTP 200 | HTTP 200 |
| /mental-health | HTTP 200 | HTTP 200 |
| /mental-health/mood | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /notifications | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /nursing/catalog | HTTP 200 | HTTP 200 |
| /nursing/insurance-status | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /nursing/service-info | HTTP 200 → /en/nursing/catalog | HTTP 200 → /en/nursing/catalog |
| /nursing/visits | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /nutrition | HTTP 200 | HTTP 200 |
| /nutrition/log-meal | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /oauth/authorize | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /offers | HTTP 200 | HTTP 200 |
| /offline | HTTP 200 | HTTP 200 |
| /orders | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /otp | HTTP 200 | HTTP 200 |
| /password-reset | HTTP 200 | HTTP 200 |
| /payments/failed | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /payments/processing | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /payments/result | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /payments/success | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /pharmacy/barcode | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /pharmacy/broadcast-status | HTTP 200 | HTTP 200 |
| /pharmacy/chat | HTTP 200 | HTTP 200 |
| /pharmacy/filters | HTTP 200, 2 unnamed, api 401, console err → /en/c | HTTP 200, 2 unnamed, api 401, console err → /en/c |
| /pharmacy/final-quote | HTTP 200 | HTTP 200 |
| /pharmacy/insurance-decision | HTTP 200 | HTTP 200 |
| /pharmacy/order-confirm | HTTP 200, console err | HTTP 200 |
| /pharmacy/payment | HTTP 200 | HTTP 200 |
| /pharmacy/reorder | HTTP 200 | HTTP 200 |
| /pharmacy/rx-order | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /privacy | HTTP 404, console err | HTTP 404, console err |
| /profile | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /profile/addresses | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /programs | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /provider-info | HTTP 200, console err | HTTP 200, console err |
| /q/articles | HTTP 200 | HTTP 200 |
| /q/consultations/doctors | HTTP 200, console err | HTTP 200 |
| /refund-policy | HTTP 404, console err | HTTP 404, console err |
| /register | HTTP 200 | HTTP 200 |
| /reports/passport | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /returns | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /returns/new-request | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /reviews | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /s | HTTP 200, console err | HTTP 200, console err |
| /search | HTTP 200, console err | HTTP 200, console err |
| /settings | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /settings/about | HTTP 200 | HTTP 200 |
| /settings/connected-apps | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /settings/help | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /settings/language | HTTP 200 | HTTP 200 |
| /settings/notifications | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /settings/privacy | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /settings/security | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /support/chat | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /support/ticket | HTTP 200 → /en/login | HTTP 200 → /en/login |
| /telehealth-consent | HTTP 404, console err | HTTP 404, console err |
| /terms | HTTP 404, console err | HTTP 404, console err |
| /unavailable | HTTP 200 | HTTP 200 |
| /voice | HTTP 200 → /en/ai | HTTP 200 → /en/ai |
| /welcome | HTTP 200 | HTTP 200 |
| /wishlist | HTTP 200 → /en/login | HTTP 200 → /en/login |
