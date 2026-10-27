# QA findings: patient-web (local stack + read-only nabd.plus)

Stack: local MongoDB rs0, Redis, backend :8002 (`tools/live/start-backend.sh`), admin :3001, patient-web production build :3000 (`pnpm build` + `pnpm start`), test doubles (moto S3, SMTP sink, fake Moyasar, fake SPL, fake ClamAV). Test data only; nothing created on nabd.plus. Local QA patient registered with `tools/live/j_accounts.app_signup` (local DB only).

Format: `| severity | route | element | steps | expected | actual | file:line |`

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P1 | /en/c (medicine category; /en/medicine 308s here), /en/p/<slug> (product detail), /en/consultations/doctors | whole page (hydration) | Open the page, anonymous or signed in, wait 10 s | Page hydrates; products and "Add to cart" work | Stuck on "Preparing the page / Just a moment while we load the page". 22-26 CSP console errors: `_next/static/chunks/*.js` blocked, "nonce-… 'strict-dynamic'". On /en/c the HTML nonce (`ZjE4ODNm…`) differs from the CSP header nonce (`Mzk2OGVj…`). Same result signed in (no-store path), so cache HIT/STALE is not the only cause. Blocks the whole web pharmacy cart flow. Login, dashboard and search do hydrate | patient-web/proxy.ts:84-96 (nonce stamping path for public pages) |
| P1 | /en/cart checkout | cart to checkout | Could not run: no add-to-cart control reachable (see row above) | | | |
| P2 | nabd.plus / and /en/doctors | console | Open on production | No console errors | `Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/…' violates the following Content Security Policy directive` | patient-web/proxy.ts (CSP header) |
| P2 | nabd.plus / | load speed (read-only, sandbox network) | Load / | Load under 2.5 s | TTFB 1460 ms, load 3573 ms, LCP 2276 ms (one run; not a real-user measure) | (home route, source not yet located) |
| P2 | nabd.plus /en/medicine | network | Open signed out | No authenticated call for an anonymous visitor | `401 GET /api/patient/patient/pharmacy/orders` plus a console error. Caller not located | patient-web/components-next/orders/orders-screen.tsx:52 is the orders screen, not confirmed as the caller |
| P2 | /en/search?q=panadol (390 px) | cart icon in header | Open the page at 390 px | Cart icon with count visible on every page (brief requirement) | No visible cart link at 390 px on search; at 1280 px it is visible. Confirm whether mobile reaches the cart only through the menu | header component (not yet located) |
| P2 | /en/login | "Sign in" with empty field | Click Sign in with no input | Visible field-level message | No visible text appears; the page does not move. Not yet confirmed whether the browser's native `required` bubble is the only feedback | patient-web/app/[locale]/login/page.tsx (not yet read) |
| P3 | /en/search, /en/c | product names and "Add … to cart" labels | Read names | Product name only | Visible name "Panadol Extra 500mg d9b63f" and aria label "Add Panadol Extra 500mg d9b63f to cart" include an internal id suffix | patient-web/components-next/pharmacy/product-grid.tsx:70 |
| P3 | /en/c (local seed) | product list | Read the list | Real product names | "Review Pending Drug" shown. Likely seed data. Confirm | seed (tools/live/j_*.py) |
| P2 | backend, seed journey "pharmacy order: patient picks the offer and confirms" | cash on delivery, first order | Run tools/native/seed.py | Journey passes: D-25 says cash on delivery is refused on a first order | Backend returns `201 {"ok": true, "status": "cod_due_on_delivery"}`. Journey expects refusal. One of the two is wrong; needs a decision | tools/live/j_pharmacy.py:188-196 (test); backend order code not yet located |
| P3 | /en/login | wrong credentials | Enter a number and a wrong password | Clear, specific message | Generic "Those details don't match. Check them and try again." Acceptable | patient-web/app/[locale]/login/page.tsx |

Checked and OK on the local stack, prod build (guest unless stated): /en/login, /en/register, /en/cart (empty state text OK), /en/doctors, /en/insurance, /en/diagnostics, /en/radiology, /en/home-nursing. LCP 110-320 ms on the local build. Sign-in with a registered patient works (lands on /en/dashboard). Search "panadol" returns 5 results.

Not yet covered: cart with items, checkout, booking, payment, insurance card add, languages ar/ur/hi/bn/fil, dark mode, admin panel.

## Languages and direction (local stack, 390 px)

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P3 | /fil/login | "Password" label | Open the page in Filipino | Filipino word, or a deliberate loanword agreed with the translation owner | English word "Password" in the field label (messages/fil.json:153 sets it on purpose). Translation owner to decide | patient-web/messages/fil.json:153 |

OK: dir is rtl for ar and ur, ltr for hi, bn, fil; no raw translation keys or `undefined`/`NaN`/`[object Object]` on /login and /doctors in all six locales; titles are localised. Not yet checked: dark mode, 1280 layout on non-English pages, Urdu/Arabic layout beyond the login page.

## Insurance (add policy, signed-in QA patient, local stack)

