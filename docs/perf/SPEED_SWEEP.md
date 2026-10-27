# Speed sweep — production (read-only)

Date: 2026-10-27. Tool: `tools/perf/web-sweep.js` (Playwright, mobile 390x844, 3 runs, median) and `tools/perf/api-sweep.py` (20 sequential GETs). GETs only, no load test.

**Caveat:** measured from a sandbox behind an egress proxy. The floor for a trivial request through it is ~270 ms TTFB (`/robots.txt`, median of 5) and p50 264 ms / p95 404 ms for a 404 on the API. Numbers below are raw; 'net' = raw minus floor. Targets: TTFB < 200 ms, LCP < 1.5 s, API p95 < 150 ms. Raw numbers cannot meet the TTFB/API targets from this vantage, so judge by net and by ranking.

## API (20 GETs each)

| endpoint | p50 ms | p95 ms | net p50 |
|---|---|---|---|
| `/api/v1/medicines?page=1&limit=20` | 561 | 749 | +297 |
| `/api/v1/medicines?page=1&limit=20&sort=smart_ranking` | 558 | 776 | +294 |
| `/api/v1/articles?limit=10` | 309 | 635 | +45 |
| `/api/v1/medicines/categories` | 305 | 475 | +41 |
| `/api/v1/entity-graph/related/doctor/7210a983-9756-4682-ae68-dcc5978d4ab5` | 292 | 607 | +28 |
| `/api/v1/doctors?limit=20` | 279 | 326 | +15 |

Hot spot: `GET /medicines` (list, with and without `smart_ranking`) is ~300 ms above the floor; the others are 15–45 ms above it. Page data is fetched server-side by Next (the browser makes no api.nabd.plus calls), so list pages inherit this.

## Web routes (slowest TTFB first)

