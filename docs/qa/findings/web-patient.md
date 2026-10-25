# QA findings: patient-web (local stack + read-only nabd.plus)

Stack: local MongoDB rs0, Redis, backend :8002 (`tools/live/start-backend.sh`), admin :3001, patient-web production build :3000 (`pnpm build` + `pnpm start`), test doubles (moto S3, SMTP sink, fake Moyasar, fake SPL, fake ClamAV). Test data only; nothing created on nabd.plus.

Format: `| severity | route | element | steps | expected | actual | file:line |`

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P1 | /en/medicine (308 to /en/c) | whole page (hydration) | Open /en/medicine signed out at 390 or 1280 and wait 15 s | Products load, search and "Add to cart" work | Page stays on "Preparing the page / Just a moment while we load the page" forever. 13 `_next/static/chunks/*.js` are blocked by CSP. `x-nextjs-cache: HIT`. Cached HTML nonce `ZjE4ODNm…` differs from the CSP header nonce `Mzk2OGVj…` | patient-web/proxy.ts:84-96 (public pages are cached and stamped by the nonce server); patient-web/messages/en.json:1037 (loader text) |
| P1 | /en/consultations/doctors | whole page | Open the page signed out | Page hydrates | `x-nextjs-cache: STALE`; the same nonce mismatch; 22 console CSP errors | patient-web/proxy.ts:84-96 |
| P2 | nabd.plus / and /en/doctors | console | Open the page on production | No console errors | `Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/…' violates the following Content Security Policy directive` | patient-web/csp.ts; patient-web/lib/security/csp.ts |
| P2 | nabd.plus / | load speed (read-only, from the sandbox) | Load / | load under 2.5 s | TTFB 1460 ms, load 3573 ms, LCP 2276 ms (one run, sandbox network; not a real-user measure) | patient-web/app/[locale]/page.tsx |
| P2 | nabd.plus /en/medicine | network | Open signed out | No authenticated calls for an anonymous visitor | `401 GET /api/patient/patient/pharmacy/orders` and a console error; the caller was not located in the source | patient-web/components-next/orders/orders-screen.tsx:52 is the orders screen, not medicine (source not confirmed) |
| P2 | /en/login | "Sign in" with empty field | Click Sign in with no input | Visible field-level message (e.g. required) | No visible text appears; the page does not move. Confirm whether the browser's native `required` bubble is the only feedback | patient-web/app/[locale]/login/page.tsx (not yet read) |
| P3 | /en/medicine | "Add to cart" buttons | Inspect the accessible name | Name is the product name | `Add Panadol Extra 500mg d9b63f to cart`: an internal id suffix is in the label | patient-web/components-next/pharmacy/product-grid.tsx:70 |
| P3 | /en/medicine (local, seeded) | product list | Read the list | Real product names | A product named "Review Pending Drug" is shown. Likely seed data, not a product bug. Mark as test data | seed (tools/live/j_*.py) |
| P3 | /en/login | wrong credentials | Enter a valid-looking number and a wrong password | Clear, specific message | Generic "Those details don't match. Check them and try again." Acceptable; no account enumeration | patient-web/app/[locale]/login |

Checked and OK on the local stack (prod build, 390 px, guest, LCP under 330 ms, no textHits, dir ltr/en): /en/login, /en/register, /en/cart (empty state text OK), /en/doctors, /en/insurance, /en/diagnostics, /en/radiology, /en/home-nursing. Cart icon with link to /en/cart is present on /en, /en/medicine, /en/doctors.

Not yet covered: the signed-in journeys (cart with items, checkout, booking, pay, insurance card add), languages ar/ur/hi/bn/fil, dark mode, the admin panel. The seeder is still running.
