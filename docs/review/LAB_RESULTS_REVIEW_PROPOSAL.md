# Proposal: who sees a lab result, and when (decision needed, no code change)

Session P2, 2026-10-31. This file changes nothing in the product. It is here so the PR has a diff; the text is the PR description.

## How it works today (read in code)
1. The lab user uploads the result (`POST /labs/bookings/:id/upload-report`, `labs.service.ts:806-866`) or creates a structured result (`lab-results.service.ts:34-72`).
2. One person, one step: the booking goes to REPORTED, the report is stored on the booking, and `lab.report_uploaded` / `lab.result_ready` fire.
3. `notifications.service.ts:1009-1040` pushes the patient at once. A critical value only changes the wording of the push ("critical", with "discuss with a doctor"); the value is flagged by the lab user (`isCritical`) or by `flagFor` (above 1.5x the high limit or below 0.5x the low limit).
4. The patient reads it immediately (`mineFor`, `one`). No second person looks at it first, for any value.

Radiology already differs: draft, under review, ready, and the person who uploaded cannot publish (`radiology.service.ts:251-287`, #2177). `LAB_RESULTS_PUBLISH` exists as an operator permission (`provider.enums.ts:68`, held by `lab_technician`) but nothing checks it for results.

## The risk
A mistyped or mis-assigned value (wrong decimal, wrong patient file) reaches the patient and starts a push before anyone else has seen it. For a critical value this is the case where a patient may act alone on a wrong number, or learn a serious one from a notification.

## Options
- **A. No change.** Keep one-step release. Cheapest; the owner accepts the typing risk for all results.
- **B. Second person only for critical results (recommended).** Normal results keep the current speed. If any entry is critical (flag set by the lab user or by `flagFor`), the result is held until a second lab user with `lab.results.publish`, who is not the uploader, approves it. The patient sees nothing and gets no push until then; on approval the existing critical push goes out unchanged ("discuss with a doctor").
- **C. Second person for every result**, like radiology. Safest, but adds a step and delay to routine tests (a blood count) that rarely need it.

## What B would change (when approved; I would build it as separate PRs)
- Backend: `report_status` on the lab report (`published` default, `awaiting_approval` for critical), one approve endpoint (`POST /labs/bookings/:id/reports/:reportId/approve`, uploader refused, `lab.results.publish` required), `mineFor` / `one` / `byBooking` skip held reports, and the two events fire on approval, not upload. Existing REPORTED results stay visible (no migration of old rows).
- Provider app (lab): a held result shows "awaiting approval by a second lab user" to the lab only; the second user gets an approve action. The patient sees the booking as still being processed, which is its real state; there is no "needs review" text for patients.
- Admin: none needed (an existing report is visible in the booking view).
- Tests: uploader cannot approve; held result absent from patient list and push; normal result unchanged; approval releases and notifies once.

## Open points for the owner
1. A, B or C?
2. For B, what counts as critical: only the lab user's flag, or also the automatic limits (`flagFor`)? I would use both.
3. Should a held critical result also alert the ordering doctor, if any? (Not in B as written.)
4. A time limit after which an unapproved critical result alerts the lab owner (suggested: 2 hours)?

No payments, payouts or clinical content change in this proposal.