| route | TTFB ms | net TTFB | LCP ms | JS KB | note |
|---|---|---|---|---|---|
| /login | 1625 | +1355 | 2376 | 154 | LCP>1.5s, slow TTFB |
| /nursing/service-info | 1262 | +992 | 2196 | 166 | LCP>1.5s, slow TTFB |
| /labs/when | 1259 | +989 | 1964 | 154 | LCP>1.5s, slow TTFB |
| /labs/basket | 1093 | +823 | 1480 | 154 | slow TTFB |
| /pharmacy/filters | 1088 | +818 | 1720 | 160 | LCP>1.5s, slow TTFB |
| /labs/confirm | 1042 | +772 | 1436 | 154 | slow TTFB |
| /nutrition | 889 | +619 | 1396 | 167 | slow TTFB |
| /medical-orders | 868 | +598 | 1544 | 154 | LCP>1.5s, slow TTFB |
| /labs | 823 | +553 | 1372 | 165 | slow TTFB |
| /consultations/instant | 817 | +547 | 1236 | 154 | slow TTFB |
| /login/social-callback | 794 | +524 | 1292 | 148 | slow TTFB |
| /consultations/clinic-confirm | 793 | +523 | 1192 | 156 | slow TTFB |
| /medicine-catalog | 758 | +488 | 1336 | 160 | slow TTFB |
| /oauth/authorize | 747 | +477 | 1140 | 154 | slow TTFB |
| /consultations/waiting-room | 743 | +473 | 1272 | 159 | slow TTFB |
| /labs/providers | 736 | +466 | 1316 | 154 | slow TTFB |
| /consultations/doctor-profile | 730 | +460 | 1184 | 166 | slow TTFB |
| /voice | 723 | +453 | 1168 | 168 | slow TTFB |
| /consultations/clinic-location | 719 | +449 | 1272 | 156 | slow TTFB |
| /medicines/compare | 691 | +421 | 1096 | 156 | slow TTFB |
| /maternity | 678 | +408 | 1168 | 167 | slow TTFB |
| /s | 645 | +375 | 1064 | 162 | slow TTFB |
| /medicine | 632 | +362 | 1216 | 160 | slow TTFB |
| /insurance/add-policy | 600 | +330 | 732 | 313 | slow TTFB, JS>250KB |
| /settings/language | 598 | +328 | 984 | 158 | slow TTFB |
| /doctors | 586 | +316 | 1020 | 166 | slow TTFB |
| /home-care/providers | 576 | +306 | 1028 | 168 | slow TTFB |
| /medicines | 572 | +302 | 1096 | 160 | slow TTFB |
| /nutrition/log-meal | 565 | +295 | 724 | 311 | JS>250KB |
| /home-care | 544 | +274 | 1036 | 168 |  |
| /telehealth-consent | 541 | +271 | 908 | 156 |  |
| /pharmacy | 541 | +271 | 1088 | 160 |  |
| /mental-health | 537 | +267 | 896 | 163 |  |
| /nursing/catalog | 536 | +266 | 1368 | 166 |  |
| /orders | 533 | +263 | 744 | 301 | JS>250KB |
| /mental-health/mood | 530 | +260 | 692 | 314 | JS>250KB |
| /password-reset | 522 | +252 | 936 | 149 |  |
| /settings/about | 521 | +251 | 936 | 156 |  |
| /diagnostics/labs | 520 | +250 | 908 | 165 |  |
| /drug-scanner | 520 | +250 | 700 | 301 | JS>250KB |
| /register | 517 | +247 | 976 | 153 |  |
| /health/records | 506 | +236 | 692 | 311 | JS>250KB |
| /ai/monthly-report | 504 | +234 | 784 | 312 | JS>250KB |
| /diagnostics/search | 496 | +226 | 1004 | 166 |  |
| /insurance/coverage-check | 491 | +221 | 672 | 309 | JS>250KB |
| /labs/CBC | 489 | +219 | 1752 | 166 | LCP>1.5s |
| /provider-info | 485 | +215 | 964 | 156 |  |
| /p/%D8%A3%D8%A8%D9%84%D9%8A%D9%81%D8%A7%D9%8A-%D8%A3%D8%B1%D | 481 | +211 | 1084 | 199 |  |
| /insurance | 480 | +210 | 916 | 169 |  |
| /family/chat | 478 | +208 | 636 | 314 | JS>250KB |
| /returns/new-request | 475 | +205 | 692 | 311 | JS>250KB |
| /pharmacy/rx-order | 469 | +199 | 736 | 318 | JS>250KB |
| /payments/processing | 467 | +197 | 612 | 449 | JS>250KB |
| /diagnostics/radiology | 459 | +189 | 808 | 165 |  |
| /settings/security | 458 | +188 | 644 | 313 | JS>250KB |
| /wishlist | 458 | +188 | 616 | 313 | JS>250KB |
| /cart/prescription | 453 | +183 | 824 | 309 | JS>250KB |
| /programs | 453 | +183 | 588 | 316 | JS>250KB |
| /diagnostics/sample-tracking | 449 | +179 | 796 | 170 |  |
| /terms | 448 | +178 | 888 | 156 |  |
| /diagnostics | 447 | +177 | 1104 | 166 |  |
| /health | 445 | +175 | 600 | 313 | JS>250KB |
| /map | 443 | +173 | 880 | 383 | JS>250KB |
| /diagnostics/results | 440 | +170 | 628 | 318 | JS>250KB |
| /payments/failed | 439 | +169 | 564 | 449 | JS>250KB |
| /q/consultations/doctors | 438 | +168 | 804 | 166 |  |
| /insurance/approval-pending | 436 | +166 | 624 | 301 | JS>250KB |
| /diagnostics/test-detail | 435 | +165 | 800 | 148 |  |
| /health/sleep | 435 | +165 | 636 | 312 | JS>250KB |
| /search | 435 | +165 | 820 | 162 |  |
| /settings/connected-apps | 434 | +164 | 568 | 311 | JS>250KB |
| /settings/privacy | 434 | +164 | 592 | 314 | JS>250KB |
| /family/add | 433 | +163 | 636 | 313 | JS>250KB |
| /offers | 433 | +163 | 924 | 164 |  |
| /otp | 428 | +158 | 852 | 150 |  |
| /diagnostics/packages | 425 | +155 | 792 | 165 |  |
| /payments/result | 420 | +150 | 604 | 301 | JS>250KB |
| /consultations/call-history | 414 | +144 | 556 | 312 | JS>250KB |
| /reports/passport | 414 | +144 | 640 | 310 | JS>250KB |
| / | 413 | +143 | 1548 | 162 | LCP>1.5s |
| /family/calendar | 413 | +143 | 688 | 313 | JS>250KB |
| /q/articles | 413 | +143 | 988 | 156 |  |
| /health/medications | 409 | +139 | 584 | 314 | JS>250KB |
| /consultations/cancel-reschedule | 406 | +136 | 1692 | 159 | LCP>1.5s |
| /consultations/prescription | 406 | +136 | 804 | 312 | JS>250KB |
| /nursing/insurance-status | 406 | +136 | 576 | 319 | JS>250KB |
| /pharmacy/order-confirm | 404 | +134 | 1164 | 156 |  |
| /support/chat | 403 | +133 | 908 | 312 | JS>250KB |
| /insurance/copay | 402 | +132 | 600 | 301 | JS>250KB |
| /insurance/payment-split | 402 | +132 | 552 | 301 | JS>250KB |
| /maternity/maternity-setup | 399 | +129 | 572 | 312 | JS>250KB |
| /payments/success | 398 | +128 | 788 | 449 | JS>250KB |
| /profile | 398 | +128 | 600 | 310 | JS>250KB |
| /settings | 397 | +127 | 604 | 310 | JS>250KB |
| /support/ticket | 397 | +127 | 564 | 311 | JS>250KB |
| /ai | 393 | +123 | 1368 | 168 |  |
| /pharmacy/barcode | 393 | +123 | 536 | 301 | JS>250KB |
| /labs/CBC/abha | 393 | +123 | 844 | 164 |  |
| /consultations/post-call-rating | 390 | +120 | 540 | 311 | JS>250KB |
| /welcome | 387 | +117 | 864 | 149 |  |
| /pharmacy/reorder | 385 | +115 | 756 | 148 |  |
| /family | 383 | +113 | 548 | 312 | JS>250KB |
| /health/wearables | 382 | +112 | 724 | 155 |  |
| /loyalty | 379 | +109 | 704 | 315 | JS>250KB |
| /settings/notifications | 379 | +109 | 596 | 314 | JS>250KB |
| /nursing/visits | 378 | +108 | 516 | 311 | JS>250KB |
| /health/profile | 377 | +107 | 588 | 340 | JS>250KB |
| /pharmacy/chat | 377 | +107 | 860 | 148 |  |
| /consultations/booking-status | 376 | +106 | 928 | 156 |  |
| /pharmacy/categories | 375 | +105 | 1400 | 155 |  |
| /consultations/follow-up | 373 | +103 | 664 | 312 | JS>250KB |
| /diagnostics/lab-comparison | 371 | +101 | 772 | 165 |  |
| /pharmacy/final-quote | 370 | +100 | 724 | 160 |  |
| /settings/help | 370 | +100 | 544 | 312 | JS>250KB |
| /cart/checkout | 369 | +99 | 708 | 301 | JS>250KB |
| /consultations/video-call | 369 | +99 | 724 | 312 | JS>250KB |
| /emergency | 369 | +99 | 796 | 164 |  |
| /consultations/home-visit-tracking | 366 | +96 | 744 | 158 |  |
| /consultations/virtual-waiting-room | 366 | +96 | 868 | 159 |  |
| /diagnostics/labs/book | 364 | +94 | 1508 | 148 | LCP>1.5s |
| /consultations/doctors | 361 | +91 | 816 | 166 |  |
| /articles | 357 | +87 | 916 | 156 |  |
| /diagnostics/booking-success | 356 | +86 | 888 | 164 |  |
| /diagnostics/bookings | 355 | +85 | 552 | 318 | JS>250KB |
| /reviews | 355 | +85 | 524 | 312 | JS>250KB |
| /pharmacy/broadcast-status | 352 | +82 | 776 | 163 |  |
| /dashboard | 349 | +79 | 648 | 321 | JS>250KB |
| /diagnostics/cart | 349 | +79 | 740 | 320 | JS>250KB |
| /diagnostics/checkout | 347 | +77 | 532 | 320 | JS>250KB |
| /cart | 345 | +75 | 1160 | 166 |  |
| /consultations/share-report | 345 | +75 | 596 | 314 | JS>250KB |
| /pharmacy/insurance-decision | 345 | +75 | 776 | 159 |  |
| /profile/addresses | 345 | +75 | 556 | 320 | JS>250KB |
| /pharmacy/payment | 343 | +73 | 844 | 148 |  |
| /consultations/specialties | 340 | +70 | 692 | 157 |  |
| /diagnostics/insurance-upload | 338 | +68 | 576 | 315 | JS>250KB |
| /diagnostics/insurance-approval | 335 | +65 | 516 | 315 | JS>250KB |
| /notifications | 324 | +54 | 476 | 310 | JS>250KB |
| /unavailable | 320 | +50 | 1376 | 155 |  |
| /offline | 319 | +49 | 676 | 148 |  |
| /returns | 316 | +46 | 488 | 311 | JS>250KB |
| /appointments | 308 | +38 | 564 | 312 | JS>250KB |
| /health/vitals | 293 | +23 | 448 | 313 | JS>250KB |
| /delivery/address-select | 291 | +21 | 556 | 320 | JS>250KB |
| /refund-policy | 290 | +20 | 740 | 156 |  |
| /forgot-password | 280 | +10 | 612 | 149 |  |
| /doctor/7210a983-9756-4682-ae68-dcc5978d4ab5 | 269 | +-1 | 788 | 156 |  |
| /privacy | 267 | +-3 | 696 | 156 |  |

