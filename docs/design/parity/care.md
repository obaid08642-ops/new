# Parity: labs, radiology, nursing and home care (parcare)

Audit 2026-10-16, verified against main at ae6bfae1 on 2026-10-23. Status words: fixed (main) = solved before this batch; fixed now = this batch; superseded = replaced by the M6 ordering screens; blocked = needs a backend field or an owner decision (see needs-review/parity-care.json); open = still to do.

## parity-labs-radiology.md (37 rows)

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | /diagnostics | approved labs strip | open | not built; needs the labs list with rating/distance (existing /labs endpoints) - see needs-review |
| 2 | /diagnostics | payment filter (cash) | fixed (main) | hub has self-pay / insurance choice via the M6 context bar; self-pay is the cash option |
| 3 | /diagnostics | filter button and sort sheet | open | no sort/filter sheet on the hub |
| 4 | /diagnostics | search | open | submit still goes to /diagnostics/search (labs only) |
| 5 | /diagnostics | address row | fixed (main) | M6 OrderContextBar shows the saved address with a change link |
| 6 | /diagnostics | add-to-order toggle and cart bar | fixed (main) | AddToBasketIcon + BasketBar |
| 7 | /diagnostics | compare prices shortcut | fixed now | opens /diagnostics/search (a usable list) instead of the empty comparison |
| 8 | /diagnostics | insurance card | blocked (owner) | opens add-policy on purpose (issue 1062); the pre-booking upload form is not built - see needs-review |
| 9 | /diagnostics (radiology) | scan tile centres count and add | open / blocked | tile opens the item page (add there); centres count needs a field the list does not send |
| 10 | /diagnostics/test-detail | description, preparation, fasting, result time | fixed now | redirects to the public order item page /labs/[id]?kind=lab|radiology |
| 11 | /diagnostics/test-detail | footer actions | fixed now | item page has add / book now / providers |
| 12 | /diagnostics/test-detail | loading the test | fixed now | item page reads the single service, public |
| 13 | /diagnostics/search | sign-in | fixed (main) | public |
| 14 | /diagnostics/packages | source and category | fixed now (partly) | reads GET /labs/packages, filters name+category in place; category stays a select built from the packages (no /labs/categories chips) |
| 15 | /diagnostics/packages | search | open | still needs the Apply button |
| 16 | /diagnostics/packages/[packageId] | price footer, saving badge, cart state | fixed now (partly) | add goes to the item page (price, coverage, basket state); no saving badge on the detail itself |
| 17 | /diagnostics/labs, /labs | tap on a test | fixed now | card opens the item page; /diagnostics/labs/book redirects to it |
| 18 | /diagnostics/labs/[labId] | directions, distance, branches | open | not built |
| 19 | /diagnostics/labs/[labId] | test rows locked to the lab | fixed now (superseded) | rows open the item page; the lab is chosen in the M6 providers step |
| 20 | /diagnostics/lab-comparison | content | superseded (M6) | compare lives in /labs/providers (Ord05); legacy page kept - see needs-review |
| 21 | /diagnostics/cart | quantity | superseded (M6) | /labs/basket is the basket; legacy cart kept |
| 22 | /diagnostics/cart | line price and total | superseded (M6) | legacy cart still shows no prices - see needs-review |
| 23 | /diagnostics/cart | lab choice cards | superseded (M6) | providers step of M6 |
| 24 | /diagnostics/checkout | summary and total | superseded (M6) | /labs/confirm |
| 25 | /diagnostics/checkout | home address | superseded (M6) | /labs/when + confirm |
| 26 | /diagnostics/checkout | insurance method | superseded (M6) | booking status handles approval |
| 27 | /diagnostics/checkout | card payment then cart | fixed (main) | cart cleared before the redirect |
| 28 | /diagnostics/insurance-approval | continue after the decision | fixed now | continue / self-pay go to /labs/bookings/[id] (the same order); the old link carried no items |
| 29 | /diagnostics/insurance-approval | upload form without orderId | blocked (backend/owner) | pre-booking insurer/OCR form + booking creation not built; empty state now |
| 30 | /diagnostics/insurance-approval | opened without orderId | fixed now | empty state with the way to the requests (no 404) |
| 31 | /diagnostics/bookings | list: group, amount, one insurance target | open | insurance-upload redirects to approval so there is one target; no grouping or amount |
| 32 | /diagnostics/bookings/[domain]/[bookingId] | results and report, radiology stages | open | not built |
| 33 | /diagnostics/bookings/[domain]/[bookingId] | technician, total, cancel | open | not built |
| 34 | /diagnostics/sample-tracking | home collection without a technician | open | not changed |
| 35 | /diagnostics/book-sample | page | accepted | redirect to the cart kept (as the app's legacy route) |
| 36 | /diagnostics/upload-rx | target | no gap now | the app itself now redirects to the lab search (journeys#59); web matches |
| 37 | /diagnostics/radiology, [serviceId] | add action | fixed now (partly) | detail add goes to the item page (price footer, book now); list tile has no add toggle |

## parity-nursing-homecare.md (21 rows)

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | /home-care (hub) | hub structure | fixed now | search, card/insurance choice, care packages, services list, shortcuts, my bookings on one page |
| 2 | /home-care (hub) | care packages | fixed now | GET /home-care/packages strip; opens the service page |
| 3 | /home-care (hub) | payment flow | fixed now | card/insurance chosen on the hub, carried by ?pay= to service, nurse list, nurse page |
| 4 | /nursing/catalog | filters | fixed now (partly) | gender filter on the nurse list; availability and nationality are ignored by the backend - see needs-review |
| 5 | /home-care (hub) | my bookings rows | fixed (main) | rows open /nursing/visits/[id] |
| 6 | /home-care/services/[serviceId] | preparation | fixed now | preparation_ar/en read from the service |
| 7 | /home-care/services/[serviceId]/book | nurse list | fixed now | cards with facility, rating, years, price, available-now, sort (rating/any); distance + nearest sort blocked (no distance_km) |
| 8 | /home-care/services/[serviceId]/book | prescription notice | fixed now (as a notice) | shown unless the catalogue says no; the app's blocking dialog is not copied |
| 9 | /nursing/nurses/[nurseId] | nurse profile | fixed now | new page: nurse facts + the booking part; provider rows link to it |
| 10 | /home-care/services/[serviceId]/book | repeat visits | blocked (backend/owner) | POST /nursing/bookings has no days field; the app only multiplies the estimate |
| 11 | /home-care/services/[serviceId]/book | transport | no gap (owner decision 42) | no transport choice; the nurse always comes |
| 12 | /home-care/services/[serviceId]/book | price estimate | fixed now (one visit) | visit price line and the amount on the button |
| 13 | /home-care/services/[serviceId]/book | insurance details | fixed now | coverage check shows company and policy; no policy blocks sending and links to add-policy |
| 14 | /home-care/services/[serviceId]/book | address | open | still a select of saved addresses with a map point and an add link; no GPS option |
| 15 | /nursing/insurance-status | decision | fixed (main) | reads insurance_decision / coverage_decision |
| 16 | /nursing/insurance-status | no booking found | fixed now | empty state with the way to the visits |
| 17 | /nursing/insurance-status | refresh | fixed now | re-reads every 30 s while the insurer has not decided |
| 18 | /nursing/visits/[visitId] | live updates | fixed now | re-reads every 15 s while the visit is open, with a manual refresh |
| 19 | /nursing/visits/[visitId] | map | fixed now (link) | 'show the nurse on the map' link when the server sends coordinates; no embedded map |
| 20 | /nursing/visits/[visitId] | nurse contact and directions | fixed now (call) | call link from nurse_phone; directions for a pick-up variant not built |
| 21 | /nursing/visits/[visitId] | completed visit rating | blocked (owner/backend) | the app's button only returns home; no nursing rating endpoint is wired |

Not faked: the ordering backend refuses nursing bookings (service_kind_not_bookable_yet), so the nursing add-to-basket on /nursing/catalog is recorded in needs-review and nothing was built on top of it.
