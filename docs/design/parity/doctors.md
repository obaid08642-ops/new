# Parity status: doctors and consultations

Audit: docs/review/walkthrough/parity-doctors.md (56 rows, checked against main on 2026-10-23). Status: fixed (before or in this PR), open (web could do it, not done here), blocked (needs a backend field or an owner decision).

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | doctors list | specialty chips with counts | fixed | busiest 8 specialties as link chips with counts (cached 5 min read, lib/api/specialties-cached.ts); the full select stays |
| 2 | doctors list | advanced filter sheet | blocked (partly fixed) | grade filter built (round 2): link chips for the six degrees send `degree` to GET /care/doctors, kept in the URL and the /q twin; gender and price band have no list parameter [backend] |
| 3 | doctors list | insurance company/network picker | blocked | [owner] picker vs saved-policy filter |
| 4 | doctors list | offers row | blocked | [owner] offers row |
| 5 | doctors list | default visit type | blocked | [owner] accepted difference |
| 6 | doctors list | sort choices | blocked | [owner] accepted difference |
| 7 | doctors list | list length | blocked | [owner] static page keeps no paging |
| 8 | doctors list | available-now badge | blocked | public doctor payload has no is_online field [backend] |
| 9 | doctors list | search box | fixed | the specialty link now carries the slug (41a24690) |
| 10 | specialties | link target | fixed | 41a24690 |
| 11 | specialties | row icon and tone | blocked | [owner] generic tone |
| 12 | doctor detail | stats and tag | fixed | review count tile added; available-now tag blocked like row 8 |
| 13 | doctor detail | clinic link and address | fixed | facility, district, city line linking to the clinic page |
| 14 | doctor detail | visit-type tiles with price | fixed | each mode shows its own price |
| 15 | doctor detail | date picker | fixed | the page now goes to the booking page (one booking path), whose day strip is 30 days |
| 16 | doctor detail | default visit type | fixed | d0da5dfd |
| 17 | doctor detail | bio | fixed | bio section; sub-specialties not shown |
| 18 | doctor detail | info rows | fixed | languages and clinic place added; licence stays a tag; education has no field in the payload [backend] |
| 19 | doctor detail | reviews | blocked | public doctor payload has no review list [backend] |
| 20 | doctor detail | photo zoom, FAQ, share | open | FAQ (cancel and payment, the app's texts) and photo zoom (opens the full image) done; share button [owner] |
| 21 | doctor detail | book CTA | fixed | 'Choose a day and time' goes to the booking page with the visit type |
| 22 | doctor detail | inline booking form | fixed | removed from the page; the component stays only because acceptance/d-31 imports it |
| 23 | doctor detail | inline booking, home | fixed | 288c2fef, and no inline booking at all now |
| 24 | doctor detail | inline booking, slot hold | fixed | the booking page holds the slot (route adds booking_kind) |
| 25 | doctor detail | inline booking, extra fields | fixed | name and phone fields gone with the inline form |
| 26 | booking | fee shown | fixed | db452514 |
| 27 | booking | family member | fixed | member page 'Book a consultation' remembers the member (httpOnly cookie, opaque ref); booking page shows 'Booking for <name>' with a switch back and sends for_member_id |
| 28 | booking | insurance readiness | fixed | saved policy checked on the booking page: ready note, 'Manage insurance' link, blocks submit when none, sends insurance_member_id; provider id [backend] |
| 29 | booking | slot lock request | fixed | the reserve route already adds booking_kind: consultation |
| 30 | booking | confirmation summary | fixed | the booking goes to the appointment page, which carries doctor, date, time, type, fee and payment rows (rows 37-38); no separate success screen by design |
| 31 | booking | home address | fixed | the select shows each saved address in full and the 'Add or edit an address' link is the change action |
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
| 47 | waiting room | wait time, calls switch | fixed | hides the join and says so when GET /config video_calls is false; shows wait_time when the server sends it [backend: never sent]; two-step join [owner] |
| 48 | video call | session start | blocked | web uses call-token; the app's /calls/initiate + join is a different session contract [owner] |
| 49 | video call | end of call | fixed | leaving goes to the rating page |
| 50 | incoming call | incoming screen | blocked | needs a real-time channel the web does not have |
| 51 | post-call rating | request body | fixed | 77140185 |
| 52 | post-call rating | quick tags | fixed | six aspect chips sent as aspects |
| 53 | call history | call again, paging | fixed | 'Call again' opens the waiting room of the call's appointment (none without an appointment); 'Show more' adds 20 per step up to 100 |
| 54 | home visit tracking | steps, map, ETA | fixed | en_route/arrived/rescheduled steps, 30 s refresh, cancelled view; map, ETA, message button blocked (no position field) [backend] |
| 55 | share report | share with a doctor | fixed | per report: search a doctor, share (POST /medical-reports/:id/share), list 'shared with', revoke |
| 56 | doctor chat | conversation view | blocked | [owner] layout difference and decision B27 |
