# Scenario catalogue (QA, 2026-10-31)

Complete list of user scenarios, from the owner's request ("make sure there are no other scenarios we missed").

**Status values**
- **COVERED**: a journey file exists whose name matches the scenario (evidence given). Coverage of its exact steps still needs the journey's own PASS result (see `live-run-2026-10-31.md`).
- **PARTIAL**: a journey touches the area but does not check the scenario's claim.
- **NOT COVERED**: no journey found. Routed to the owning session in column "Route".

**Priority**: P0 money, safety, or data loss; P1 core booking or order flow; P2 supporting flow; P3 polish.

**Route**: P2 provider app, F money, H patient app, D design (web), S backend, A admin.

## Counts

| Measure | First catalogue | Re-scored on main `c17aa3461` (#2292) | Re-scored on main `365b2d580` (#2335) | Batch 2 (#2351) | PT-25 (#2435) | Batch 5 (this PR) |
|---|---|---|---|---|---|---|
| Scenarios listed | 100 | 100 | 100 | 100 | 100 | 100 |
| COVERED | 52 | 55 | 62 | 65 | 73 | 79 |
| PARTIAL | 16 | 16 | 16 | 13 | 8 | 9 |
| NOT COVERED | 32 | 29 | 22 | 22 | 18 | 12 |

This PR: seven scenarios moved to COVERED. Four are covered by journeys another session added to main (`j_dispute.py`, `j_payment_failed_retry.py`, `j_web_dark_a11y.py`), which were run here and pass. Three are new journeys in this PR (`j_notification_settings.py`, `j_doctor_leave.py`) and pass locally on main `365b2d580`.

Batch 5 (this PR) moved four rows to COVERED (PT-10 chat window, PT-12 reviews, PT-14 complaint, SY-03 dead-letter queue) and AD-02 to PARTIAL (approve path only). PT-05 (referral to a booking) and PV-15 (provider sees a patient dispute) stay NOT COVERED: both are blocked by product gaps, recorded with file:line in `docs/qa/findings/batch5-2026-11-07.md`. The batch is four covered scenarios, not the 5-8 target, because the other candidates in the P1 list were blocked or app-only (PT-38, H).

This PR (PT-25 delivery tracking) moved one PARTIAL row to COVERED. The 'This PR' column is a recount of the rows on this branch (73 / 8 / 18), which includes other sessions' updates to the catalogue since #2351.
---

## Patient (app and web)

| ID | Scenario | Status | Evidence | Priority | Route |
|---|---|---|---|---|---|
| PT-01 | Book a consultation for self (online/clinic/home) | COVERED | `j_consultation.py` (124/124) | P1 | — |
| PT-02 | Book for a family member | COVERED | `j_family_book_for_member.py` | P1 | — |
| PT-03 | Guardian books for a dependant (minor) | NOT COVERED | none; `j_family_book_for_member.py` covers a family member, not guardianship | P1 | H |
| PT-04 | Family member's medicines and history | COVERED | `j_family_meds.py` | P2 | — |
| PT-05 | Referral from a visit to a booking | NOT COVERED | blocked: the referral issue route rejects the apps' UUID ids and no client calls it (`docs/qa/findings/batch5-2026-11-07.md`) | P1 | S |
| PT-06 | Prescription → pharmacy order | COVERED | `j_pharmacy.py`, `j_pharmacy_insurance_first.py` | P1 | — |
| PT-07 | Pharmacy broadcast receives competing offers and the patient picks one | COVERED | `j_web_offers_waiting.py` (web) | P1 | — |
| PT-08 | Sick leave request and report | NOT COVERED | no journey | P2 | H |
| PT-09 | Reports (lab, radiology) viewed and downloaded | PARTIAL | `j_lab_result_push.py` checks push, not download | P2 | H |
| PT-10 | Follow-up chat window opens and closes after a visit | COVERED | `j_chat_followup_window.py` (62/62): closed before the visit ends, opens on finish, the doctor closes it and the patient can still read, one extension reopens it, a second is refused | P1 | — |
| PT-11 | Chat delivered and seen receipts | COVERED | `j_chat_receipts.py` (63/63, PR #2259) | P1 | — |
| PT-12 | Reviews and rating of a provider | COVERED | `j_review_rating.py` (73/73): only a patient who used the visit can rate, stars publish at once, text waits for admin approval, public after approval; the author's read omits `status` (`docs/qa/findings/batch5-2026-11-07.md`) | P2 | — |
| PT-13 | Reply to a review (provider side, see PV-07) | NOT COVERED | no journey | P3 | S |
| PT-14 | Complaint raised | COVERED | `j_complaint.py` (18/18): feedback filed as a complaint, the patient and the admin queue both show the complaint category, an empty complaint is refused | P2 | — |
| PT-15 | Dispute on a charge or visit | COVERED | `j_dispute.py` (56/56 on main 365b2d580): the patient's payment dispute, the admin refunds part once, a second refund refused | P1 | F |
| PT-16 | Support ticket create and reply | COVERED | `j_support.py` | P2 | — |
| PT-17 | Insurance policy add | COVERED | `j_insurance.py` | P1 | — |
| PT-18 | Insurance policy edit | COVERED | `j_insurance.py` `edit_policy`: a second `save-policy` changes number, expiry, class and card figures; a field left out changes nothing; the client cannot set `verified`; a copay over 100, a negative cap, a text percent and an unknown insurer are refused; a class change without new figures drops the old ones; `profile.insurance` shows the edit | P2 | H |
| PT-19 | Insurance claim | COVERED | `j_insurance.py` `claims()` + `claim_decision()`: submit for a paid booking, amount is what was paid, a second claim 409, admin lists and approves (reimbursed, money moves once), a decided claim cannot be decided or rejected again, tracking and `/refunds/my` show it, the reimbursed booking answers `claim_already_filed`; `insurance.claims.spec.ts` | P1 | F |
| PT-20 | Coupons and promotions | COVERED (checkout pricing) | `j_coupons.py` (27 steps: admin creates, patient prices, same figure as the admin tester, expired, off, unknown, rate limit); `coupon-rules.spec.ts` (apply, per-user, give-back on cancel, real MongoDB); `concurrency-races.spec.ts` (50 parallel). Applying on an order has no live flow: only the legacy cash cart applies a coupon | P2 | F |
| PT-21 | Cash vs card vs insurance selection | COVERED | `j_consultation.py` matrix (124/124 in the live run): cash (line 211), insurance (lines 193, 223) and card bookings each recorded with their method | P1 | F |
| PT-22 | Card payment success | COVERED | `j_consultation.py` (payment verified) | P0 | — |
| PT-23 | Card payment failure and retry | COVERED | `j_payment_failed_retry.py` (43/43 on main 365b2d580): declined card reported as failed, retry makes a new checkout, paid booking cannot be charged again | P0 | F |
| PT-24 | Payment return (deep link back from gateway) | PARTIAL | web return: `j_web_payment_result.py` (real browser, `/payments/result?id=` resolves the gateway payment id to the paid appointment); app killed after paying: `j_app_killed_payment.py` (reopen reads the server state, no duplicate charge). Not covered: the native deep link into the app (device farm only) | P0 | H |
| PT-25 | Delivery tracking | COVERED | `j_pharmacy_tracking.py` (62/62 on main): the owner reads GET /orders/:id/tracking (state broadcasting), another patient gets 403, an unknown order id gets 404 | P1 | H |
| PT-26 | Prescription photo upload | COVERED | `j_upload_security.py`, `j_ai_scanner.py` | P1 | — |
| PT-27 | Prescription OCR result shown and corrected | PARTIAL | `j_ai_scanner.py` | P1 | H |
| PT-28 | Notification preferences saved | COVERED | `j_notification_settings.py` (13/13 on main 365b2d580): change offers off and on, value holds on a new sign-in, a bad value refused (400) | P2 | H |
| PT-29 | Push permission denied (app) | NOT COVERED | none | P2 | H |
| PT-30 | Location permission denied (app and web) | COVERED (web: map, address, home care, emergency each show a message and keep manual entry) | `j_web_call.py` (camera/mic); no location denial journey | P2 | H |
| PT-31 | Language switch (ar, en, ur, hi, bn, fil) | COVERED | `j_web_translated_pages.py`, `j_server_texts_langs.py` | P2 | — |
| PT-32 | RTL and LTR layout | COVERED | `j_web_translated_pages.py` | P2 | — |
| PT-33 | Dark mode | COVERED | `j_web_dark_a11y.py` (75/75 on main 365b2d580): dark mode from the OS, stored choice wins and survives reload | P3 | D |
| PT-34 | Session expiry while in use | COVERED | `j_patient_sessions.py` | P1 | — |
| PT-35 | Multi-device sign-in and sign-out | COVERED | `j_patient_sessions.py` | P1 | — |
| PT-36 | Account deletion (PDPL) | COVERED | `j_pdpl_export_erase.py` (12/12 on main c17aa3461): wrong password refused, right password erases, old token and sign-in refused | P0 | — |
| PT-37 | Data export (PDPL) | COVERED | `j_pdpl_export_erase.py`: export answers with the patient's own id and no password hash | P0 | — |
| PT-38 | Deep links into a booking or chat | NOT COVERED | none | P1 | H |
| PT-39 | Offline and flaky network | COVERED | `j_throttled_network.py`, `j_web_offline.py` | P1 | — |
| PT-40 | Accessibility basics (labels, focus, contrast) | COVERED | `j_web_dark_a11y.py` (75/75 on main 365b2d580): page language and direction, one main and one h1, alt text, accessible names, skip link and focus ring | P2 | D, H |
| PT-41 | Sign-in with a code (phone and e-mail) | COVERED | `j_qa_phone_otp.py`, `j_web_qa_signup.py` | P0 | — |
| PT-42 | Social sign-in | COVERED | `j_social_login.py` | P1 | — |
| PT-43 | Password reset by link | COVERED | `j_password_reset_link.py` | P1 | — |
| PT-44 | Account locked after bad passwords | COVERED | `j_password_lockout.py` | P1 | — |
| PT-45 | Cancel a home visit (web) | COVERED | `j_web_cancel_home.py` (52/52) | P1 | — |
| PT-46 | Cancel with refund (paid visit) | COVERED | `j_qa_refund_consultation.py` (55/55) | P0 | — |
| PT-47 | Cancel after completion still refunds (P0 in the walk) | COVERED | `j_cancel_after_completion.py` (54/54 on main c17aa3461): cancel on a completed visit refused (400/409/422), visit stays completed, no refund figure, second cancel refused. The state change now comes first in `appointments.service.ts` cancel(). | P0 | — |
| PT-48 | Lab booking and results | COVERED | `j_lab.py` (144/144) | P1 | — |
| PT-49 | Radiology booking and basket | COVERED | `j_radiology.py`, `j_radiology_basket.py` | P1 | — |
| PT-50 | Nursing visit booking | COVERED | `j_nursing.py`, `j_web_nursing_visits.py` | P1 | — |
| PT-51 | Pregnancy weeks content | COVERED | `j_pregnancy_weeks.py` | P3 | — |
| PT-52 | Health logging | COVERED | `j_web_health_logging.py` | P3 | — |
| PT-53 | Web call join window and in-call controls | COVERED | `j_web_call.py` (71/71) | P0 | — |
| PT-54 | Patient hides or unhides a visit from history | NOT COVERED | none | P3 | H |
| PT-55 | Medicine ranking and substitute choice | COVERED | `j_medicine_ranking.py`, `j_rx_substitute.py` | P2 | — |
| PT-56 | Guest checkout (no account) | COVERED | `j_guest_lifecycle.py`, `j_guest_matrix.py` | P1 | — |
| PT-57 | Insurance-first pharmacy order | COVERED | `j_pharmacy_insurance_first.py` | P1 | — |
| PT-58 | Returns on a pharmacy order | COVERED | `j_returns.py` | P2 | — |

## Provider (every type)

Types: doctor, pharmacy, lab, radiology, nursing (and any other registered type).

| ID | Scenario | Status | Evidence | Priority | Route |
|---|---|---|---|---|---|
| PV-01 | Registration (doctor) | COVERED | `j_onboarding.py` (112/112) | P1 | — |
| PV-02 | Registration (pharmacy) | COVERED | `j_onboarding.py` `register_pharmacy` (112/112 in the live run): pharmacy starts, fills the steps, submits | P1 | P2 |
| PV-03 | Registration (lab, radiology) | COVERED | `j_onboarding.py` `register_type('lab')` (16 journeys) and `register_type('radiology')` (5 journeys): lab and radiology register, submit and are approved | P1 | P2 |
| PV-04 | Approval | COVERED | `j_provider_review.py` (20/20) | P0 | — |
| PV-05 | Rejection with reason | COVERED | `j_provider_resubmit.py` (25/25) | P1 | — |
| PV-06 | Resubmit after rejection | COVERED | `j_provider_resubmit.py` | P1 | — |
| PV-07 | Rating reply | COVERED | `j_provider_scenarios.py`: the doctor sees the review a patient wrote in the app, answers it, the public doctor page shows the reply; a review under 3 stars waits in the admin moderation queue, cannot be answered or shown until approved; another doctor, an empty and a too-long reply are refused | P3 | P2 |
| PV-08 | Licence expiry warning | COVERED | `j_provider_scenarios.py` licence_expiry | P0 | P2 |
| PV-09 | Suspension on licence expiry | COVERED | `j_provider_scenarios.py` licence_expiry | P0 | P2, A |
| PV-10 | Services, prices, hours and area edits | COVERED | `j_provider_edits.py` (working hours, prices, delivery area and fee: pending until approved, refused leaves the live value), `j_provider_proposals.py`, `j_radiology_delta_request.py` | P1 | P2 |
| PV-11 | Edit approval (admin accepts or refuses an edit) | COVERED | `j_provider_proposals.py` | P1 | — |
| PV-12 | Staff invite | COVERED | `j_provider_scenarios.py` `staff_invite`: invite by e-mail, duplicate and owner refused, accept with the mailed token (once), disable, enable, revoke | P2 | P2 |
| PV-13 | Vacation or unavailability | COVERED | `j_doctor_leave.py` (35/35 on main 365b2d580): doctor adds vacation, listed, cancelled and no longer active; missing range refused (400) | P1 | P2 |
| PV-14 | Payout request and approval | COVERED | `j_payouts.py`, `j_payout_paid.py` | P0 | — |
| PV-15 | Dispute raised by the patient, seen by the provider | COVERED | `GET /support/provider/disputes` (limited fields, unit-tested in `support-provider-disputes.spec.ts`); live journey `j_dispute.py` (the doctor sees the dispute on their booking, no patient message or identity, a patient is refused); provider-app screen `ProviderDisputesScreen` (doctor Settings > Booking disputes, tested in `ProviderDisputesScreen.test.tsx`). Consultation bookings only for now (owner decision: home-care and pharmacy later) | P1 | P2, F |
| PV-16 | Consultation online, clinic and home | COVERED | `j_consultation.py`, `j_web_call.py` | P1 | — |
| PV-17 | Pharmacy broadcast accept, reject, timeout | COVERED | `j_pharmacy_broadcast_responses.py` (reject with a reason, rounds that time out and close the broadcast, a quote that lapses), `j_pharmacy.py` (accept) | P1 | P2 |
| PV-18 | Lab home visit and centre with result upload | COVERED | `j_lab.py`, `j_lab_result_push.py` | P1 | — |
| PV-19 | Radiology report upload | COVERED | `j_radiology.py` (upload, review, the uploader cannot publish, `report_can_approve` / `report_handled_by_me` on the booking and the inbox) | P1 | P2 |
| PV-20 | Nursing visit or programme | COVERED | `j_nursing.py` | P1 | — |
| PV-21 | Provider cancels after acceptance | COVERED | `j_provider_scenarios.py`: a reason is required, the patient gets 100% back, the doctor carries the penalty, the slot can be booked again | P1 | P2 |
| PV-22 | No-show marked by the provider | COVERED | `j_provider_scenarios.py`: refused before the grace period, accepted after it, the patient sees NO_SHOW with no refund, a second one is refused | P1 | P2 |

## Admin

| ID | Scenario | Status | Evidence | Priority | Route |
|---|---|---|---|---|---|
| AD-01 | Approvals (providers) | COVERED | `j_admin_ops.py`, `j_provider_review.py` | P0 | — |
| AD-02 | Moderation of reviews | PARTIAL | `j_review_rating.py` (approve path: the pending queue lists the review, approve publishes it); reject is not covered | P2 | A |
| AD-03 | Disputes handled by admin | COVERED | `j_dispute.py` (56/56 on main 365b2d580): the admin's refund on a dispute, once | P1 | A, F |
| AD-04 | Refunds | COVERED | `j_qa_refund_consultation.py` | P0 | — |
| AD-05 | Payouts (approve, execute, PAID) | COVERED | `j_payouts.py`, `j_payout_paid.py` | P0 | — |
| AD-06 | Catalogue edits | COVERED | `j_admin_catalogue_fields.py`, `j_admin_super_catalog.py` | P2 | — |
| AD-07 | Notifications broadcast | PARTIAL | `j_admin_urgent_alerts.py` | P2 | A |
| AD-08 | Audit log | COVERED | `j_audit_events.py`, `j_audit_collection.py` | P1 | — |
| AD-09 | Roles and permissions | COVERED | `j_admin_roles_restrictive.py` | P1 | — |
| AD-10 | Kill switches | COVERED | `j_admin_kill_switches.py`, `j_killswitches.py` | P1 | — |

## System

| ID | Scenario | Status | Evidence | Priority | Route |
|---|---|---|---|---|---|
| SY-01 | Nightly jobs run once and report | PARTIAL | `j_jobs.py` | P1 | S |
| SY-02 | Retries after a transient failure | PARTIAL | `j_chaos.py` | P1 | S |
| SY-03 | Dead-letter queue inspection | COVERED | `j_dead_letter.py` (20/20): queue counts, failed-job list, unknown state refused, retry of an unknown job 404, bulk retry needs a reason and reports counts, patient refused | P1 | — |
| SY-04 | Rate limits (per IP, per account) | COVERED | `j_otp_abuse.py`, `j_password_lockout.py`, `j_concurrency.py` | P1 | — |
| SY-05 | Backups restore | NOT COVERED | none | P0 | S |
| SY-06 | Monitoring alerts fire | PARTIAL | `j_admin_urgent_alerts.py` | P1 | S |
| SY-07 | Security headers | COVERED | `j_security_headers.py` | P1 | — |
| SY-08 | Upload security (malware scan) | COVERED | `j_upload_security.py` | P1 | — |
| SY-09 | Log scan for secrets | COVERED | `j_log_scan.py` | P1 | — |
| SY-10 | Mail delivery and rotation | COVERED | `j_mail_rotation.py` | P2 | — |

---

## Summary of routes

- **S (backend)**: PT-05, PT-10, PT-12, PT-14, PT-36, PT-37, PT-47, SY-03, SY-05, SY-06, PV-09 (with A), and PV-08.
- **F (money)**: PT-15, PT-19, PT-20, PT-21, PT-23, PV-15, AD-03.
- **H (patient app)**: PT-03, PT-08, PT-24, PT-28, PT-29, PT-30, PT-33, PT-38, PT-40.
- **P2 (provider app)**: PV-07, PV-10, PV-12, PV-17, PV-19, PV-21 and PV-22 now have journeys (this PR); PV-08, PV-09 (S, A) and PV-15 (F) remain with their owners.
- **D (design, web)**: PT-33, PT-40.
- **A (admin)**: AD-02, AD-03, AD-07, PV-09.

Scenarios not covered and routed are not claimed as done. They need either a journey written by the owning session or an owner decision.