Evidence: `POST /api/insurance/policy` returned 200 with body `{"company_id":"a3f5d742-…","policy_number":"QA-POL-1792899011567","copay_percent":20,"copay_cap_sar":500}`. Reload of /en/insurance shows "QA-POL-…" (persists). MongoDB `nabd_live.patient_profiles`: `insurance` subdocument has company_code `bupa`, policy_number, saved_at, verified false, but **no copay_percent and no copay_cap_sar**.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P1 | /en/insurance/add-policy → POST /api/insurance/policy | "Your share, %" and "Maximum per item, SAR" | Fill share 20 and max 500, save, read the DB | Both values stored; estimates use them | 200 OK, values sent, not stored: the PatientProfile insurance sub-schema has no copay fields, so strict mode drops them silently. Copay estimates will be wrong or absent | backend/src/schemas/patient-profile.schema.ts:81-100 (sub-schema); backend/src/modules/insurance-engine/insurance-engine.module.ts:299-306 (writes them) |
| P1 | same | save path | Two save paths exist (insurance-engine and insurance.module savePolicy at backend/src/modules/insurance/insurance.module.ts:359) that build different insurance objects | One path, one shape | Two writers of the same field with different shapes; which one the web uses is confirmed by the stored document (engine shape) | backend/src/modules/insurance/insurance.module.ts:359 |
| P2 | /en/insurance/add-policy | class / category under company | Look for a class field after choosing the company | Company → class → copay, as the brief specifies | No class field in the form, though the backend accepts `plan_class` | patient-web add-policy page (file not yet located) |
| P3 | /en/insurance/add-policy | company list | Read the list | Real insurer names only | Four test-named insurers ("Insure ins2a757", "Insure insfe238", "Insure ins4eb7f", "Insure insea7d1") in the list; likely seeded test data, confirm | seed data (tools/live) |
| P3 | /en/insurance (after save) | company name | Read the card | Name in the page language | Arabic name "بوبا العربية" shown on an English page | backend stores name_ar as company_name (insurance-engine.module.ts:291) |


## CORRECTION (16:50 UTC): hydration P1 was a local-setup error, not a product defect

The CSP/nonce hydration failure on /en/c, /en/p/<slug>, /en/consultations/doctors (first reported as P1) came from running patient-web with plain `next start`. Production runs `node server/nonce-server.mjs` in front of the standalone Next server (deploy/docker/Dockerfile.patient-web:52). Without it, the public pages carry no script nonce, and cached HTML has a stale nonce. The app itself printed this warning at start: "patient-web is not running behind server/nonce-server.mjs".

Re-tested on the production layout (nonce server on :3000, standalone Next on :3999, twice): /en/c, /en/consultations/doctors and /en/medicine all hydrate, 0 CSP errors, no stuck loader. The P1 is closed as a test-setup error. Production behaviour was also observed read-only earlier and showed no chunk errors.

Lesson for the sweep: all results recorded under plain `next start` (the anonymous static sweep and the first signed-in sweep) must be treated as provisional. The signed-in sweep is being rerun on the production layout.

## A-07: 8-character sign-up with e-mail returns otp_required (test run 2026-10-27)

| Sev | Where | What happens | Expected |
|---|---|---|---|
| P2 | `backend/src/modules/auth/auth.service.ts:884` (register, `otp_required` check) with `patient-web/app/api/auth/register/route.ts:45` (proxy) | A browser sign-up with a valid 8-character password and terms accepted gets `400 otp_required` on the second attempt of the same run. The request body is the same shape that gets a 2xx for A-02 (`name`, `identifier`, `password`, `locale`, `consents` terms and privacy v1). The difference is server-side state (the one-time-code marker in Redis, `otpVerifiedKey`), not the request. | Either the sign-up is accepted with the same inputs, or the website shows the code step before the register request. Owner or S to confirm which. |

Evidence: `tools/live/j_web_qa_password_rule.py` first half passes (7 characters refused on the website, no request sent, no MongoDB row). The second half fails as above. `tools/live/j_web_qa_signup.py` (A-02) passes on the same stack.

## A-13: support chat thread is empty after a reload (test run 2026-10-27)

| Sev | Where | What happens | Expected |
|---|---|---|---|
| P2 | `patient-web/components-next/support-chat-client.tsx:17` (`parseHistory`, `list` looks for `data`, `messages` or `history` on the root) | The server returns a top-level array (`GET /api/patient/support/chat` = `[{id, from, text, time, isBot}]`). The parser reads the array's own keys, finds no list, and returns []. After any reload the page shows only the greeting; the sent messages are not drawn, although they are stored (MongoDB `supportrequests`) and returned by the API. | The thread of earlier messages is shown after a reload. |

Evidence: `tools/live/j_web_qa_support.py`: 9/10 steps pass (sign-in, POST 2xx, bubble on screen, MongoDB thread row, `GET /support/chat/messages` read-back). The reload step fails. A diagnostic run showed the history GET returns the message with status 200 while the page shows 0 matches. The journey is not in `gate_order.txt` until the client is fixed (design or client owner).

## A-14: a legal page stays 404 for an hour after its policy is published (test run 2026-10-27)

| Sev | Where | What happens | Expected |
|---|---|---|---|
| P2 | `backend/src/modules/legal/legal.module.ts:166` (`GET legal/policy/:key`) | With no policy row the endpoint answers `200 OK` with an empty body, not 404. | `404` when the policy does not exist. |
| P2 | `patient-web/lib/api/public-read.ts:16,21-22` (`readPublicEntity`, `next: { revalidate: 3600 }`) | The empty 200 is read as `null` and cached by Next's fetch cache for 3600 s. The terms, privacy and refund pages then answer 404 even after the policy is published, until the cache expires. | The page shows the policy as soon as it exists (or the cache is not kept for a missing policy). |

Evidence: `tools/live/j_web_qa_legal.py`. On a stack where the pages were visited before the policies existed, the API read-back passes (text present) while the six pages answer 404. Clearing the Next fetch cache of the local standalone build (`.next/cache/fetch-cache`) and restarting patient-web makes the same run pass 29/29. The journey seeds the policies before it visits the pages, so it passes on a fresh stack.

Seed note: the local test database holds the seeded policy text, marked "QA test data" (admin route `PUT /admin/admin/legal/policy/:key`). Production was not touched.
