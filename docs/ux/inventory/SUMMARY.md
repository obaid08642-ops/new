# UI/UX inventory — summary

GENERATED alongside `docs/ux/inventory/*.csv` by `docs/ux/inventory-generator.mjs`.
Every number below is that script's output; the commands are in the commit message.
Read-only: no product code was changed.

## Totals per app

| app | screens | crawled | interactive | not wired | a11y unnamed | mock data | missing >=3 states | visual issues | merge candidates | hours |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| patient-web | 270 | 196 | 421 | 16 | 17 | 20 | 104 | 161 | 67 | 608 |
| patient-app | 250 | 182 | 1087 | 1 | 146 | 25 | 81 | 232 | 57 | 836 |
| provider-app | 129 | 114 | 1459 | 0 | 98 | 4 | 21 | 114 | 6 | 354 |
| admin | 68 | 57 | 569 | 2 | 85 | 4 | 13 | 23 | 0 | 152 |

## Size distribution and the hours behind them

| app | S | M | L | rate |
| --- | --- | --- | --- | --- |
| patient-web | 253 | 17 | 0 | S:2h M:6h L:14h |
| patient-app | 166 | 84 | 0 | S:2h M:6h L:14h |
| provider-app | 105 | 24 | 0 | S:2h M:6h L:14h |
| admin | 64 | 4 | 0 | S:2h M:6h L:14h |

Redesign work is patient-web + patient-app only. provider-app and admin are audit-only:
- redesign (patient-web + patient-app): **1444 h**
- audit-only (provider-app + admin): **506 h** if the same effort were spent; they are not redesigns.


## The six redesign batches (patient-web + patient-app)

Batch is assigned by route prefix; the rules are printed in the generator. Hours are the formula rate applied to each screen's measured size.

| # | batch | screens | hours |
| --- | --- | --- | --- |
| 1 | Home & navigation | 2 | 8 |
| 2 | Find & book | 75 | 202 |
| 3 | Pharmacy & orders | 76 | 192 |
| 4 | Records & results | 46 | 112 |
| 5 | Account & settings | 42 | 104 |
| 6 | Community, AI & support | 279 | 826 |

## Audit-only fix lists

### provider-app — screens with a real defect signal
  129 screen(s) with unwired, unnamed, or mock signals.
    `ambulance/AmbulanceDashboard` unwired=26 unnamed=0
    `ambulance/AmbulanceRegistration` unwired=30 unnamed=2
    `auth/AuthScreens` unwired=none unnamed=no
    `auth/PendingDashboard` unwired=none unnamed=no
    `doctor/components/DoctorHeader` unwired=none unnamed=no
    `doctor/components/DoctorQueueList` unwired=none unnamed=no
    ... and 123 more in the CSV
### admin — screens with a real defect signal
  68 screen(s) with unwired, unnamed, or mock signals.
    `_app` unwired=0 unnamed=0
    `_document` unwired=none unnamed=no
    `/` unwired=none unnamed=yes
    `admin/ai-control` unwired=5 unnamed=0
    `admin/ambulance-fleet` unwired=7 unnamed=0
    `admin/analytics` unwired=1 unnamed=0
    ... and 62 more in the CSV

## Total

- all four apps at the formula rate: **1950 h**
- redesign only (patient-web + patient-app): **1444 h**
- audit-only (provider-app + admin): **506 h**

## Main risks

1. **`interactive` is the crawler's, not a live count.** The crawl predates some
   routes: patient-web has 270 screens but only 196 have a crawl row. A screen
   with `interactive = 0` means *not crawled*, not *no controls* — and the size
   formula reads that 0 as S. **This inflates S.**

2. **`parity` is mostly `unrecorded`.** It is linked from
   `audit/FINDINGS/parity-matrix.md`, which does not cover every route. An empty
   parity cell means *not stated*, and must not be read as *same*.

3. **`not wired` is a weak signal** — it counts elements with no bind AND no
   handler in the crawl's view. An element that calls a real API through a
   wrapper the crawler cannot see will be counted as wired; one that fetches
   nothing may not. Q5, Q10, Q11, Q12 and Q16 in QA_DEFECTS are the confirmed
   broken wiring; this column is the candidate list, not the verdict.

4. **hours is a formula, not an estimate.** S:2 M:6 L:14 per screen, over measured
   inputs. It has never been checked against anyone actually doing the work. The
   first batch redone is what makes it an estimate; until then it is arithmetic.

5. **`visual` counts issue *kinds*, not instances** — a screen with one raw hex
   and one emoji scores 2, the same as one with forty. And none of it is visual:
   no screenshot was taken. Q12's admin defect was found by a crawl, not by eye.

6. **admin is meant to be mobile-responsive and nothing here measures that.**
   No viewport, no breakpoint, no device column exists. The 68 admin rows say
   nothing about small screens.
