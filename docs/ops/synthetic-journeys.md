# Synthetic journeys in production (20.7)

Plan 20.7: "Synthetic journeys in production, every 5-15 minutes: open home, search, open a product, add to cart (no payment), list doctor slots, log in as a test
patient. Verify: an alert fires when a journey fails twice."

## What runs
`deploy/cloudflare/status-worker/journeys.mjs`, called by the status worker's second cron (`*/10 * * * *`), from Cloudflare's edge, in this order:

| Journey | Does | Fails when |
|---|---|---|
| `home` | `GET https://nabd.plus/ar` | not 200, or an empty page |
| `search` | `GET /api/v1/search/suggest?q=<SYNTH_SEARCH_TERM>&locale=ar` | not 200, or no suggestion (the first *medicine* is kept for the next two steps) |
| `product` | opens that medicine's page `/ar/p/<slug>` and `GET /api/v1/medicines/<id>` | either is not 200 |
| `login` | `POST /api/v1/auth/login` as the test patient, then `GET /api/v1/users/me` | no token, or the profile is not 200 (also says if the account asks for 2FA) |
| `cart` | `POST /api/v1/cart/items` (one unit, idempotency key), reads the cart, **removes the line again** | the line is not in the cart, or it could not be removed |
| `doctors` | lists doctors, then `GET /api/v1/care/doctors/<id>/slots` for tomorrow | list or slots not 200, or no slots list |

Never touched: checkout, payment, orders. The only write is one cart line of the test patient, removed in the same run (also when reading the cart failed).
A failing journey is retried once at once (a single dropped request is not a failure; the cart journey, which writes, is not repeated blindly).
Without the test patient's secrets, `login` and `cart` are **skipped**, not failed.

## Alerts ("fires when a journey fails twice")
A journey that fails on two runs in a row (20 minutes) sends **one** message to the owner by Telegram and e-mail, from the worker itself, so it works while the API is down;
"RECOVERED" follows once when it passes again. The failing journey also shows as down on the status page (`status.nabd.plus`) and opens an incident there.
Telegram: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` (worker secrets). E-mail: `RESEND_API_KEY` secret + `OPS_ALERT_EMAIL` and `MAIL_FROM` vars. Each is optional.

## The test patient
A real account that is clearly not a person: name "Synthetic Check (do not contact)", an e-mail on the company domain that nobody reads, a long random password, no
phone, no notifications, no orders ever (the cart is emptied every run). Created once through the normal sign-up by the build session (ops task with the owner's approval); the
identifier and password are the worker secrets `SYNTH_IDENTIFIER` and `SYNTH_PASSWORD`. It must not have 2FA, and it must be excluded from analytics and marketing
lists when those exist. Rotate the password the way any worker secret is rotated.

## If a journey fails
`home`/`product` page: patient-web or the edge worker (`x-nabd-edge`), see `docs/ops/edge-html.md`. `search`: Mongo `search_index` / the kill switch `search_suggestions_enabled`.
`login`: the auth rate limit (10 a minute per IP; one login per 10 minutes is far below it), or the account was disabled. `cart`: the cart API or idempotency store (Redis). `doctors`: care API and the doctors collection.
Use `/admin/logs` (20.3) with the failing time, and `docs/runbooks/api-availability.md`.

## Limits
- It runs from one edge location, not from a phone: it proves the server side of each step, not the app's screens. The app's own crash and error reports are Sentry (20.4).
- It needs the catalogue to contain the test term; if the medicine is renamed, set `SYNTH_SEARCH_TERM`.
- Cost: Workers Free (cron, subrequests: at most 12 per run), KV writes 144 a day for this vantage. No GitHub Actions minutes are used (a 10-minute GitHub schedule would use about 4,000 a month).
