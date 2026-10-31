# Scenario rows routed to P2 (provider app): status, evidence, PR

From `docs/qa/SCENARIOS.md` (PR #2292). Evidence is unit tests and the existing live journeys. **Nothing here was run against a live stack**; live journeys are listed only where they already exist.

| ID | Scenario | Result | Evidence / change | PR |
|---|---|---|---|---|
| PV-02 | Registration (pharmacy) | COVERED | `tools/live/j_onboarding.py` `onboard_all` registers, reviews and signs in a pharmacy (`register_pharmacy`) | none needed |
| PV-03 | Registration (lab, radiology) | COVERED | same file: `register_type('lab')` and `register_type('radiology')` (one shared wizard) | none needed |
| PV-07 | Rating reply | FIXED | reply only to a published review, shown on the public list, patient notified; `provider-ops.review-reply.spec.ts` | #2310 |
| PV-08 | Licence expiry warning | FIXED | monitor existed (30/14/7/3/1 days) but wrote a raw Arabic row; now bell and push, ar/en; `license-monitor.spec.ts` | #2312 |
| PV-09 | Suspension on licence expiry | FIXED (notice) | account and profile suspension existed and were tested; the provider is now told. **Open:** bookings already made are not moved (owner decision) | #2312 |
| PV-10 | Services, prices, hours, area edits | PARTIAL | approval path covered by `j_provider_proposals.py`; direct edits (`PUT /provider/services/...`, `PATCH /provider/profile/availability`) have no journey. **Open:** `vacation_*` and `availability_exceptions` saved by availability are read by nothing | none |
| PV-12 | Staff invite | FIXED (notice) | invite, inbox, respond covered by `j_facility.py`; invitee and facility are now told; `facility-invitations.spec.ts` | #2313 |
| PV-13 | Vacation or unavailability | FIXED | an independent doctor's leave did not reach slot search; `provider-ops.leave.spec.ts` | #2309 |
| PV-15 | Dispute seen by the provider | MISSING-BACKEND (S, F) | a support ticket has no booking or provider link, and only pharmacy returns reach the provider. A complaint on a lab, radiology, nursing or doctor booking is invisible to that provider | none |
| PV-17 | Pharmacy broadcast accept, reject, timeout | COVERED | accept through offers and reject: `j_pharmacy_owner_decisions.py`; timeout and rounds: `pharmacy-expiry-command.service.spec.ts`. **Open:** after the last round the order goes to MANUAL_REVIEW but the patient text reads as a final "no pharmacy" | none |
| PV-19 | Radiology report upload | COVERED (unit) | four-step upload, review by a second person, approve: radiology specs; no live journey drives the upload | none |
| PV-21 | Provider cancels after acceptance | FIXED (doctor) | a doctor or facility must give a reason, server and app; `appointments-provider-cancel.spec.ts`. **Open (FOR F):** no refund consumer for a lab, radiology or nursing cancel by the provider | #2314 |
| PV-22 | No-show marked by the provider | FIXED (doctor) | only 10 minutes after the start, patient notified; `livekit.followup.spec.ts`. **Open:** no provider-app screen calls it; lab and pharmacy have no route; refund rule is F's | #2311 |

Counts: 13 rows. COVERED by existing tests or journeys: 5 (PV-02, 03, 17, 19, plus the invite flow of 12). FIXED in a PR: 7 rows (PV-07, 08, 09, 12, 13, 21, 22). Still open: PV-10 (vacation fields unread), PV-15 (needs a backend link, S).
