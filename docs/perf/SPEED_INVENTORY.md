# Speed inventory (2026-10-25)

Method: production build of `patient-web` (`next build`, standalone + `server/nonce-server.mjs`), local seeded backend (`DB_NAME=nabd_perf`: 21,000 medicines, 2,000 patients, 120 doctors, 24 nurses, 40 articles via `tools/perf/k6/seed-perf-data.js` and `tools/perf/seed-speed-inventory.js`). Lighthouse 12, mobile, **simulated** 4G throttling, performance category, **1 run per route** (not median of 3: 219 routes x 3 is about 5 h on this machine; the routes that get a fix are re-measured with median of 3 in their PR). Signed-in routes use a test patient token (`nabd_access` + `nabd_session_hint` cookies). Chrome drops the Cookie header on redirect hops, so `tools/perf/web-inventory.mjs` follows server redirects itself and audits the final URL.

Local machine numbers are not CI numbers (earlier: local 117 ms TBT vs CI 213 ms). Use them to rank routes, not as budgets.

## Summary

- Routes in `tools/live/web_walkthrough_routes.json`: 219. Measured and ranked: 183. Client-side login redirect (audited page is the login screen, not the route): 30. Lighthouse failed or no result: 6 (listed at the end).
- Median LCP 2.88 s; LCP over 2.5 s on 143 routes; TBT over 200 ms on 15; CLS over 0.1 on 40.
- **Every route loads about 160-190 KB of JavaScript** (shared layout), which is what puts the median at ~2.9 s on simulated 4G.
- **Alias routes cost an extra hop.** `/ar/insurance/policy-detail` redirects (server `redirect()` in the page) to `/ar/insurance?tab=policy`: 4.6 s through the alias vs 2.9 s direct. The alias pages render a Next route (TTFB + redirect round trip) instead of answering with a 308 from `next.config` redirects.
- **Hubs with CLS 0.13** (maternity, nutrition, mental-health, AI, insurance-tab pages): the hero/tab area shifts after hydration. Measured on `/ar/maternity?tab=pregnancy`: LCP 4.47 s, CLS 0.13, LCP element a hero span.
- **Login-gated routes** that client-redirect to another gated route were audited at the login screen; their numbers are not in the ranking (list below).

## API (p50/p95, local, warm, 30 sequential requests each)

No endpoint is over 150 ms p95. The finding is caching and payload, not latency.

| Endpoint | p50 ms | p95 ms | KB | Cache-Control |
|---|---:|---:|---:|---|
| GET /care/doctors | 29.9 | 50.8 | 18 | `private, no-store` |
| GET /care/doctors?q=a | 30.9 | 47.5 | 18 | `private, no-store` |
| GET /care/doctors?limit=20 | 28.7 | 44.4 | 18 | `private, no-store` |
| GET /care/doctors?sort=available_today | 25.7 | 38.3 | 18 | `private, no-store` |
| GET /care/doctors/:id | 20.5 | 31.9 | 4 | `private, no-store` |
| GET /locations/cities | 10.1 | 25.2 | 85 | `private, no-store` |
| GET /search?q=a | 16.5 | 24.5 | 10 | `private, no-store` |
| GET /config | 6.4 | 15.2 | 0 | `private, no-store` |
| GET /notifications (auth) | 9.7 | 14.5 | 0 | `private, no-store` |
| GET /labs/services | 10.7 | 14.3 | 179 | `private, no-store` |
| GET /radiology/services | 8.4 | 13.7 | 108 | `private, no-store` |
| GET /care/doctors/:id/slots | 5.3 | 13.5 | 0 | `private, no-store` |
| GET /home-care/services | 9.2 | 12.9 | 92 | `private, no-store` |
| GET /nursing/catalog | 9 | 11.8 | 93 | `private, no-store` |
| GET /home-care/providers | 5.9 | 11.3 | 9 | `private, no-store` |
| GET /orders/mine (auth) | 8 | 11.3 | 0 | `private, no-store` |
| GET /articles/:id | 7.2 | 10 | 4 | `private, no-store` |
| GET /insurance/companies | 6.8 | 9.7 | 42 | `private, no-store` |
| GET /articles | 6.7 | 9.3 | 86 | `private, no-store` |
| GET /care/specialties | 6.3 | 8.7 | 6 | `private, no-store` |
| GET /labs/packages | 5.7 | 7.7 | 45 | `private, no-store` |
| GET /medicines/search?q=pan | 4.5 | 6.3 | 0 | `none` | (HTTP 404: path not served, not measured)
| GET /content/home | 3.6 | 6 | 0 | `private, no-store` |
| GET /home/offers | 4.2 | 5.8 | 0 | `private, no-store` |
| GET /modules | 3.3 | 5.6 | 0 | `private, no-store` |
| GET /public/categories/ar | 2.8 | 5.5 | 0 | `private, no-store` |
| GET /home-care/packages | 4.5 | 5.1 | 0 | `private, no-store` |
| GET /medicines/search/trending | 3.2 | 4 | 0 | `private, no-store` |
| GET /loyalty/me (auth) | 2.9 | 3.5 | 0 | `none` | (HTTP 404: path not served, not measured)
| GET /health/profile (auth) | 2.2 | 2.5 | 0 | `none` | (HTTP 404: path not served, not measured)

