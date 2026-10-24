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
| 8 | /family/add | invite QR | blocked | needs-review: no QR library |
| 9 | /family/add | invite share | fixed now | navigator.share, else copy |
| 10 | /family/add | invite permissions note | fixed now | info block |
| 11 | /family/add | join relation chips | fixed now | six chips, Arabic value sent as the app does |
| 12 | /family/add | join code input/button | fixed now | upper-case, disabled when empty, scan shortcut |
| 13 | /family/add | join success state | fixed now | joined state with button to the hub |
| 14 | /family/[member] | owner permissions tab locked | fixed now | locked state, no remove |
| 15 | /family/[member] | request fallback | fixed now | POST /family/permissions/request via new route handler |
| 16 | /family/[member] | vitals and age | fixed now | vitals facts section and age in the header |
| 17 | /family/[member] | book / chat buttons | blocked (chat fixed) | Chat added; Book needs for_member_id in the web booking flow (needs-review) |
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
| 9 | /health/records | prescription card actions | partly fixed | order and share added; purchased/OCR pills blocked (needs-review) |
| 10 | /health/records | prescriptions data source | blocked | needs-review [backend] |
| 11 | /health/records | reports empty/403/404 | already fixed | 03b9b203 |
| 12 | /reports/[id] | type and critical pills, lab results | partly fixed | pills added; lab categories blocked (needs-review) |
| 13 | /reports/[id] | share | fixed now |  |
| 14 | /reports/[id] | empty report | fixed now |  |
| 15 | /reports/[id] | data source | blocked | needs-review [backend] |
| 16 | /reports/passport | QR code | blocked | needs-review: no QR library |
| 17 | /reports/passport | profile summary | open (not done, budget) | owner decision on what is shared (needs-review) |
| 18 | /reports/passport | share | open (not done, budget) | needs-review [owner] |
| 19 | /prescriptions | duplicate list | fixed now | redirects to /health/records?tab=prescriptions |
| 20 | /prescriptions | list row content / 403 | already fixed + partly fixed | 61815510; card actions now on the records tab |
| 21 | /prescriptions/[id] | back and share | fixed now | back to the records tab, Share added |
| 22 | /prescriptions/[id] | not-orderable state | blocked | accepted difference (needs-review [owner]) |
| 23 | /health/vitals | add reading: when/source/type | fixed now | context chips, source manual, default type from ?vital= |
| 24 | /health/vitals | today tiles link | fixed now | tiles open that vital's history |
| 25 | /health/vitals | history chips + limit + translated context | fixed now |  |
| 26 | /health/vitals | trends chart/range/stats | open (not done, budget) | no chart component on the web |
| 27 | /health/vitals | sheet entry placement | open (not done, budget) | placement only |
| 28 | /health/medications | today: ring, skip, time, prescriptions link | partly fixed | skip added; ring, formatted time, prescriptions link open |
| 29 | /health/medications | all reminders row content | open (not done, budget) | chronic pill, instructions, stop |
| 30 | /health/medications | refills tab content | partly fixed | chronic only + confirm; tracking link / address handling open |
| 31 | /health/medications | refill feedback | fixed now | success notice |
| 32 | /health/medications | chronic tab actions | open (not done, budget) | defer 3 days / stop tracking not added |
| 33 | /health/medications | empty state action | fixed now | Add reminder |
| 34 | /health/medications | load error | already fixed | 0792af9d |
| 35 | /health/profile | tabs | open (not done, budget) | anchors kept |
| 36 | /health/profile | profile photo | open (not done, budget) |  |
| 37 | /health/profile | basics fields | open (not done, budget) |  |
| 38 | /health/profile | follow-up conditions detail | open (not done, budget) |  |
| 39 | /health/sleep | last night and week | open (not done, budget) |  |
| 40 | /health/sleep | add night placement | open (not done, budget) | placement only |
| 41 | /health/wearables | devices | blocked | owner decision F20 (needs-review) |
