# Provider journeys: scenario matrix (session P2, 2026-10-31)

Owner priority (2026-10-31): every provider journey works completely and correctly in every realistic scenario. This file is the matrix:
8 provider variants x 21 scenarios, with PASS / FAIL per cell and `file:line` for every FAIL, and the PR that fixes it.

**How it was produced, and what it is not.** Five read-only investigations traced the code path of each cell (backend `backend/src`, provider app `provider-app/src`). **Nothing was run against a live stack**: there is no CI-style stack in the authoring environment, so a cell is "the code path is (in)complete", not "observed working". Items marked ✔v were re-read by me in the code before any fix; the rest are as reported and are re-verified in the PR that fixes them. Money code (payments, payouts, wallet ledger) is session F's: it is read for wiring only and its fixes are marked FOR F. Update this file in every fix PR (change the cell, keep the id).

Variants: **D-on** doctor online · **D-cl** doctor clinic · **D-ho** doctor home · **Ph** pharmacy · **Lab** · **Rad** radiology · **Nur** nurse / home care · **Fac** hospital / facility staff.
Cell: ✔ pass · ◐ works with a gap (id) · ✘ fail (id) · – not applicable · ? not verified.

## Matrix

| # | Scenario | D-on | D-cl | D-ho | Ph | Lab | Rad | Nur | Fac |
|---|---|---|---|---|---|---|---|---|---|
| 1 | New order: push + bell | ✔ | ✔ | ✔ | ✘ R1 *(fixed #2271)* | ◐ R8 | ✘ R2 *(fixed #2271)* | ✔ | ? |
| 2 | Appears in the list, with sound and badge | ✘ R5 R4 | ✘ R5 R4 | ✘ R5 R4 | ◐ R4 | ◐ R4 | ◐ R4 | ◐ R4 | ✘ R5 |
| 3 | Unanswered: auto-expiry, what the patient sees | ✘ R6 | ✘ R6 | ✘ R6 | ✔ | ◐ R6 | ✘ R6 | ✘ R6 | ✘ R6 |
| 4 | Accept | ◐ D3 | ◐ D3 | ◐ D3 | ✔ | ✔ | ✔ | ✔ | ✘ R5 |
| 5 | Reject with a reason | ✘ D1 | ✘ D1 | ✘ D1 | ✔ | ✘ D1 | ✘ D1 | ✘ D1 | ✘ D1 |
| 6 | Reschedule (provider / patient) | ✘ D2 | ✘ D2 | ✘ D2 | – | ✘ D2 | ✘ D2 | ✘ D2 | ✘ D2 |
| 7 | Cancel by the patient, before / after acceptance | ◐ D4 | ◐ D4 | ◐ D4 | ✔ | ◐ D1 D4 | ◐ D1 D4 | ◐ D4 D5 | ✔ |
| 8 | Cancel by the provider | ✔ | ✔ | ✔ | ? | ✘ D1 | ◐ D1 | ✘ D1 | ✔ |
| 9 | Start / on the way / arrive | – | ✔ | ✘ W1 | ◐ W3 | ✘ W4 | ✔ | ✔ | – |
| 10 | Complete | ✔ | ✔ | ◐ W1 | ◐ W3 | ✔ | ◐ W5 | ◐ W5 | – |
| 11 | Result / report / prescription | ◐ W6 | ◐ W6 | ◐ W6 | – | ✔ | ✔ | – | – |
| 12 | Patient did not show up | ✘ W2 | ✘ W2 | ✘ W2 | ✘ W2 | ✘ W2 | ✘ W2 | ◐ W2 | ✘ W2 |
| 13 | Partial fulfilment, alternative offered | – | – | – | ✔ | – | – | – | – |
| 14 | Insurance pending / approved / rejected | – | ✘ S3 | ✘ S3 | ✔ | ◐ S3 | ✘ S3 | ✘ S3 | ✘ S3 |
| 15 | Payment pending / failed / refunded | ✘ D3 S4 | ✘ D3 S4 | ✘ D3 S4 | ✔ | ◐ S4 | ◐ S4 | ◐ S4 | ? |
| 16 | Two providers race for one order | – | – | – | ◐ S1 | ◐ S1 S2 | ◐ S1 S2 | ◐ S1 S2 | – |
| 17 | Flaky network during accept (no double effect) | ✘ X1 | ✘ X1 | ✘ X1 | ✔ | ◐ X7 | ◐ X7 | ✘ X1 | ✘ X1 |
| 18 | Flaky network during complete (no double completion) | ◐ X3 | ◐ X3 | ◐ X3 | ✘ X6 *(FOR F)* | ✘ X2 | ✔ | ◐ X7 | ? |
| 19 | Suspended mid-order | ✘ X4 | ✘ X4 | ✘ X4 | ✘ X4 | ✘ X4 | ✘ X4 | ✘ X4 | ✘ X4 |
| 20 | Earnings credited, shown in the wallet | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ W5 | ✘ W5 | ? |
| 21 | Payout request | ◐ X5 | ◐ X5 | ◐ X5 | ◐ X5 | ◐ X5 | ◐ X5 | ◐ X5 | ◐ X5 |

Row 21 is "wired, but the provider is never told when the payout changes state" (X5); the request, bank gate, minimum and history work.

## FAIL register (file:line, defect, smallest fix, state)

**Receive**
- **R1** `pharmacy-broadcast.service.ts:236-256`, `pharmacy-expiry-command.service.ts:93-110`: outbox rows for each reached pharmacy had no consumer; `notifyPharmacyBroadcast` (`pharmacy-notification.service.ts:126`) had no caller. ✔v. **Fixed #2271** (dispatcher).
- **R2** `radiology.service.ts:669`: no `announceCreated`, so the centre gets nothing. ✔v. **Fixed #2271.**
- **R3** `notifications.service.ts:387`: Expo push has a sound only for HIGH/CRITICAL; provider notices passed none. ✔v. **Fixed #2271** (`new_request`, `request_cancelled` are HIGH).
- **R4** `App.tsx:84`: `initNotificationListeners` is never called, so a push refreshes no list; no `setBadgeCountAsync`, the backend sends no `badge`; lab, radiology, nursing and doctor lists load once (pull-to-refresh only); the sockets the app listens to (`incoming_urgent_request`, `DoctorHomeTab.tsx:111-120`) are never emitted. Fix: refetch the queue on a push, 15-30 s poll, emit the socket event from the `service.requested` listener, badge from the unread count.
- **R5** `provider-jobs.module.ts:91-101,113,116,185-186`: `incoming` is `ASSIGNED` only (nothing is ASSIGNED for consultation, lab, radiology), and lab/radiology are looked up by `account_id`, a field their schemas do not have (`lab.schema.ts:140`, `radiology.schema.ts:162` use `provider_account_id`). ✔v. The doctor's and the facility's generic incoming list is always empty, and generic accept/reject 404 for lab and radiology (no provider-app screen except the facility's calls it). Also `provider-jobs.module.ts:236` pushes consultation `state_history` without the required `state` (`appointment.schema.ts:52`), so a generic accept on an appointment would 500. ✔v. Fix: REQUESTED is incoming for consultation/lab/radiology; `provider_account_id`; `state` on the history entry; facility staff delegate to `AppointmentsService.confirm/cancel` (they already honour `isFacilityOwner`).
- **R6** no expiry for: direct `POST /labs/bookings` (quote bookings do expire, `ordering-lifecycle.service.ts:68`), radiology, nursing `PROVIDER_ASSIGNED`, appointments `PENDING` (a card booking stays PENDING for ever, slot held), instant consultation (`instant-consultation.service.ts:114-133` never notifies, expiry only on read). Fix: one sweeper that cancels unanswered bookings through the engine and refunds via the existing path (FOR F for the refund).
- **R7** `/labs/provider/inbox`, `/radiology/provider/inbox` return the patient's full phone and address before acceptance (13.R4 says withheld). Fix: `withholdBeforeAcceptance`.
- **R8** `notifications.service.ts:674-681`: the provider id is resolved from `facility_id` before `provider_account_id`; a lab booking that carries a non-account `facility_id` notifies nobody.

**Decisions and changes**
- **D1** generic reject (`provider-jobs.module.ts:244`) takes no reason (`DoctorHomeTab.tsx:175`, `FacilityOrderDetail.tsx:52`, `NursingDashboard.tsx:164` send none or a fixed string), the reason is kept only in `state_history`, and no refund hook runs for nursing/consultation; lab (`labs.service.ts:723`) and radiology (`radiology.service.ts:123-148`) provider rejects store the reason only in history, emit no cancel event and nothing listens to `lab.booking_cancelled`, so a paid card booking is not refunded. Fix: required reason, a visible `rejection_reason`, the same refund hook the patient cancel uses (FOR F: the hook's logic).
- **D2** reschedule: `labs.service.ts:1064-1073` and `radiology.service.ts:349-358` have no state guard (a CANCELLED or REPORTED booking can be moved), no slot/capacity check, no notification; `unified-bookings.module.ts:225-251` (patient) has no slot check and emits `service.confirmed` without `patient_account_id`; `appointments.service.ts:779-860` creates the new appointment CONFIRMED at once and drops payment, insurance, booker and complaint fields; nurses have no provider reschedule; facility staff get 403.
- **D3** `appointments.service.ts:596`: doctor confirm has no payment gate (an unpaid card booking is confirmed and then never marked paid, `:890-895`).
- **D4** the provider is never told when a patient cancels or reschedules (`notifications.service.ts:709`, no `notifyBookingProvider` on `service.cancelled`).
- **D5** `home-care.service.ts:187-190`: a second cancel of a CANCELLED booking re-emits `homecare.booking_cancelled` (refund hook twice; FOR F to check idempotency).

**Doing the work**
- **W1** `LiveConsultationScreen.tsx:96,130-131`: doctor home visit is a dead end after ARRIVED (`okStates` lacks it, no Start button); the patient is told "service started" three times and never "on the way" / "arrived" (`workflow-engine.module.ts:134,155`, `notifications.service.ts:701-703`); the trip screen state is local, reopening at EN_ROUTE re-enables a button that 400s.
- **W2** no-show has no path: doctors (`livekit.service.ts:166-183` mutates directly, no event, no app UI), lab (no NO_SHOW state; "Patient Absent" sits in the unreachable trip screen, `LabDashboard.tsx:1111`), radiology (`radiology.service.ts:204-227` abort only from ARRIVED_CHECKIN/IN_SCANNING, and `radiology.scan_aborted` notifies nobody), pharmacy (no uncollected/unreachable action), facility (cancel refunds 100%, `appointments.service.ts:566`). Nurse no-show works after arrival + 10 min.
- **W3** `pharmacy-notification.service.ts:97-109`, `i18n.service.ts:870-873`: patient pushes for preparing, ready_for_pickup, out_for_delivery, delivered use `pharmacy.alloc_*` keys that do not exist (only `alloc_confirmed`, `alloc_cancelled`), so the patient sees the raw key.
- **W4** `LabDashboard.tsx:597,1057`: home collection waits for `status === 'ASSIGNED'`, a state that does not exist, so a home booking is stuck at CONFIRMED (no trip, no sample registration); arrival needs a client-side distance <= 0.1 km.
- **W5** `home-care.controller.ts:388-411`, `home-care-compat.module.ts:235-260`, `radiology.service.ts:277-300`: nursing completion and radiology report publication skip the workflow engine, so `service.completed` never fires and **no earning is credited**. Fix: route through `engine.apply` (the earning listener itself is FOR F).
- **W6** `EPrescriptionScreen.tsx:164`: the doctor cannot send a prescription to a pharmacy from the app (`POST /prescriptions/:id/send` exists, nothing calls it); `MedicalReportScreen.tsx:106` claims a "MOH-verified QR" the backend does not issue; `appointments.service.ts:645` `finish` accepts an empty diagnosis (UI-only rule).

**Special cases**
- **S1** after a broadcast is won, the losers are not told and the broadcast stays `lock_state:'open'` (`pharmacy-offer.service.ts:640-651`; ASAP: `ordering-broadcast.service.ts:235-250`). The win itself is atomic (✔: conditional `updateOne` in a transaction; `findOneAndUpdate` for ASAP).
- **S2** `ordering-broadcast.service.ts:271,355`: radiology and nursing ASAP broadcasts create a LAB booking (`labs.createPriced`).
- **S3** insurance: `appointments.service.ts:293-310` auto-confirms insurance appointments before any decision and leaves them on failure; `insurance-engine.module.ts:672-682` reject/partial are not mirrored to the booking (nursing/doctor); `radiology.service.ts:738-746` + `radiology.controller.ts:126-130` let a provider set any insurance status (self-approve); `radiology.service.ts:328-342` sets `approved` while WAITING_COPAY; `provider-production.module.ts:171-196` (coverage-decision) writes the booking directly, sets a state that is in no enum (`INSURANCE_REJECTED`), creates no engine request, and for nursing rejects `PROVIDER_ASSIGNED` and checks the wrong owner field; `DoctorHomeTab.tsx:188` -> `provider-jobs.module.ts:271` writes only `insurance_details`; `insurance-engine.module.ts:640` staff under a facility cannot decide.
- **S4** `payments.module.ts:654-658`: a full refund sets only `payment_status='refunded'`; the booking stays live in the provider's queue and can be started and completed.

**Robustness**
- **X1** `workflow-engine.module.ts:205` (`from===to` returns silently) + `provider-jobs.module.ts:194-230`: a repeated generic accept re-runs `mutate` and re-emits `service.confirmed` (duplicate history and notifications); doctor/nursing/facility apps have no in-flight guard on accept (`DoctorHomeTab.tsx:163-171`, `NursingDashboard.tsx:150-160`).
- **X2** `labs.service.ts:849-857`: `upload-report` on an already REPORTED booking pushes a second report and re-emits `lab.report_uploaded` (the app's three-call sequence makes a retry likely).
- **X3** `appointments.service.ts:645-665`: `finish()` rewrites the summary on a completed visit before it throws.
- **X4** suspension (`provider-admin.service.ts:367-393`, `facility-license.ts:23-40`): tokens are revoked and discovery hides the provider, but open orders stay with them, patients are not told, nothing is reassigned or flagged; `hospital-staff.module.ts:94-101` sets only `users.suspended`, which login and the guard never read, so a suspended staff member keeps working.
- **X5** `finance-suite.service.ts:339-426`: payout approve/reject/execute notify nobody although the app promises "you will be notified" (`WithdrawalWorkflow.tsx:176`). FOR F (it sits in their file; the fix is a notification after the state change).
- **X6** `pharmacy-allocation.service.ts:493` (before the guard at `:512`): a repeated COD "delivered" writes a second payment-evidence row. FOR F. `provider-ops.module.ts:671-688`: earnings dedupe is find-then-insert with no unique index. FOR F.
- **X7** apps show `e.message` ("Request failed with status code 400") and do not reload after a failed retry (`LabDashboard.tsx:451-461`, `RadiologyDashboard.tsx:233-237`, `LiveConsultationScreen.tsx` `step`).

## Fix groups (one PR each)

| Group | Ids | PR |
|---|---|---|
| 1 Receive | R1 R2 R3 | #2271 |
| 2 Jobs queue and idempotency | R5 X1 X3 X7(doctor/nursing) | next |
| 3 Insurance | S3 | |
| 4 Cancel, reject, refund, reschedule | D1 D2 D3 D4 D5 S4 | |
| 5 Doing the work | W1 W3 W4 W5 W6 | |
| 6 No-show | W2 | |
| 7 Expiry and live lists | R4 R6 R7 R8 | |
| 8 Races and suspension | S1 S2 X4 X2 | |
| FOR F | X5 X6, the refund/earning listeners behind D1 D5 W5 | tell F |
