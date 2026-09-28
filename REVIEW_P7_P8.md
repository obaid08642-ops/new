# Review: Phase 7, Phase 8, the R6 items, LJ-01..LJ-10 and part of Phase 9 (reviewer, 2026-09-28)

**Scope:** `fix/audit-2026-09` at `bbf401a`, which includes:
- Phase 7 (F24–F37) and Phase 8 (F69–F79);
- the Phase 6 review items R6-1..R6-9;
- the live-journey findings LJ-01..LJ-10;
- the gate fixes asked for on 2026-09-28;
- the Phase 9 refactors that were pushed early (F50, F51, F53, F78).

## Verdict
**Merged with reviewer fixes. Not everything is complete:** see "FAIL — mandatory for the agent" below.

The agent's claim "full gate green on a fresh DB" was checked independently and is **true** for the journeys. On a fresh database:
- P1: 0 of 368 admin/provider write routes answered a patient token;
- gate journeys and the extra journeys (`j_insurance`, `j_returns`, `j_chat`, `j_admin_ops`): 100%.

Four claims were not true:
- **R6-9 (admin click tests) never ran.** `j_admin_clicks.py` skipped with a PASS when no Chromium was found, so its "1/1 passed" was a skip. Run in a real browser (`CHROMIUM=/opt/pw-browsers/chromium`) it fails **6/13**:
  - browser login does not reach a console page;
  - the specialties, labs and medicines flows time out;
  - the reports page has no CSV or XLSX link.
  It is removed from `run_gate.sh` until it is green.
- **F33 was marked "verified: jobId already `deliver:${id}`".** That is the defect the task describes. BullMQ rejects a custom id with a single `:` ("Custom Id cannot contain :"), so **every** notification fell back to direct delivery, with no retry and no delay: scheduled reminders went out immediately. The backend log showed 110 such errors in one gate run.
- **The backend unit tests were not green at `bbf401a`:** 2 failed (search-intent analytics).
- **One journey check was weakened** with a wrong reason. "Admin catalog lists tests" was relaxed to `r.ok` because "a fresh DB starts empty". A fresh DB has 101 lab tests from the catalog seed. The check is restored.

## Reviewer fixes (small, done here)
- **F33:** notification job id `deliver-${id}`. The new test runs BullMQ's own option validation, and fails with the old id.
- **Search-intelligence endpoint** (rewritten in R6-2):
  - `?locale[$ne]=x` reached Mongo as an operator (NoSQL injection); now `{ $eq: String(locale) }`, with a test;
  - `top_specialties` was hard-coded to `[]`, so the page showed its placeholder text; restored from `query_analytics`;
  - a misplaced doc comment fixed; the 2 failing tests updated to the new pipeline.
- **Insurance claims:** a pharmacy claim looked up the legacy `orders` collection. It now uses `pharmacy_orders`, with the owner in `patient_account_id` and the amount in `totals.total` (test added).
- **Admin catalog manager (R6-6):** creating an insurance network sent `level`, which the DTO rejects. It now sends `tier_level` and requires the Arabic name.
- **Schema:** `ProviderBankAccount.reviewed_at` is now declared (it was written on approval and silently dropped).
- **Audit tool:** `tools/audit/clientbodies.js` still mirrored the pre-R6-2 BFF rewrite rules, so admin calls were checked against the wrong routes (coverage dropped from 317 to 264). It now uses the 1:1 mapping (327 calls checked).
- **The patient app did not build.** The P8 insurance screen merge moved `claim-tracking.tsx` and `refund-status.tsx` into `src/components/insurance/` without fixing their relative imports (`../context/AppContext`, `../utils/api`). `tsc` passed, but `expo export` (the CI "Patient Mobile build") failed. Imports fixed and the export succeeds. For the agent: run `npx expo export` for the patient app before a gate note; `tsc` alone does not catch this.
- **Harness:** `j_admin_clicks.py` accepts `CHROMIUM=<path>`; `j_lab` catalog check restored; `run_gate.sh` no longer counts the click test.

## FAIL — mandatory for the agent
| # | Item | Problem | Do |
|---|---|---|---|
| R7-1 | R6-9 | The admin click tests fail 6/13 in a real browser (see above). | Make `CHROMIUM=/opt/pw-browsers/chromium python3 tools/live/j_admin_clicks.py` green. A missing browser must be a FAIL, not a PASS. Then add it back to `run_gate.sh`, and install Python Playwright plus Chromium in the CI `live` job. |
| R7-2 | F76 | The return request "attach photo" button only appends the text `صورة 1` to a list: no camera, no upload, nothing sent. This is a fake UI. | Use `expo-image-picker` (camera and library), upload to `/media/upload`, and send the URLs in `attachments[]`. Verify: the stored return has real image URLs. |
| R7-3 | Fake data (provider app) | `LabDashboard.tsx` `HomeCollection` shows 3 hard-coded collectors (`خالد المالكي`…). It counts ETA and distance down on a timer and POSTs those fake values to `/labs/bookings/:id/gps`, where the patient sees them as tracking. | Use the lab's real technicians from the API and the device's real location (`expo-location`). Send GPS only from the real device. |
| R7-4 | LJ-02 on the web | The web claim form (`patient-web/app/api/insurance/claims/route.ts` + `insurance-submit-claim-form.tsx`) sends `claim_type`/`description` plus `status` and `submitted_at`. The backend rejects this: it requires `booking_kind` and `booking_id` of a paid booking the patient owns. Web claims are broken. | Add a booking picker (the patient's paid bookings) and send `booking_kind` and `booking_id`, the same as the app. `dtocheck` must show 0 mismatches. |
| R7-5 | Gate P8 | The journey matrix is marked "STAGING-GATED": pharmacy {cash, insurance} × {delivery, pickup} × {Rx, no-Rx}; consultation {online, clinic, home} × {cash, insurance}; lab {home, center} × {cash, insurance}; radiology; nursing {hour, shift}. The live stack exists locally and in CI. | Add these combinations to `tools/live` and make them green. |
| R7-6 | P8 States | "A full 34-screen states sweep needs screens.py (absent)." `tools/audit/screens.py` is in the repo. | Add loading, error and empty states to the listed screens. |
| R7-7 | R6-3 | Templates are applied only where a notification has a `title_key`. Push notifications from `push.module.ts` still use hard-coded Arabic text. | Route those push notifications through the templates too, with a built-in text fallback. |
| R7-8 | Phase order | Phase 9 work (F50, F51, F53, F78) was pushed before Phases 7 and 8 were approved. | It is merged here because it passes every check (provider-app 17/17, tsc 0, contract tests read the split folders). Do not continue Phase 9 until R7-1..R7-7 are done. |

**Phase 7A** is next after R7. `patient-app/app/wallet/*` still exists (A1). A2 (no wallet credit on refunds) is already done in `RefundExecutor`.

## Evidence (reviewer ran everything, on the merged tree)
- **Backend:** `tsc` 0; jest **2938/2938**; dtolint 0.
- **Apps:**
  - admin: `tsc` 0 + `next build`;
  - patient-web: `tsc` 0 + vitest 343;
  - patient-app: jest 102/102, `tsc` 0, `expo export` OK;
  - provider-app: jest 17/17, `tsc` 0.
- **Static:**
  - dtocheck 327 client calls checked, 1 mismatch (R7-4);
  - idemcheck 43 routes, 0 calls without a key;
  - schemadrift 0.
- **Admin render:** 63 pages signed in, 0 broken, 0 4xx.
- **Live gate on a fresh DB:** see the PR description.