Findings:
- Every public GET sends `private, no-store`, so Cloudflare cannot serve any of them. Catalogue, doctors, labs, radiology, nursing, articles, cities, insurance companies.
- Payload: `/labs/services` 179 KB, `/radiology/services` 108 KB, `/home-care/services` 92 KB, `/nursing/catalog` 93 KB, `/articles` list 86 KB (full content in the list), `/locations/cities` 85 KB, `/insurance/companies` 42 KB.
- `/care/doctors` is the slowest (p95 ~51 ms, 18 KB): doctor list with 120 doctors; fine for now.
- `/medicines/search`, `/loyalty/me`, `/health/profile` answered 404 at the paths used here; they are not in this table.

## Web routes, worst LCP first

| # | Route | LCP s | TBT ms | CLS | JS KB | TTFB ms | Over | Cause |
|---:|---|---:|---:|---:|---:|---:|---|---|
| 1 | `/ar/ai/symptom-checker` -> `/ar/ai?mode=symptoms` | 4.72 | 175 | 0.13 | 172 | 93 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 2 | `/ar/insurance/policy-detail` -> `/ar/insurance?tab=policy` | 4.66 | 212 | 0.13 | 169 | 90 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 3 | `/ar/insurance/network-providers` -> `/ar/insurance?tab=network` | 4.64 | 155 | 0.13 | 169 | 142 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 4 | `/ar/insurance/copay` -> `/ar/insurance` | 4.63 | 172 | 0.13 | 169 | 128 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 5 | `/ar/insurance/claims` -> `/ar/insurance` | 4.62 | 168 | 0.13 | 169 | 108 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 6 | `/ar/insurance/submit-claim` -> `/ar/insurance` | 4.60 | 127 | 0.13 | 169 | 101 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 7 | `/ar/insurance/refunds` -> `/ar/insurance` | 4.50 | 128 | 0.13 | 169 | 107 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 8 | `/ar/profile/insurance` -> `/ar/insurance` | 4.49 | 117 | 0.13 | 169 | 249 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; server render >200 ms |
| 9 | `/ar/nutrition/plan` -> `/ar/nutrition?tab=plan` | 4.48 | 206 | 0.13 | 172 | 213 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body); server render >200 ms |
| 10 | `/ar/nutrition/body-composition` -> `/ar/nutrition?tab=target` | 4.48 | 181 | 0.13 | 172 | 62 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 11 | `/ar/mental-health/therapist-match` -> `/ar/consultations/doctors?specialty=psychiatry` | 4.48 | 136 | 0.13 | 170 | 200 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; server render >200 ms |
| 12 | `/ar/nutrition/ai-meal-planner` -> `/ar/nutrition?tab=today` | 4.48 | 148 | 0.13 | 172 | 110 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 13 | `/ar/reports/ai-analysis` -> `/ar/ai?mode=report` | 4.46 | 76 | 0.14 | 172 | 156 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 14 | `/ar/home-care/services` -> `/ar/nursing/catalog` | 4.45 | 105 | 0.13 | 164 | 120 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 15 | `/ar/maternity/ovulation` -> `/ar/maternity?tab=ovulation` | 4.45 | 139 | 0.13 | 170 | 225 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; server render >200 ms |
| 16 | `/ar/ai/symptom-timeline` -> `/ar/ai?mode=symptoms` | 4.35 | 216 | 0.13 | 172 | 136 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 17 | `/ar/mental-health/self-assessment` -> `/ar/mental-health` | 4.35 | 386 | 0.13 | 167 | 108 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 18 | `/ar/insurance/payment-split` -> `/ar/insurance` | 4.33 | 113 | 0.13 | 169 | 126 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 19 | `/ar/ai/triage` -> `/ar/ai?mode=symptoms` | 4.33 | 191 | 0.13 | 172 | 128 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 20 | `/ar/maternity/baby-development` -> `/ar/maternity` | 4.32 | 144 | 0.13 | 170 | 257 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; server render >200 ms |
| 21 | `/ar/nursing/service-info` -> `/ar/nursing/catalog` | 4.31 | 169 | 0.13 | 164 | 118 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 22 | `/ar/mental-health/breathing` -> `/ar/mental-health` | 4.31 | 279 | 0.13 | 167 | 190 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 23 | `/ar/mental-health/meditation` -> `/ar/mental-health` | 4.30 | 238 | 0.13 | 167 | 119 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 24 | `/ar/nutrition/daily-tracker` -> `/ar/nutrition?tab=today` | 4.22 | 199 | 0.13 | 172 | 191 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 25 | `/ar/mental-health/relax` -> `/ar/mental-health` | 4.21 | 150 | 0.13 | 167 | 179 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 26 | `/ar/ai/prescription-translator` -> `/ar/ai?mode=prescription` | 4.19 | 311 | 0.13 | 172 | 64 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 27 | `/ar/maternity/baby-growth` -> `/ar/maternity?tab=baby` | 4.18 | 206 | 0.13 | 170 | 223 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body); server render >200 ms |
| 28 | `/ar/insurance/approval-pending` -> `/ar/insurance` | 4.18 | 126 | 0.13 | 169 | 73 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 29 | `/ar/maternity/tracker` -> `/ar/maternity?tab=pregnancy` | 4.16 | 189 | 0.13 | 170 | 144 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 30 | `/ar/nutrition/exercise-plan` -> `/ar/nutrition?tab=today` | 4.15 | 139 | 0.13 | 172 | 119 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 31 | `/ar/insurance/benefits` -> `/ar/insurance?tab=benefits` | 4.15 | 137 | 0.13 | 169 | 117 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 32 | `/ar/ai/skin-analysis` -> `/ar/ai` | 4.15 | 167 | 0.13 | 172 | 68 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 33 | `/ar/nutrition/body-target` -> `/ar/nutrition?tab=target` | 4.15 | 115 | 0.13 | 172 | 76 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 34 | `/ar/ai/report` -> `/ar/ai?mode=report` | 4.14 | 157 | 0.13 | 172 | 121 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 35 | `/ar/mental-health/crisis-contacts` -> `/ar/mental-health` | 4.12 | 200 | 0.13 | 167 | 111 | LCP TBT CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect; main-thread work after hydration (client-only screen body) |
| 36 | `/ar/nutrition/ai-plan-builder` -> `/ar/nutrition` | 4.10 | 174 | 0.13 | 172 | 77 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 37 | `/ar/pharmacy/waiting-for-pharmacy` -> `/ar/pharmacy/broadcast-status` | 4.04 | 94 | 0.19 | 167 | 106 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration); hub route reached through an alias redirect |
| 38 | `/ar/nutrition/water-tracker` -> `/ar/nutrition?tab=today` | 3.99 | 154 | 0.13 | 172 | 83 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration) |
| 39 | `/ar/medicine-catalog` -> `/ar/c` | 3.67 | 130 | 0.00 | 163 | 28 | LCP | shared layout JS ~170 KB on simulated 4G |
| 40 | `/ar/medicine` -> `/ar/c` | 3.61 | 145 | 0.00 | 163 | 17 | LCP | shared layout JS ~170 KB on simulated 4G |
| 41 | `/ar/pharmacy` -> `/ar/c` | 3.59 | 126 | 0.00 | 163 | 19 | LCP | shared layout JS ~170 KB on simulated 4G |
| 42 | `/ar/cart/checkout` | 3.50 | 193 | 0.00 | 166 | 34 | LCP | shared layout JS ~170 KB on simulated 4G |
| 43 | `/ar/family/chat` | 3.46 | 190 | 0.00 | 163 | 38 | LCP | shared layout JS ~170 KB on simulated 4G |
| 44 | `/ar/payments` -> `/ar/cart/checkout` | 3.40 | 128 | 0.00 | 166 | 25 | LCP | shared layout JS ~170 KB on simulated 4G |
| 45 | `/ar/labs/confirm` | 3.40 | 110 | 0.00 | 168 | 58 | LCP | shared layout JS ~170 KB on simulated 4G |
| 46 | `/ar/profile` | 3.37 | 94 | 0.00 | 159 | 108 | LCP | shared layout JS ~170 KB on simulated 4G |
| 47 | `/ar/cart` | 3.33 | 136 | 0.00 | 169 | 31 | LCP | shared layout JS ~170 KB on simulated 4G |
| 48 | `/ar/settings/notifications` | 3.28 | 145 | 0.16 | 164 | 47 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration) |
| 49 | `/ar/support/chat` | 3.26 | 109 | 0.00 | 162 | 49 | LCP | shared layout JS ~170 KB on simulated 4G |
| 50 | `/ar/labs/when` | 3.26 | 92 | 0.00 | 168 | 50 | LCP | shared layout JS ~170 KB on simulated 4G |
| 51 | `/ar/p` -> `/ar/c` | 3.23 | 124 | 0.00 | 163 | 14 | LCP | shared layout JS ~170 KB on simulated 4G |
| 52 | `/ar/medicines` -> `/ar/c` | 3.22 | 68 | 0.00 | 163 | 13 | LCP | shared layout JS ~170 KB on simulated 4G |
| 53 | `/ar/voice` -> `/ar/ai` | 3.22 | 89 | 0.00 | 172 | 27 | LCP | shared layout JS ~170 KB on simulated 4G |
| 54 | `/ar/nursing` -> `/ar/nursing/catalog` | 3.22 | 71 | 0.00 | 164 | 51 | LCP | shared layout JS ~170 KB on simulated 4G |
| 55 | `/ar/radiology` -> `/ar/diagnostics/radiology` | 3.20 | 39 | 0.00 | 160 | 61 | LCP | shared layout JS ~170 KB on simulated 4G |
| 56 | `/ar/diagnostics/upload-rx` -> `/ar/diagnostics/search` | 3.16 | 160 | 0.00 | 167 | 68 | LCP | shared layout JS ~170 KB on simulated 4G |
| 57 | `/ar/community` -> `/ar/articles` | 3.15 | 76 | 0.00 | 160 | 11 | LCP | shared layout JS ~170 KB on simulated 4G |
| 58 | `/ar/home-nursing` -> `/ar/nursing/catalog` | 3.15 | 85 | 0.00 | 164 | 58 | LCP | shared layout JS ~170 KB on simulated 4G |
| 59 | `/ar/emergency/tracking` -> `/ar/emergency` | 3.14 | 58 | 0.00 | 167 | 37 | LCP | shared layout JS ~170 KB on simulated 4G |
| 60 | `/ar/services` -> `/ar` | 3.14 | 68 | 0.00 | 163 | 29 | LCP | shared layout JS ~170 KB on simulated 4G |
| 61 | `/ar/emergency/sos-active` -> `/ar/emergency` | 3.12 | 101 | 0.00 | 167 | 31 | LCP | shared layout JS ~170 KB on simulated 4G |
| 62 | `/ar/diagnostics` | 3.07 | 69 | 0.00 | 164 | 220 | LCP | server render >200 ms |
| 63 | `/ar/consultations/home-visit-tracking` | 3.06 | 88 | 0.06 | 162 | 30 | LCP | shared layout JS ~170 KB on simulated 4G |
| 64 | `/ar/ai/monthly-report` | 3.05 | 168 | 0.00 | 162 | 88 | LCP | shared layout JS ~170 KB on simulated 4G |
| 65 | `/ar/doctor` -> `/ar/consultations/doctors` | 3.05 | 77 | 0.00 | 170 | 24 | LCP | shared layout JS ~170 KB on simulated 4G |
| 66 | `/ar/doctors` -> `/ar/consultations/doctors` | 3.04 | 94 | 0.00 | 170 | 21 | LCP | shared layout JS ~170 KB on simulated 4G |
| 67 | `/ar/q/consultations/doctors` | 3.04 | 169 | 0.00 | 170 | 126 | LCP | shared layout JS ~170 KB on simulated 4G |
| 68 | `/ar/consultations/doctor-profile` -> `/ar/consultations/doctors` | 3.04 | 40 | 0.00 | 170 | 38 | LCP | shared layout JS ~170 KB on simulated 4G |
| 69 | `/ar/nursing/booking` -> `/ar/nursing/catalog` | 3.03 | 48 | 0.00 | 164 | 63 | LCP | shared layout JS ~170 KB on simulated 4G |
| 70 | `/ar/insurance` | 3.02 | 80 | 0.00 | 169 | 56 | LCP | shared layout JS ~170 KB on simulated 4G |
| 71 | `/ar/notifications` | 3.02 | 66 | 0.00 | 160 | 45 | LCP | shared layout JS ~170 KB on simulated 4G |
| 72 | `/ar/consultations/doctors` | 3.02 | 85 | 0.00 | 170 | 17 | LCP | shared layout JS ~170 KB on simulated 4G |
| 73 | `/ar/diagnostics/bookings` | 3.01 | 107 | 0.00 | 161 | 49 | LCP | shared layout JS ~170 KB on simulated 4G |
| 74 | `/ar/diagnostics/technician-tracking` -> `/ar/diagnostics/sample-tracking` | 3.01 | 96 | 0.06 | 171 | 24 | LCP | shared layout JS ~170 KB on simulated 4G |
| 75 | `/ar/consultations/share-report` | 3.01 | 121 | 0.00 | 164 | 52 | LCP | shared layout JS ~170 KB on simulated 4G |
| 76 | `/ar/maternity` | 3.01 | 138 | 0.00 | 181 | 101 | LCP | JS >180 KB |
| 77 | `/ar/family` | 3.00 | 75 | 0.00 | 162 | 51 | LCP | shared layout JS ~170 KB on simulated 4G |
| 78 | `/ar/consultations/call-history` | 3.00 | 81 | 0.00 | 162 | 63 | LCP | shared layout JS ~170 KB on simulated 4G |
| 79 | `/ar/payments/result` | 3.00 | 89 | 0.01 | 162 | 30 | LCP | shared layout JS ~170 KB on simulated 4G |
| 80 | `/ar/maternity/maternity-setup` | 2.99 | 69 | 0.00 | 162 | 48 | LCP | shared layout JS ~170 KB on simulated 4G |
| 81 | `/ar/nutrition/log-meal` | 2.99 | 61 | 0.00 | 160 | 47 | LCP | shared layout JS ~170 KB on simulated 4G |
| 82 | `/ar/pharmacy/final-quote` | 2.99 | 82 | 0.06 | 163 | 34 | LCP | shared layout JS ~170 KB on simulated 4G |
| 83 | `/ar/labs/providers` | 2.98 | 82 | 0.00 | 168 | 64 | LCP | shared layout JS ~170 KB on simulated 4G |
| 84 | `/ar/health/vitals` | 2.94 | 92 | 0.00 | 163 | 59 | LCP | shared layout JS ~170 KB on simulated 4G |
| 85 | `/ar/home-care` | 2.94 | 86 | 0.00 | 168 | 84 | LCP | shared layout JS ~170 KB on simulated 4G |
| 86 | `/ar/pharmacy/rx-order` | 2.91 | 122 | 0.00 | 168 | 70 | LCP | shared layout JS ~170 KB on simulated 4G |
| 87 | `/ar/pharmacy/broadcast-status` | 2.90 | 154 | 0.06 | 167 | 35 | LCP | shared layout JS ~170 KB on simulated 4G |
| 88 | `/ar/diagnostics/radiology` | 2.90 | 62 | 0.00 | 160 | 70 | LCP | shared layout JS ~170 KB on simulated 4G |
| 89 | `/ar/consultations/cancel-reschedule` | 2.90 | 163 | 0.06 | 162 | 39 | LCP | shared layout JS ~170 KB on simulated 4G |
| 90 | `/ar/ai` | 2.88 | 84 | 0.00 | 172 | 35 | LCP | shared layout JS ~170 KB on simulated 4G |
| 91 | `/ar/consultations/video-call` | 2.88 | 160 | 0.06 | 162 | 32 | LCP | shared layout JS ~170 KB on simulated 4G |
| 92 | `/ar/diagnostics/insurance-approval` | 2.88 | 109 | 0.00 | 165 | 42 | LCP | shared layout JS ~170 KB on simulated 4G |
| 93 | `/ar/health/records` | 2.88 | 78 | 0.00 | 161 | 62 | LCP | shared layout JS ~170 KB on simulated 4G |
| 94 | `/ar/pharmacy/drug-not-found` -> `/ar/pharmacy/rx-order?via=type` | 2.88 | 108 | 0.01 | 168 | 34 | LCP | shared layout JS ~170 KB on simulated 4G |
| 95 | `/ar/health/sleep` | 2.88 | 74 | 0.00 | 162 | 51 | LCP | shared layout JS ~170 KB on simulated 4G |
| 96 | `/ar/family/calendar` | 2.88 | 92 | 0.00 | 163 | 52 | LCP | shared layout JS ~170 KB on simulated 4G |
| 97 | `/ar/family/add` | 2.88 | 62 | 0.01 | 163 | 28 | LCP | shared layout JS ~170 KB on simulated 4G |
| 98 | `/ar/pharmacy/scan-prescription` -> `/ar/pharmacy/rx-order?via=photo` | 2.87 | 91 | 0.00 | 168 | 51 | LCP | shared layout JS ~170 KB on simulated 4G |
| 99 | `/ar/programs` | 2.87 | 131 | 0.00 | 177 | 56 | LCP | shared layout JS ~170 KB on simulated 4G |
| 100 | `/ar/nursing/insurance-status` | 2.87 | 92 | 0.00 | 162 | 42 | LCP | shared layout JS ~170 KB on simulated 4G |
| 101 | `/ar/health` | 2.87 | 73 | 0.00 | 163 | 92 | LCP | shared layout JS ~170 KB on simulated 4G |
| 102 | `/ar/reports/passport` | 2.87 | 104 | 0.00 | 160 | 92 | LCP | shared layout JS ~170 KB on simulated 4G |
| 103 | `/ar/diagnostics/packages` | 2.87 | 48 | 0.00 | 160 | 44 | LCP | shared layout JS ~170 KB on simulated 4G |
| 104 | `/ar/login` | 2.87 | 61 | 0.00 | 159 | 29 | LCP | shared layout JS ~170 KB on simulated 4G |
| 105 | `/ar/medical-orders` | 2.87 | 55 | 0.00 | 169 | 48 | LCP | shared layout JS ~170 KB on simulated 4G |
| 106 | `/ar/consultations/specialties` | 2.86 | 44 | 0.00 | 159 | 52 | LCP | shared layout JS ~170 KB on simulated 4G |
| 107 | `/ar/insurance/coverage-check` | 2.85 | 78 | 0.00 | 159 | 35 | LCP | shared layout JS ~170 KB on simulated 4G |
| 108 | `/ar/dashboard` | 2.76 | 88 | 0.00 | 168 | 98 | LCP | shared layout JS ~170 KB on simulated 4G |
| 109 | `/ar/pharmacy/reorder` | 2.76 | 320 | 0.06 | 153 | 37 | LCP TBT | main-thread work after hydration (client-only screen body) |
| 110 | `/ar/pharmacy/filters` -> `/ar/c` | 2.75 | 84 | 0.00 | 163 | 15 | LCP | shared layout JS ~170 KB on simulated 4G |
| 111 | `/ar/cart/prescription` | 2.75 | 74 | 0.00 | 159 | 56 | LCP | shared layout JS ~170 KB on simulated 4G |
| 112 | `/ar/home-care/providers` | 2.75 | 98 | 0.00 | 168 | 66 | LCP | shared layout JS ~170 KB on simulated 4G |
| 113 | `/ar/q/articles` | 2.75 | 56 | 0.00 | 159 | 58 | LCP | shared layout JS ~170 KB on simulated 4G |
| 114 | `/ar/consultations/clinic-location` -> `/ar/consultations/booking-status?view=location` | 2.75 | 226 | 0.06 | 159 | 32 | LCP TBT | main-thread work after hydration (client-only screen body) |
| 115 | `/ar/labs` -> `/ar/diagnostics/labs` | 2.74 | 78 | 0.00 | 160 | 77 | LCP | shared layout JS ~170 KB on simulated 4G |
| 116 | `/ar/support/ticket` | 2.74 | 65 | 0.00 | 160 | 43 | LCP | shared layout JS ~170 KB on simulated 4G |
| 117 | `/ar/reviews` | 2.74 | 73 | 0.00 | 171 | 48 | LCP | shared layout JS ~170 KB on simulated 4G |
| 118 | `/ar/consultations/instant` | 2.74 | 100 | 0.00 | 161 | 45 | LCP | shared layout JS ~170 KB on simulated 4G |
| 119 | `/ar/welcome` | 2.74 | 99 | 0.00 | 155 | 48 | LCP | shared layout JS ~170 KB on simulated 4G |
| 120 | `/ar/diagnostics/book-sample` -> `/ar/diagnostics/cart` | 2.74 | 118 | 0.00 | 167 | 47 | LCP | shared layout JS ~170 KB on simulated 4G |
| 121 | `/ar/diagnostics/results` | 2.72 | 123 | 0.00 | 161 | 51 | LCP | shared layout JS ~170 KB on simulated 4G |
| 122 | `/ar/diagnostics/test-detail` | 2.72 | 169 | 0.06 | 153 | 43 | LCP | shared layout JS ~170 KB on simulated 4G |
| 123 | `/ar/map` | 2.72 | 57 | 0.31 | 160 | 38 | LCP CLS | layout shift 0.13 (hub hero/tabs shift after hydration) |
| 124 | `/ar/offline` | 2.70 | 37 | 0.00 | 153 | 14 | LCP | shared layout JS ~170 KB on simulated 4G |
| 125 | `/ar/nursing/catalog` | 2.66 | 67 | 0.00 | 164 | 77 | LCP | shared layout JS ~170 KB on simulated 4G |
| 126 | `/ar/provider-info` | 2.64 | 48 | 0.00 | 160 | 27 | LCP | shared layout JS ~170 KB on simulated 4G |
| 127 | `/ar/consultations/prescription` -> `/ar/appointments` | 2.61 | 179 | 0.00 | 162 | 50 | LCP | shared layout JS ~170 KB on simulated 4G |
| 128 | `/ar/settings/connected-apps` | 2.59 | 97 | 0.00 | 160 | 48 | LCP | shared layout JS ~170 KB on simulated 4G |
| 129 | `/ar/delivery/address-select` -> `/ar/profile/addresses?select=1` | 2.59 | 78 | 0.00 | 167 | 36 | LCP | shared layout JS ~170 KB on simulated 4G |
| 130 | `/ar/unavailable` | 2.59 | 44 | 0.00 | 158 | 53 | LCP | shared layout JS ~170 KB on simulated 4G |
| 131 | `/ar/loyalty` | 2.58 | 129 | 0.00 | 176 | 85 | LCP | shared layout JS ~170 KB on simulated 4G |
| 132 | `/ar/profile/addresses` | 2.58 | 160 | 0.00 | 167 | 44 | LCP | shared layout JS ~170 KB on simulated 4G |
| 133 | `/ar/forgot-password` | 2.58 | 24 | 0.00 | 154 | 32 | LCP | shared layout JS ~170 KB on simulated 4G |
| 134 | `/ar/health/profile` | 2.57 | 92 | 0.00 | 191 | 72 | LCP | JS >180 KB |
| 135 | `/ar/otp` | 2.57 | 42 | 0.00 | 155 | 37 | LCP | shared layout JS ~170 KB on simulated 4G |
| 136 | `/ar/offers` | 2.57 | 93 | 0.00 | 178 | 58 | LCP | shared layout JS ~170 KB on simulated 4G |
| 137 | `/ar/nursing/visits` | 2.57 | 42 | 0.00 | 161 | 70 | LCP | shared layout JS ~170 KB on simulated 4G |
| 138 | `/ar/orders` | 2.57 | 60 | 0.00 | 162 | 111 | LCP | shared layout JS ~170 KB on simulated 4G |
| 139 | `/ar/password-reset` | 2.57 | 38 | 0.00 | 155 | 37 | LCP | shared layout JS ~170 KB on simulated 4G |
| 140 | `/ar/emergency` | 2.56 | 73 | 0.00 | 177 | 34 | LCP | shared layout JS ~170 KB on simulated 4G |
| 141 | `/ar/wishlist` | 2.56 | 150 | 0.00 | 162 | 47 | LCP | shared layout JS ~170 KB on simulated 4G |
| 142 | `/ar/search` | 2.52 | 79 | 0.00 | 165 | 52 | LCP | shared layout JS ~170 KB on simulated 4G |
| 143 | `/ar/emergency/sos` -> `/ar/emergency` | 2.50 | 62 | 0.00 | 167 | 40 | LCP | shared layout JS ~170 KB on simulated 4G |
| 144 | `/ar/pharmacy/chat` | 2.49 | 152 | 0.06 | 153 | 31 | - |  |
| 145 | `/ar/consultations` -> `/ar/consultations/doctors` | 2.48 | 160 | 0.00 | 170 | 63 | - |  |
| 146 | `/ar/diagnostics/labs` | 2.46 | 60 | 0.00 | 160 | 111 | - |  |
| 147 | `/ar/returns` | 2.45 | 140 | 0.00 | 160 | 54 | - |  |
| 148 | `/ar/settings/privacy` | 2.44 | 96 | 0.00 | 164 | 41 | - |  |
| 149 | `/ar/settings/help` | 2.44 | 73 | 0.00 | 162 | 48 | - |  |
| 150 | `/ar/pharmacy/order-confirm` | 2.44 | 92 | 0.00 | 159 | 46 | - |  |
| 151 | `/ar/returns/new-request` | 2.44 | 141 | 0.00 | 160 | 22 | - |  |
| 152 | `/ar/mental-health` | 2.44 | 133 | 0.00 | 178 | 51 | - |  |
| 153 | `/ar/health/medications` | 2.44 | 73 | 0.00 | 164 | 69 | - |  |
| 154 | `/ar/insurance/add-policy` | 2.44 | 132 | 0.00 | 163 | 53 | - |  |
| 155 | `/ar/diagnostics/cart` | 2.44 | 179 | 0.00 | 167 | 39 | - |  |
| 156 | `/ar/settings` | 2.43 | 74 | 0.00 | 160 | 46 | - |  |
| 157 | `/ar/settings/security` | 2.43 | 94 | 0.00 | 163 | 59 | - |  |
| 158 | `/ar/appointments` | 2.43 | 91 | 0.00 | 162 | 52 | - |  |
| 159 | `/ar/labs/basket` | 2.43 | 124 | 0.00 | 167 | 61 | - |  |
| 160 | `/ar/medicines/compare` | 2.42 | 45 | 0.00 | 158 | 54 | - |  |
| 161 | `/ar/diagnostics/lab-comparison` | 2.42 | 155 | 0.00 | 161 | 32 | - |  |
| 162 | `/ar/settings/about` | 2.42 | 93 | 0.00 | 159 | 53 | - |  |
| 163 | `/ar/consultations/post-call-rating` | 2.42 | 132 | 0.00 | 161 | 37 | - |  |
| 164 | `/ar/diagnostics/booking-success` | 2.42 | 141 | 0.06 | 160 | 27 | - |  |
| 165 | `/ar/mental-health/mood` | 2.42 | 205 | 0.00 | 165 | 49 | TBT | main-thread work after hydration (client-only screen body) |
| 166 | `/ar/nutrition` | 2.41 | 160 | 0.00 | 182 | 77 | - | JS >180 KB |
| 167 | `/ar/pharmacies` -> `/ar/c` | 2.35 | 63 | 0.00 | 163 | 21 | - |  |
| 168 | `/ar/consultations/clinic-confirm` -> `/ar/consultations/booking-status` | 2.31 | 353 | 0.06 | 159 | 26 | TBT | main-thread work after hydration (client-only screen body) |
| 169 | `/ar/consultations/booking-status` | 2.29 | 72 | 0.06 | 159 | 28 | - |  |
| 170 | `/ar/diagnostics/search` | 2.29 | 223 | 0.00 | 167 | 55 | TBT | main-thread work after hydration (client-only screen body) |
| 171 | `/ar/diagnostics/sample-tracking` | 2.27 | 184 | 0.06 | 171 | 37 | - |  |
| 172 | `/ar/s` -> `/ar/search` | 2.20 | 84 | 0.00 | 165 | 28 | - |  |
| 173 | `/ar/pharmacy/payment` | 2.18 | 221 | 0.06 | 153 | 49 | TBT | main-thread work after hydration (client-only screen body) |
| 174 | `/ar/health/wearables` | 2.16 | 180 | 0.06 | 159 | 36 | - |  |
| 175 | `/ar/pharmacy/barcode` | 2.14 | 169 | 0.00 | 167 | 59 | - |  |
| 176 | `/ar/consultations/virtual-waiting-room` | 2.14 | 126 | 0.06 | 163 | 34 | - |  |
| 177 | `/ar/settings/language` | 2.14 | 109 | 0.00 | 162 | 38 | - |  |
| 178 | `/ar/register` | 2.13 | 38 | 0.00 | 155 | 29 | - |  |
| 179 | `/ar/diagnostics/checkout` | 2.12 | 140 | 0.00 | 164 | 46 | - |  |
| 180 | `/ar/articles` | 2.04 | 140 | 0.00 | 160 | 37 | - |  |
| 181 | `/ar/consultations/waiting-room` -> `/ar/consultations/virtual-waiting-room` | 2.03 | 147 | 0.06 | 163 | 21 | - |  |
| 182 | `/ar/pharmacy/insurance-decision` | 2.01 | 113 | 0.06 | 162 | 39 | - |  |
| 183 | `/ar/oauth/authorize` | 1.99 | 53 | 0.00 | 153 | 49 | - |  |

