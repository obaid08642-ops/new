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
