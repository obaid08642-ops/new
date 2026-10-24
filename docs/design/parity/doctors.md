# Parity status: doctors and consultations

Audit: docs/review/walkthrough/parity-doctors.md (56 rows, checked against main on 2026-10-23). Status: fixed (before or in this PR), open (web could do it, not done here), blocked (needs a backend field or an owner decision).

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | doctors list | specialty chips with counts | open | the page is static and the specialties read is no-store (tests/static-public-pages); needs a cached specialties read |
| 2 | doctors list | advanced filter sheet | open | not built: grade, gender, price band need filter params the list endpoint accepts (to confirm) |
| 3 | doctors list | insurance company/network picker | open | not built |
| 4 | doctors list | offers row | open | not built |
| 5 | doctors list | default visit type | open | different; left (static cached list) |
| 6 | doctors list | sort choices | open | different; web has an extra wait sort |
| 7 | doctors list | list length | open | not built (static page, no paging) |
| 8 | doctors list | available-now badge | blocked | public doctor payload has no is_online field [backend] |
| 9 | doctors list | search box | fixed | the specialty link now carries the slug (41a24690) |
| 10 | specialties | link target | fixed | 41a24690 |
| 11 | specialties | row icon and tone | open | different; generic tone kept |
| 12 | doctor detail | stats and tag | fixed | review count tile added; available-now tag blocked like row 8 |
| 13 | doctor detail | clinic link and address | fixed | facility, district, city line linking to the clinic page |
| 14 | doctor detail | visit-type tiles with price | fixed | each mode shows its own price |
| 15 | doctor detail | date picker | fixed | the page now goes to the booking page (one booking path), whose day strip is 30 days |
| 16 | doctor detail | default visit type | fixed | d0da5dfd |
| 17 | doctor detail | bio | fixed | bio section; sub-specialties not shown |
| 18 | doctor detail | info rows | fixed | languages and clinic place added; licence stays a tag; education has no field in the payload [backend] |
| 19 | doctor detail | reviews | blocked | public doctor payload has no review list [backend] |
| 20 | doctor detail | photo zoom, FAQ, share | open | not built |
| 21 | doctor detail | book CTA | fixed | 'Choose a day and time' goes to the booking page with the visit type |
| 22 | doctor detail | inline booking form | fixed | removed from the page; the component stays only because acceptance/d-31 imports it |
| 23 | doctor detail | inline booking, home | fixed | 288c2fef, and no inline booking at all now |
| 24 | doctor detail | inline booking, slot hold | fixed | the booking page holds the slot (route adds booking_kind) |
| 25 | doctor detail | inline booking, extra fields | fixed | name and phone fields gone with the inline form |
| 26 | booking | fee shown | fixed | db452514 |
| 27 | booking | family member | open | not built |
| 28 | booking | insurance readiness | open | not built |
| 29 | booking | slot lock request | fixed | the reserve route already adds booking_kind: consultation |
| 30 | booking | confirmation summary | open | not built; goes to the appointment page |
| 31 | booking | home address | open | select kept |
| 32 | booking-status | actions | fixed | auto refresh every 30 s while open, edit/cancel link, tracking link for a confirmed home visit |
| 33 | appointments list | statuses in tabs | fixed | ba6a64d7; pending_copay now known, upcoming and open |
| 34 | appointments list | primary action | fixed | visit actions only when confirmed; completed visits get Book again |
| 35 | appointments list | price, book new | fixed | price on the card; the upcoming empty state books a consultation |
| 36 | appointments list | empty per tab | fixed | own title per tab, book action on upcoming only |
| 37 | appointment detail | main action | fixed | waiting room / clinic place / tracking by visit type when confirmed |
| 38 | appointment detail | payment, number, amount | fixed | three rows added |
| 39 | appointment detail | profile link, tips | fixed | profile link; preparation tips not built |
| 40 | appointment detail | co-pay step | fixed | pending_copay card with the amount and a link to the insurance request |
| 41 | appointment detail | rating | fixed | same payload as the app (77140185) |
| 42 | cancel-reschedule | open check | fixed | a closed appointment redirects to its page |
| 43 | cancel-reschedule | new time | fixed | 7-day strip and the doctor's own slots |
| 44 | cancel-reschedule | min time | fixed | no datetime field any more |
| 45 | cancel-reschedule | cancel reason | fixed | six preset reasons, required, stored in Arabic like the app |
| 46 | cancel-reschedule | refund amount, result | fixed | shared price formatter; link to My appointments after the message |
| 47 | waiting room | wait time, calls switch | open | not built |
| 48 | video call | session start | blocked | web uses call-token; the app's /calls/initiate + join is a different session contract [owner] |
| 49 | video call | end of call | fixed | leaving goes to the rating page |
| 50 | incoming call | incoming screen | blocked | needs a real-time channel the web does not have |
| 51 | post-call rating | request body | fixed | 77140185 |
| 52 | post-call rating | quick tags | fixed | six aspect chips sent as aspects |
| 53 | call history | call again, paging | open | not built |
| 54 | home visit tracking | steps, map, ETA | fixed | en_route/arrived/rescheduled steps, 30 s refresh, cancelled view; map, ETA, message button blocked (no position field) [backend] |
| 55 | share report | share with a doctor | open | not built |
| 56 | doctor chat | conversation view | open | different; attachments hidden by decision B27 |