## Not ranked: client redirected to the login screen

These routes are guards that client-redirect with `next=`; Lighthouse measured the login page.

- `/ar/drug-scanner` -> `/ar/login?next=%2Far%2Fpharmacy%2Fbarcode`
- `/ar/pharmacy/custom-item` -> `/ar/login?next=%2Far%2Fpharmacy%2Frx-order%3Fvia%3Dtype`
- `/ar/pharmacy/interactions` -> `/ar/login?next=%2Far%2Fpharmacy%2Fbarcode`
- `/ar/pharmacy/manual-order` -> `/ar/login?next=%2Far%2Fpharmacy%2Frx-order%3Fvia%3Dtype`
- `/ar/pharmacy/request` -> `/ar/login?next=%2Far%2Fpharmacy%2Frx-order%3Fvia%3Dtype`
- `/ar/prescriptions` -> `/ar/login?next=%2Far%2Fhealth%2Frecords%3Ftab%3Dprescriptions`
- `/ar/chat` -> `/ar/login?next=%2Far%2Fappointments`
- `/ar/consultations/chat` -> `/ar/login?next=%2Far%2Fappointments`
- `/ar/consultations/follow-up` -> `/ar/login?next=%2Far%2Fappointments`
- `/ar/diagnostics/insurance-upload` -> `/ar/login?next=%2Far%2Fdiagnostics%2Finsurance-approval`
- `/ar/payments/failed` -> `/ar/login?next=%2Far%2Fpayments%2Fresult`
- `/ar/payments/processing` -> `/ar/login?next=%2Far%2Fpayments%2Fresult`
- `/ar/payments/success` -> `/ar/login?next=%2Far%2Fpayments%2Fresult`
- `/ar/articles/bookmarks` -> `/ar/login`
- `/ar/programs/active` -> `/ar/login?next=%2Far%2Fprograms`
- `/ar/nutrition/calorie-analyzer` -> `/ar/login?next=%2Far%2Fnutrition%2Flog-meal`
- `/ar/nutrition/food-scanner` -> `/ar/login?next=%2Far%2Fnutrition%2Flog-meal`
- `/ar/health/actionable-order` -> `/ar/login?next=%2Far%2Fhealth%2Frecords%3Ftab%3Dprescriptions`
- `/ar/health/health-id` -> `/ar/login?next=%2Far%2Freports%2Fpassport`
- `/ar/health/smart-reminders` -> `/ar/login?next=%2Far%2Fhealth%2Fmedications%3Ftab%3Dall`
- `/ar/loyalty/challenges` -> `/ar/login?next=%2Far%2Floyalty%3Ftab%3Dchallenges`
- `/ar/loyalty/leaderboard` -> `/ar/login?next=%2Far%2Floyalty`
- `/ar/loyalty/referrals` -> `/ar/login?next=%2Far%2Floyalty%3Ftab%3Dinvite`
- `/ar/loyalty/rewards` -> `/ar/login?next=%2Far%2Floyalty%3Ftab%3Drewards`
- `/ar/notifications/settings` -> `/ar/login?next=%2Far%2Fsettings%2Fnotifications`
- `/ar/profile/edit` -> `/ar/login?next=%2Far%2Fhealth%2Fprofile`
- `/ar/settings/data` -> `/ar/login?next=%2Far%2Fsettings%2Fprivacy%3Ftab%3Ddata`
- `/ar/settings/feedback` -> `/ar/login?next=%2Far%2Fsettings%2Fhelp%3Ftab%3Dfeedback`
- `/ar/support` -> `/ar/login?next=%2Far%2Fsettings%2Fhelp`
- `/ar/ai/chat-doctor` -> `/ar/login?next=%2Far%2Fappointments`

## Not ranked: Lighthouse failed

Why: `/ar/privacy`, `/ar/terms`, `/ar/refund-policy`, `/ar/telehealth-consent`, `/ar/diagnostics/labs/book` answer **404** on the seeded local stack (the seed has no legal/CMS content, so the pages call `notFound()`); `/ar/consultations/appointments` is a 307 to `/ar/appointments`. They need seeded content before they can be measured.

- `/ar/consultations/appointments`
- `/ar/diagnostics/labs/book`
- `/ar/privacy`
- `/ar/refund-policy`
- `/ar/telehealth-consent`
- `/ar/terms`

## Not measured here

- Admin web (`admin/`) and provider web (provider-app Expo web export): not built in this environment.
- App cold start / time-to-content: waiting for the Maestro pipeline; no in-app timing marks exist to read yet.
- k6: not installed here; `tools/perf/api-inventory.mjs` (Node, sequential) was used instead.

## Fix order (next PRs)

1. Public GETs: `Cache-Control: public, s-maxage, stale-while-revalidate` + a test that private routes send `private`/`no-store`.
2. Alias routes -> `next.config` redirects.
3. CLS 0.13 on the hubs.
4. Lists that ship full bodies (articles, labs/radiology/home-care catalogues): projections.
