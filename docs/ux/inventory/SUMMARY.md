# UI/UX inventory — summary

GENERATED alongside `docs/ux/inventory/*.csv` by `docs/ux/inventory-generator.mjs`.
Every number below is that script's output; the commands are in the commit message.
Read-only: no product code was changed.

## Corrections to the first hand-off

Four of the five gaps reported with this inventory were **my own verification
errors, not defects in the data.** Recording them because they are the same failure
mode as the phase-12 blocker:

- The column header row is **line 11**, not 12. `slice(12)` dropped one row and made
  `patient-app` read 249 against the generator's 250.
- `l.split(',').pop()` cannot find the last column when earlier fields are quoted,
  and `purpose` and `batch` both contain commas. That made a correct file read as
  **0 rows**.
- `awk -F,` reported `parity` as `AI & support"` for 145 rows — the batch name's
  comma shifting every column. The CSV was fine; the measurement was not.

Corrected counts, quote-aware parse: **270 + 250 + 129 + 68 = 717.**

So the real remaining gaps are **two**, not five: `parity` is unmeasured for every
patient route (above), and `admin`'s mobile-responsiveness has no column because
nothing here takes a viewport.

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

## Corrections to the first hand-off

Four of the five gaps reported with this inventory were **my own verification
errors, not defects in the data.** Recording them because they are the same failure
mode as the phase-12 blocker:

- The column header row is **line 11**, not 12. `slice(12)` dropped one row and made
  `patient-app` read 249 against the generator's 250.
- `l.split(',').pop()` cannot find the last column when earlier fields are quoted,
  and `purpose` and `batch` both contain commas. That made a correct file read as
  **0 rows**.
- `awk -F,` reported `parity` as `AI & support"` for 145 rows — the batch name's
  comma shifting every column. The CSV was fine; the measurement was not.

Corrected counts, quote-aware parse: **270 + 250 + 129 + 68 = 717.**

So the real remaining gaps are **two**, not five: `parity` is unmeasured for every
patient route (above), and `admin`'s mobile-responsiveness has no column because
nothing here takes a viewport.

## Total

- all four apps at the formula rate: **1950 h**
- redesign only (patient-web + patient-app): **1444 h**
- audit-only (provider-app + admin): **506 h**

## Main risks

1. **`interactive` is the crawler's, not a live count.** The crawl predates some
   routes: patient-web has 270 screens but only 196 have a crawl row. A screen
   with `interactive = 0` means *not crawled*, not *no controls* — and the size
   formula reads that 0 as S. **This inflates S.**

2. **`parity` is empty for every patient route — the link failed, and the cell now
   says so.** `audit/FINDINGS/parity-matrix.md` has **no route column at all**: 13
   rows keyed by Arabic workflow name (`دفع الصيدلية`, `حجز الاستشارات`), not by
   path. There was nothing to match a route against, so every patient row landed on
   `unrecorded`. The cell now reads `UNLINKED: ...` rather than a plausible value,
   because a blank or an optimistic `same` would have been read downstream as
   "verified equivalent" — the exact failure this file exists to prevent.
   **Parity between the two patient clients is therefore entirely unmeasured here**,
   and it is the largest single gap in this inventory.

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