## Findings

1. **Public indexable pages are at the floor.** Warm repeat hits of `/ar/login`, `/ar/nutrition` drop to ~150 ms; their first hits (cold ISR/edge) are the 0.8–1.6 s outliers, not steady state.
2. **Non-indexable pages are always rendered per request.** `proxy.ts` (F68/F82-3) sends every non-public path through the per-request-nonce path with `Cache-Control: private, no-store`, so `cf-cache-status: DYNAMIC` and TTFB is a full SSR each time: `/labs/when` ~0.42–0.66 s, `/labs/basket` ~0.45–0.91 s, `/pharmacy/filters` ~0.42–0.84 s, `/nursing/service-info` ~0.39–0.56 s (floor ~0.27 s). Making them fast means serving a static shell with client-side data, or extending the nonce-stamping (cacheable) path to these routes. That is a CSP/security architecture decision, not a local fix, so it is not changed here.
3. **`GET /medicines` list is the one slow API** (~+300 ms over floor, with or without `smart_ranking`); candidate for a short server cache or an index review on the ranked query. Needs backend profiling before a fix (not done: prod is read-only).
4. **JS (corrected):** the ~310 KB figure on auth-gated routes is a measurement artifact, not bundle bloat. Those routes redirect to `/login?next=…`, and the sweep counted the scripts of both documents (identical chunks listed twice, e.g. `/ar/orders`: 28 script responses = 2 × 14). The final document ships ~155–170 KB like public pages; the cost of a gated route is the extra redirect round trip. Rows marked `JS>250KB` below should be read that way.
5. **LCP > 1.5 s:** `/login` (cold), `/nursing/service-info`, `/labs/when`, `/pharmacy/filters`, `/medical-orders`, `/labs/CBC`.

## App

Not measured yet (needs native-e2e emulator run).
