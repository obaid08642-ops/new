# Scenario catalogue (QA, 2026-10-31)

Complete list of user scenarios, from the owner's request ("make sure there are no other scenarios we missed").

**Status values**
- **COVERED**: a journey file exists whose name matches the scenario (evidence given). Coverage of its exact steps still needs the journey's own PASS result (see `live-run-2026-10-31.md`).
- **PARTIAL**: a journey touches the area but does not check the scenario's claim.
- **NOT COVERED**: no journey found. Routed to the owning session in column "Route".

**Priority**: P0 money, safety, or data loss; P1 core booking or order flow; P2 supporting flow; P3 polish.

**Route**: P2 provider app, F money, H patient app, D design (web), S backend, A admin.

## Counts

| Measure | First catalogue | Re-scored on main `c17aa3461` (#2292) | Re-scored on main `365b2d580` (this PR) |
|---|---|---|---|
| Scenarios listed | 100 | 100 | 100 |
| COVERED | 52 | 55 | 62 |
| PARTIAL | 16 | 16 | 16 |
| NOT COVERED | 32 | 29 | 22 |

This PR: seven scenarios moved to COVERED. Four are covered by journeys another session added to main (`j_dispute.py`, `j_payment_failed_retry.py`, `j_web_dark_a11y.py`), which were run here and pass. Three are new journeys in this PR (`j_notification_settings.py`, `j_doctor_leave.py`) and pass locally on main `365b2d580`.

Not run in this PR: the other 22 NOT COVERED scenarios (see the rows).
---

## Patient (app and web)

| ID | Scenario | Status | Evidence | Priority | Route |
|---|---|---|---|---|---|
| PT-01 | Book a consultation for self (online/clinic/home) | COVERED | `j_consultation.py` (124/124) | P1 | — |
| PT-02 | Book for a family member | COVERED | `j_family_book_for_member.py` | P1 | — |
| PT-03 | Guardian books for a dependant (minor) | NOT COVERED | none; `j_family_book_for_member.py` covers a family member, not guardianship | P1 | H |
| PT-04 | Family member's medicines and history | COVERED | `j_family_meds.py` | P2 | — |
| PT-05 | Referral from a visit to a booking | NOT COVERED | `j_consultation.py` mentions referral only in passing, no referral assertion | P1 | S |
| PT-06 | Prescription → pharmacy order | COVERED | `j_pharmacy.py`, `j_pharmacy_insurance_first.py` | P1 | — |
| PT-07 | Pharmacy broadcast receives competing offers and the patient picks one | COVERED | `j_web_offers_waiting.py` (web) | P1 | — |
| PT-08 | Sick leave request and report | NOT COVERED | no journey | P2 | H |
| PT-09 | Reports (lab, radiology) viewed and downloaded | PARTIAL | `j_lab_result_push.py` checks push, not download | P2 | H |
| PT-10 | Follow-up chat window opens and closes after a visit | NOT COVERED | `j_chat.py` has no window open/close assertion | P1 | S |
| PT-11 | Chat delivered and seen receipts | COVERED | `j_chat_receipts.py` (63/63, PR #2259) | P1 | — |
| PT-12 | Reviews and rating of a provider | NOT COVERED | no journey | P2 | S |
| PT-13 | Reply to a review (provider side, see PV-07) | NOT COVERED | no journey | P3 | S |
| PT-14 | Complaint raised | NOT COVERED | `j_support.py` covers support tickets; complaint not named | P2 | S |
| PT-15 | Dispute on a charge or visit | COVERED | `j_dispute.py` (56/56 on main 365b2d580): the patient's payment dispute, the admin refunds part once, a second refund refused | P1 | F |
| PT-16 | Support ticket create and reply | COVERED | `j_support.py` | P2 | — |
| PT-17 | Insurance policy add | COVERED | `j_insurance.py` | P1 | — |
| PT-18 | Insurance policy edit | PARTIAL | `j_insurance.py` name only | P2 | H |
| PT-19 | Insurance claim | NOT COVERED | none named | P1 | F |
| PT-20 | Coupons and promotions | PARTIAL | `j_loyalty.py` covers loyalty, not coupons; no coupon journey found | P2 | F |
| PT-21 | Cash vs card vs insurance selection | PARTIAL | `j_insurance_selfpay_filters.py`, `j_consultation.py` | P1 | F |
| PT-22 | Card payment success | COVERED | `j_consultation.py` (payment verified) | P0 | — |
| PT-23 | Card payment failure and retry | COVERED | `j_payment_failed_retry.py` (43/43 on main 365b2d580): declined card reported as failed, retry makes a new checkout, paid booking cannot be charged again | P0 | F |
| PT-24 | Payment return (deep link back from gateway) | NOT COVERED | no journey | P0 | H |
| PT-25 | Delivery tracking | PARTIAL | `j_pharmacy.py` (delivery stage) | P1 | H |
| PT-26 | Prescription photo upload | COVERED | `j_upload_security.py`, `j_ai_scanner.py` | P1 | — |
| PT-27 | Prescription OCR result shown and corrected | PARTIAL | `j_ai_scanner.py` | P1 | H |
| PT-28 | Notification preferences saved | COVERED | `j_notification_settings.py` (13/13 on main 365b2d580): change offers off and on, value holds on a new sign-in, a bad value refused (400) | P2 | H |
| PT-29 | Push permission denied (app) | NOT COVERED | none | P2 | H |
| PT-30 | Location permission denied (app and web) | PARTIAL | `j_web_call.py` (camera/mic); no location denial journey | P2 | H |
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
| PV-02 | Registration (pharmacy) | PARTIAL | `j_onboarding.py` covers the flow; pharmacy type not confirmed | P1 | P2 |
| PV-03 | Registration (lab, radiology) | PARTIAL | `j_radiology_basket.py` uses the radiology onboarding path | P1 | P2 |
| PV-04 | Approval | COVERED | `j_provider_review.py` (20/20) | P0 | — |
| PV-05 | Rejection with reason | COVERED | `j_provider_resubmit.py` (25/25) | P1 | — |
| PV-06 | Resubmit after rejection | COVERED | `j_provider_resubmit.py` | P1 | — |
| PV-07 | Rating reply | NOT COVERED | none | P3 | P2 |
| PV-08 | Licence expiry warning | NOT COVERED | `j_onboarding.py` checks licence at approval only | P0 | P2 |
| PV-09 | Suspension on licence expiry | NOT COVERED | none | P0 | P2, A |
| PV-10 | Services, prices, hours and area edits | PARTIAL | `j_provider_proposals.py`, `j_radiology_delta_request.py` | P1 | P2 |
| PV-11 | Edit approval (admin accepts or refuses an edit) | COVERED | `j_provider_proposals.py` | P1 | — |
| PV-12 | Staff invite | NOT COVERED | none | P2 | P2 |
| PV-13 | Vacation or unavailability | COVERED | `j_doctor_leave.py` (35/35 on main 365b2d580): doctor adds vacation, listed, cancelled and no longer active; missing range refused (400) | P1 | P2 |
| PV-14 | Payout request and approval | COVERED | `j_payouts.py`, `j_payout_paid.py` | P0 | — |
| PV-15 | Dispute raised by the patient, seen by the provider | NOT COVERED | none | P1 | P2, F |
| PV-16 | Consultation online, clinic and home | COVERED | `j_consultation.py`, `j_web_call.py` | P1 | — |
| PV-17 | Pharmacy broadcast accept, reject, timeout | PARTIAL | `j_pharmacy_owner_decisions.py`, `j_pharmacy_catalogue_lines.py` | P1 | P2 |
| PV-18 | Lab home visit and centre with result upload | COVERED | `j_lab.py`, `j_lab_result_push.py` | P1 | — |
| PV-19 | Radiology report upload | PARTIAL | `j_radiology.py`, service path only | P1 | P2 |
| PV-20 | Nursing visit or programme | COVERED | `j_nursing.py` | P1 | — |
| PV-21 | Provider cancels after acceptance | NOT COVERED | none | P1 | P2 |
| PV-22 | No-show marked by the provider | NOT COVERED | none | P1 | P2 |

## Admin

| ID | Scenario | Status | Evidence | Priority | Route |
|---|---|---|---|---|---|
| AD-01 | Approvals (providers) | COVERED | `j_admin_ops.py`, `j_provider_review.py` | P0 | — |
| AD-02 | Moderation of reviews | NOT COVERED | none | P2 | A |
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
| SY-03 | Dead-letter queue inspection | NOT COVERED | none | P1 | S |
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
- **P2 (provider app)**: PV-02 through PV-22 not covered.
- **D (design, web)**: PT-33, PT-40.
- **A (admin)**: AD-02, AD-03, AD-07, PV-09.

Scenarios not covered and routed are not claimed as done. They need either a journey written by the owning session or an owner decision.
