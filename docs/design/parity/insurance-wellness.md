# Parity status: insurance, emergency, maternity / mental health / nutrition (patient-web vs patient-app)

Verified against the code on main on 2026-10-23 (audit files from 2026-10-16). Statuses: already-fixed (an earlier "[F parity]" commit), fixed (this batch, `design/parity-ins`), blocked (backend or owner), open (web can do it, not done in this batch).
Patient claims stay removed (owner decision 35): only the redirects were checked. Insurance amounts are the server's only; nothing is computed on the web.

## parity-insurance.md (23 rows)

| row | screen | element | status | note |
|---|---|---|---|---|
| 1 | /insurance policy tab | policy card details | fixed | policy number, member name, national id (or member id), network under the card (`PolicyCard details`) |
| 2 | /insurance policy tab | status badge | fixed | from `verified`: "Reviewed" / "In review" (app wording), "No policy" without one |
| 3 | /insurance policy tab | CHI lookup | blocked | app-only WebView of the CHI portal, no web flow or endpoint; needs-review [owner] |
| 4 | /insurance policy tab | change policy in place | fixed now | the add-policy form starts from the saved policy (company, number, member id, name, expiry, network) and shows the insurer's network chips (GET /insurance/companies/:id/networks); the network is sent with the policy |
| 5 | /insurance policy tab | requests list rows | fixed | title by booking kind, price and date, state pill (request number / provider name are not in the app rows) |
| 6 | /insurance policy tab | "view all" link (board) | blocked | no full-list screen exists anywhere; needs-review [owner] |
| 7 | /insurance all tabs | decision-35 note | fixed | shown under every tab |
| 8 | /insurance benefits tab | usage summary | fixed | requests count, insurer covered, you paid, expiry from /insurance/benefits-summary `usage` |
| 9 | /insurance benefits tab | board shortcut "benefits" | no change | the app has only the coverage and network tiles; Benefits stays a tab on both |
| 10 | /insurance network tab | type filter | fixed | chips all / doctor / hospital / pharmacy / lab (`NetworkList`) |
| 11 | /insurance network tab | provider rows | fixed | type, up to 3 specialties, city, call (`tel:`) button |
| 12 | /insurance network tab | query filters | already-fixed | 14067cce (network and class passed) |
| 13 | /insurance network tab | search | fixed | live client filter on name and city, no reload |
| 14 | /insurance/add-policy | scan the card | fixed | file/camera input, new route `POST /api/insurance/ocr-extract` (whitelists the five fields), fills the form |
| 15 | /insurance/add-policy | optional fields | fixed | only filled fields are sent (`policyOptionals`) |
| 16 | /insurance/coverage-check | service types | already-fixed | e1354775 |
| 17 | /insurance/coverage-check | provider field | fixed | optional `service_key` as the app |
| 18 | /insurance/coverage-check | result | fixed | copay %, cap, pre-auth pill with support link, reason, check again; shown only when the server sends them (needs-review [backend]: the engine handler does not) |
| 19 | /insurance/requests/[id] | policy panel | fixed | insurer and policy number from GET /insurance/my-policy |
| 20 | /insurance/requests/[id] | view booking target | already-fixed | 7de3b97f |
| 21 | /insurance/requests/[id] | pay step | fixed | one button "Go to secure payment - amount" (server copay / self-pay amount); with one method the checkout starts at once, with several the methods show |
| 22 | /insurance/requests/[id] | not found / no access | fixed | in-page empty state with a way back to the hub |
| 23 | /insurance/payment-split | opened without request_id | already-fixed | aea0889a |

## parity-emergency.md (2 rows)

| row | screen | element | status | note |
|---|---|---|---|---|
| 1 | /emergency | signed-out access | already-fixed | 46d8b059 (public read, only the share action needs sign-in) |
| 2 | /emergency | backend throw | fixed | `callPatientApi(...).catch` gives the same in-page error with retry; the share action stays |

## parity-maternity-mental-nutrition.md (17 rows)

| row | screen | element | status | note |
|---|---|---|---|---|
| 1 | /maternity pregnancy | estimate pill | fixed | hero badge |
| 2 | /maternity pregnancy | board quick actions (due-date calculator, follow-ups) | blocked | no such screens in app or web; needs-review [owner] |
| 3 | /maternity pregnancy | "all articles" link | fixed | section action to /articles |
| 4 | /maternity ovulation | day-of-cycle ring and length | fixed | ring "day x of y", "N days" line (same count as the app) |
| 5 | /maternity | two notices | fixed | path notice (pregnancy / cycle) plus the urgent-care safety notice |
| 6 | /maternity/maternity-setup | notices | fixed | path-specific warning plus "not contraception" |
| 7 | /mental-health/mood | tags | fixed | six tag chips, sent as `tags` |
| 8 | /mental-health/mood | energy and stress | fixed | 1-5 tiles |
| 9 | /mental-health/mood | history rows | fixed | note and tags shown (the parser used to drop them) |
| 10 | /nutrition today | remaining calories | fixed | hero line |
| 11 | /nutrition today | macros | fixed | protein / carbs / fat tiles, only when the server sends them |
| 12 | /nutrition today | water | fixed | progress bar with target (when set) and +250 / +500 ml buttons |
| 13 | /nutrition today | no calorie target | fixed | button to the Target tab |
| 14 | /nutrition today | meal protein | fixed | |
| 15 | /nutrition today | safety notice | fixed | |
| 16 | /nutrition plan | needs a profile | fixed | button to `?tab=target` after the error |
| 17 | /nutrition/log-meal | macro fields | fixed | protein, carbs, fat, fiber (optional, sent when filled) |

Totals: 42 rows. already-fixed 5, fixed now 32, blocked 3 (insurance 3 and 6, maternity 2; all owner decisions), open 1 (insurance 4, a client follow-up), no change needed 1 (insurance 9).
