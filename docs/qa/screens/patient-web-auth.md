# Patient-web auth-gated routes, signed in as the QA patient (390 and 1280 px)

Source: sweep on the production layout (nonce server on :3000, standalone Next behind it). One login per width, each route recorded only with a live session. Per-route flags only; defects are in docs/qa/findings/web-sweep-auth.md.

| route | 390 px | 1280 px |
|---|---|---|
| /ai/monthly-report | HTTP 200 | HTTP 200 |
| /appointments | HTTP 200 | HTTP 200 |
| /cart/checkout | HTTP 200 | HTTP 200 |
| /cart/prescription | HTTP 200 | HTTP 200 |
| /consultations/call-history | HTTP 200 | HTTP 200 |
| /consultations/follow-up | HTTP 200 → /en/appointments | HTTP 200 → /en/appointments |
| /consultations/instant | HTTP 200 | HTTP 200 |
| /consultations/post-call-rating | HTTP 200 | HTTP 200 |
| /consultations/prescription | HTTP 200 → /en/appointments | HTTP 200 → /en/appointments |
| /consultations/share-report | HTTP 200 | HTTP 200 |
| /consultations/video-call | HTTP 200, 1 unnamed | HTTP 200 |
| /dashboard | HTTP 200 | HTTP 200 |
| /delivery/address-select | HTTP 200 → /en/profile/addresses | HTTP 200 → /en/profile/addresses |
| /diagnostics/bookings | HTTP 200 | HTTP 200 |
| /diagnostics/cart | HTTP 200 | HTTP 200 |
| /diagnostics/checkout | HTTP 200 | HTTP 200 |
| /diagnostics/insurance-approval | HTTP 200 | HTTP 200 |
| /diagnostics/insurance-upload | HTTP 200 → /en/diagnostics/insurance-approval | HTTP 200 → /en/diagnostics/insurance-approval |
| /diagnostics/results | HTTP 200 | HTTP 200 |
| /drug-scanner | HTTP 200, 1 unnamed → /en/pharmacy/barcode | HTTP 200, 1 unnamed → /en/pharmacy/barcode |
| /family | HTTP 200 | HTTP 200 |
| /family/add | HTTP 200, api 404 POST /api/family/invite | HTTP 200, api 404 POST /api/family/invite |
| /family/calendar | HTTP 200 | HTTP 200 |
| /family/chat | HTTP 200, api 403 GET /api/patient/family/chat/messages | HTTP 200, api 403 GET /api/patient/family/chat/messages |
| /health | HTTP 200 | HTTP 200 |
| /health/medications | HTTP 200 | HTTP 200 |
| /health/profile | HTTP 200 | HTTP 200 |
| /health/records | HTTP 200 | HTTP 200 |
| /health/sleep | HTTP 200 | HTTP 200 |
| /health/vitals | HTTP 200 | HTTP 200 |
| /insurance/add-policy | HTTP 200 | HTTP 200 |
| /insurance/approval-pending | HTTP 200 → /en/insurance | HTTP 200 → /en/insurance |
| /insurance/copay | HTTP 200 → /en/insurance | HTTP 200 → /en/insurance |
| /insurance/coverage-check | HTTP 200 | HTTP 200 |
| /insurance/payment-split | HTTP 200 → /en/insurance | HTTP 200 → /en/insurance |
| /labs/basket | HTTP 200, 5 unnamed | HTTP 200, 5 unnamed |
| /labs/confirm | HTTP 200, 5 unnamed | HTTP 200, 5 unnamed |
| /labs/providers | HTTP 200, 5 unnamed | HTTP 200, 5 unnamed |
| /labs/when | HTTP 200, 5 unnamed | HTTP 200, 5 unnamed |
| /login/social-callback | HTTP 200, 1 unnamed | HTTP 200 |
| /loyalty | HTTP 200 | HTTP 200 |
| /maternity/maternity-setup | HTTP 200 | HTTP 200 |
| /medical-orders | HTTP 200 | HTTP 200 |
| /mental-health/mood | HTTP 200 | HTTP 200 |
| /notifications | HTTP 200 | HTTP 200 |
| /nursing/insurance-status | HTTP 200 | HTTP 200 |
| /nursing/visits | HTTP 200 | HTTP 200 |
| /nutrition/log-meal | HTTP 200 | HTTP 200 |
| /oauth/authorize | HTTP 200 | HTTP 200 |
| /orders | HTTP 200 | HTTP 200 |
| /payments/failed | HTTP 200 → /en/payments/result | HTTP 200 → /en/payments/result |
| /payments/processing | HTTP 200 → /en/payments/result | HTTP 200 → /en/payments/result |
| /payments/result | HTTP 200 | HTTP 200 |
| /payments/success | HTTP 200 → /en/payments/result | HTTP 200 → /en/payments/result |
| /pharmacy/barcode | HTTP 200, 1 unnamed | HTTP 200, 1 unnamed |
| /pharmacy/rx-order | HTTP 200 | HTTP 200 |
| /profile | HTTP 200 | HTTP 200 |
| /profile/addresses | HTTP 200 | HTTP 200 |
| /programs | HTTP 200 | HTTP 200 |
| /reports/passport | HTTP 200 | HTTP 200 |
| /returns | HTTP 200 | HTTP 200 |
| /returns/new-request | HTTP 200 | HTTP 200 |
| /reviews | HTTP 200 | HTTP 200 |
| /settings | HTTP 200 | HTTP 200 |
| /settings/connected-apps | HTTP 200 | HTTP 200 |
| /settings/help | HTTP 200 | HTTP 200 |
| /settings/notifications | HTTP 200 | HTTP 200 |
| /settings/privacy | HTTP 200 | HTTP 200 |
| /settings/security | HTTP 200 | HTTP 200 |
| /support/chat | HTTP 200 | HTTP 200 |
| /support/ticket | HTTP 200 | HTTP 200 |
| /wishlist | HTTP 200 | HTTP 200 |
