# Parity: health and family (design/parity-health)

Verified against main on 2026-10-23. Work list: docs/review/walkthrough/parity-family.md (19 rows) and parity-health-records.md (41 rows).

### Family (parity-family.md)

| # | screen | element | status | PR note |
|---|---|---|---|---|
| 1 | /family | empty state: join existing | fixed now | CreateFamily has Join an existing family |
| 2 | /family | create group default name | fixed now | sends FamilyWeb.defaultName |
| 3 | /family | owner permission badge | fixed now | no badge on the owner row |
| 4 | /family | pending request approve sheet | fixed now | per-permission allow/refuse, sends permissions, date |
| 5 | /family | request reply feedback | fixed now | success notice |
| 6 | /family | permission set of 9 | fixed now | PERMISSION_KEYS has nine, labels from the app |
| 7 | /family/add | invite code on open | fixed now | created on open, retry |
| 8 | /family/add | invite QR | blocked [owner] | no QR library in package.json; adding one needs approval (needs-review) |
| 9 | /family/add | invite share | fixed now | navigator.share, else copy |
| 10 | /family/add | invite permissions note | fixed now | info block |
| 11 | /family/add | join relation chips | fixed now | six chips, Arabic value sent as the app does |
| 12 | /family/add | join code input/button | fixed now | upper-case, disabled when empty, scan shortcut |
| 13 | /family/add | join success state | fixed now | joined state with button to the hub |
| 14 | /family/[member] | owner permissions tab locked | fixed now | locked state, no remove |
| 15 | /family/[member] | request fallback | fixed now | POST /family/permissions/request via new route handler |
| 16 | /family/[member] | vitals and age | fixed now | vitals facts section and age in the header |
| 17 | /family/[member] | book / chat buttons | blocked [client] (chat fixed) | Chat added; Book needs for_member_id in the web consultation booking flow (backend accepts it); consultations session (needs-review) |
| 18 | /family/[member] | member did not share | already fixed | 29380f74 |
| 19 | /family/calendar | add and delete events | fixed now | form sheet, delete with confirm, type icons, new route handlers |

### Health records (parity-health-records.md, in file order)

| # | screen | element | status | PR note |
|---|---|---|---|---|
| 1 | /health | load failure | fixed now | vitals part says so in place |
| 2 | /health | score card | fixed now | ring, status pill, labelled components, recommendation, link to vitals |
| 3 | /health | chronic and trends rows | fixed now |  |
| 4 | /health | second group of six rows | fixed now |  |
| 5 | /health | wearables row | blocked | owner decision F20 (needs-review) |
| 6 | /health/records | reports kind filter and icons | fixed now |  |
| 7 | /health/records | reports flags | fixed now | important / new chips |
| 8 | /health/records | reports from providers | fixed now | GET /health/reports |
| 9 | /health/records | prescription card actions | partly fixed | order and share added; purchased/OCR pills blocked [backend] (needs-review) |
| 10 | /health/records | prescriptions data source | blocked | needs-review [backend] |
| 11 | /health/records | reports empty/403/404 | already fixed | 03b9b203 |
| 12 | /reports/[id] | type and critical pills, lab results | partly fixed | pills added; lab categories blocked [backend] (needs-review) |
| 13 | /reports/[id] | share | fixed now |  |
| 14 | /reports/[id] | empty report | fixed now |  |
| 15 | /reports/[id] | data source | blocked | needs-review [backend] |
| 16 | /reports/passport | QR code | blocked [owner] | same QR decision (needs-review) |
| 17 | /reports/passport | profile summary | open [owner] (round 2: left to the owner) | owner decision on what is shared (needs-review) |
| 18 | /reports/passport | share | open [owner] (round 2: left to the owner) | needs-review [owner] |
| 19 | /prescriptions | duplicate list | fixed now | redirects to /health/records?tab=prescriptions |
| 20 | /prescriptions | list row content / 403 | already fixed + fixed now | 61815510; card actions now on the records tab; purchased/OCR pills are row 9 [backend] |
| 21 | /prescriptions/[id] | back and share | fixed now | back to the records tab, Share added |
| 22 | /prescriptions/[id] | not-orderable state | blocked | accepted difference (needs-review [owner]) |
| 23 | /health/vitals | add reading: when/source/type | fixed now | context chips, source manual, default type from ?vital= |
| 24 | /health/vitals | today tiles link | fixed now | tiles open that vital's history |
| 25 | /health/vitals | history chips + limit + translated context | fixed now |  |
| 26 | /health/vitals | trends chart/range/stats | fixed now (round 2) | chip per vital, value + in/out-of-range pill, normal range, line chart (inline SVG, service tone), highest/lowest/average/count tiles, share; range pill [owner] confirm (needs-review) |
| 27 | /health/vitals | sheet entry placement | accepted difference (round 2) | toolbar button kept on vitals, medications and sleep; [owner] (needs-review) |
| 28 | /health/medications | today: ring, skip, time, prescriptions link | fixed now (round 2) | ring with percent, skip, times in the reader's clock, timeline heading with link to All, link to the prescriptions tab |
| 29 | /health/medications | all reminders row content | fixed now (round 2) | chronic pill, instructions, formatted times, Pause reminder (PATCH active:false, confirm) instead of hard delete; Sync alerts not drawn [owner] (needs-review) |
| 30 | /health/medications | refills tab content | fixed now (round 2) | active chronic only, confirm, success with Track order link to /pharmacy/broadcast-status, no-address message with link to the address book |
| 31 | /health/medications | refill feedback | fixed now | success notice |
| 32 | /health/medications | chronic tab actions | fixed now (round 2) | start refill (when due), Defer 3 days (POST .../refill/snooze), Stop refill tracking (.../refill/cancel, confirm); two new route handlers |
| 33 | /health/medications | empty state action | fixed now | Add reminder |
| 34 | /health/medications | load error | already fixed | 0792af9d |
| 35 | /health/profile | tabs | fixed now (round 2) | ?tab=basics\|conditions\|emergency; redirects, family and passport links moved from #anchors to the tabs |
| 36 | /health/profile | profile photo | fixed now (round 2) | Change photo: POST /api/health/avatar uploads to /media/upload (avatars) and PATCHes /users/me/profile avatar_url |
| 37 | /health/profile | basics fields | fixed now (round 2) | nine blood-type chips, height, weight, gender choice, pregnant / breastfeeding / smoker switches |
| 38 | /health/profile | follow-up conditions detail | blocked [backend] | GET /health/chronic-diseases returns only id, name, controlled:null, source (needs-review) |
| 39 | /health/sleep | last night and week | fixed now (round 2) | quality pill, last-seven-days bars with average, sleep tips from articles tagged sleep (GET /articles?tag=sleep&limit=4) |
| 40 | /health/sleep | add night placement | accepted difference (round 2) | now a sheet like the app, opened from the toolbar button (?add=1); [owner] (needs-review) |
| 41 | /health/wearables | devices | blocked | owner decision F20 (needs-review) |
