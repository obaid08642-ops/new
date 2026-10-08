# Provider journey audit (read-only), 2026-10-08

Branch `wip-prov-journeys` (from `origin/design/provider-audit`, commit `982a2f21` inventory). Problems: `docs/design/needs-review/provider-journeys.json` (54 lines, sorted by scenario, each with the exact client `file`/`line`, `backend` when the cause is on the server). Proposals (merges, missing screens): `docs/design/PROVIDER_PROPOSALS.md`. Nothing was fixed. Existing lines in `needs-review/provider-*.json` and `PROVIDER_AUDIT_SUMMARY.md` are referenced, not repeated (for example `ProviderWalletScreen` "Request Withdrawal" to an unregistered `withdrawal_workflow`, `EPrescriptionScreen` send-to options without handler, `PharmacyQRMenuScreen` placeholder, `NurseVisitConsole` stub).

**How it was walked.** Code walk only: each scenario was followed from the screen file, through every `onNavigate`/`navigation.navigate` target registered in the role navigator, to the `client.*` call, to the Nest controller and service that answers it (state machines, guards and DTOs read, not run). No runtime: no provider account can sign in with the test seed (no `provider_accounts` row, see `PROVIDER_AUDIT_SUMMARY.md` "Runtime check"), so the "works" marks below mean "wired and consistent in code", not "seen working".

**Status words:** `works` (wired, consistent), `broken` (call/field/state does not match, or wrong result), `dead end` (the user cannot continue), `missing step` (a step the journey needs does not exist), `missing screen`.

| Scenario | Steps walked | works | broken | dead end | missing | Problems (json) |
|---|---|---|---|---|---|---|
| 1 Pharmacy: request, offer, patient accepts, prepare, hand over | 12 | 8 | 1 | 3 | 0 | 18 |
| 2 Doctor: schedule, consultation, e-prescription, follow-up | 10 | 7 | 2 | 0 | 1 | 11 |
| 3 Home visit / nursing: on the way, arrived, done, result | 7 | 6 | 0 | 0 | 1 | 9 |
| 4 Provider sign-up, licence, admin approval, first login | 7 | 3 | 2 | 1 | 1 | 9 |
| 5 Earnings: balance, wallet, withdrawal, payout status | 5 | 2 | 2 | 1 | 0 | 7 |

Step status is the status of the main path in the tables below ("works" can still carry a side problem, listed in its last column); the json counts every problem line.

Top-line facts: a pharmacy cannot reach its inventory, wallet, order history or notifications (the navigator registers 40 names, the UI links to 3 of them); the pharmacy is never notified when a patient picks its offer; payout rows always render as "paid" (green) because the client reads `status` and the server sends `state`; a new provider whose account is `pending_admin_approval` enters the dashboard before approval; "Check-in" for nursing fails with `invalid_transition` after the normal accept; a doctor cannot prescribe after finishing the visit and gets a generic error before starting it.

---

## Scenario 1: Pharmacy, medicine request to hand over

Roles: `pharmacy`. Navigator: `PharmacyDashboardNavigator` (`provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:76`). Bottom tabs: Orders (radar), B2B, Dispatch, Settings.

| # | Step | Screen file | Call | Backend route | Status | Problem |
|---|---|---|---|---|---|---|
| 1 | Go online, request arrives | `PharmacyDashboard.tsx:192` `PharmacyHomeTab` | `POST /provider/ops/availability/toggle-instant`; `GET /provider/pharmacy/broadcasts` (5 s poll + socket `pharmacy:broadcast:*`) | `pharmacy.controllers.ts:202` `ProviderBroadcastController.list` | works | Alarm modal never opens (`:81`); radar does not mark orders already answered (backend `pharmacy-broadcast.service.ts:430`). |
| 2 | Reject | same, `confirmReject` | `POST /provider/pharmacy/broadcasts/:orderId/reject` | `ProviderBroadcastController.reject` | dead end | Error swallowed (`:305`); list filter compares `b.id` with `order_id` (`:303`). |
| 3 | Open composer | `shared/blueprint/PharmacyBroadcastResponse.tsx:21` (route `pharmacy_broadcast`) | none (data passed from the radar card) | none | works | Rx attachments listed as links; lines come from `broadcast.items`. |
| 4 | Map each line to a catalogue item | same | `GET /provider/inventory/search?q=` once per line | `ProviderInventoryExtController.search` (pharmacy's own inventory, 2+ chars) | dead end | Fixed query, no re-search box (`:41`); empty inventory means every line "unavailable"; the inventory screen `product_catalog` is not reachable from the UI (`PharmacyDashboard.tsx:171`). |
| 5 | Preview quote | same | `POST /provider/pharmacy/broadcasts/:orderId/offers/preview` | `ProviderBroadcastController.previewOffer` (server prices, ceiling by decision 12) | works | Custom price field accepted although the card says prices are not entered (`:136`, owner). |
| 6 | Save draft, send offer | same | `.../offers/draft`, `.../offers/:offerId/submit` | `draftOffer`, `submitOffer` | works | After send the screen only goes back; no "my offers" list or status (`:105`). Delivery card text is static (`:140`). |
| 7 | Patient accepts | none on the provider side | none | `pharmacy-offer.service.ts:414` emits `pharmacy.offer.selected` | broken | No subscriber, `notifyPharmacyNewAllocation` never called: no push, socket or badge. |
| 8 | See the selected order | `PharmacyDashboard.tsx:869` `DispatchWorkflowScreen` (tab Dispatch) | `GET /provider/pharmacy/allocations` (once on mount) | `ProviderPharmacyController.list` | dead end | No refresh or poll (`:900`). |
| 9 | Confirm, prepare, ready | same | `POST .../allocations/:id/confirm`, `/preparing`, `/ready` | `pharmacy-allocation.service.ts:237 confirm`, `advance` | works | Payment/COD/insurance gate errors are mapped to clear messages. `partially_confirmed` has only "Confirm": see dead ends. |
| 10 | Insurance decision (insurance orders) | `PharmacyInsuranceDecision.tsx:25` (Settings tab, "Inbound Insurance Requests") | `GET /provider/pharmacy/allocations?status=`, `POST /provider/pharmacy/orders/:id/insurance-decision` | `ProviderPharmacyController.insuranceDecision` | works | Two other routes show insurance work: shared `insurance_requests` (`/insurance/requests/provider/queue`). |
| 11 | Dispatch with courier, or hand over; COD proof | `DispatchWorkflowScreen` | `POST .../allocations/:id/out-for-delivery`, `/delivered` (with `collection` for COD) | `allocs.outForDelivery`, `allocs.delivered` | works | Pickup orders are handed over (button correct); history screen is always empty (`:1435` asks status `completed`). |
| 12 | Chat with the patient | `PharmacyChatScreen` (route `pharmacy_chat`, from the order card) | `GET/POST /pharmacy/chat/threads...` | `PharmacyChatController` | works | Existing lead: patient session got 200 on `GET /pharmacy/chat/threads` (`provider-pharmacy.json`). |

## Scenario 2: Doctor, schedule to follow-up

Roles: `doctor`. Navigator: `DoctorDashboardNavigator` (`doctor/doctor/DoctorDashboardNavigator.tsx`), tabs home, schedule, chat, wallet, settings (+ drugs, jobs).

| # | Step | Screen file | Call | Backend route | Status | Problem |
|---|---|---|---|---|---|---|
| 1 | New requests, accept/reject | `DoctorHomeTab.tsx:55` | `GET /provider/jobs/queue?status=incoming&kind=consultation`; `POST /provider/jobs/consultation/:id/accept` or `/reject` | `provider-jobs.module.ts:263` | works | Insurance gate posts `/provider/jobs/consultation/:id/insurance`. |
| 2 | Day schedule | `DoctorScheduleTab.tsx:56` | `GET /provider/jobs/queue?status=active&kind=consultation` | `provider-jobs` queue | broken | Day/Week/List toggle does nothing (`:108`); Home "Today" has no date filter (`DoctorHomeTab.tsx:135`). |
| 3 | Appointment detail, reschedule, cancel | `AppointmentDetailScreen.tsx:54` | `PATCH /care/appointments/:id/confirm|cancel|reschedule` | `care/appointments.controller.ts:35-46` | works | Date and time are typed as text (`:82`). |
| 4 | Open consultation, check in, start | `LiveConsultationScreen.tsx:63` | `GET /care/appointments/:id`; `PATCH .../check-in`, `.../start` | `appointments.controller.ts:52,58` | works | Verification is server-side; states CONFIRMED, CHECKED_IN, IN_PROGRESS. |
| 5 | Video call (inside the booking, decision 24) | `shared/VideoCallRoom.tsx` (route `video_call`) | `POST /calls/initiate`, `/calls/:sid/join`, `/calls/:sid/end` | livekit controller | works | Button "Start video call" shown for every ready state. |
| 6 | Chat inside the booking | `doctor/doctor/CertificatesConfigScreen.tsx:115` `PreVisitChatScreen` (route `pre_visit_chat`) | `GET /provider/chat/appointment/:id`, `POST /provider/chat/send` | `home-care-compat.module.ts:384-402` (booking thread) | works | Entry vanishes after completion (`LiveConsultationScreen.tsx:138`); text "15 mins early" (`:154`); window 24 h not 72 h (backend `chat.service.ts:234`). |
| 7 | Prescription | `EPrescriptionScreen.tsx:140` | `POST /prescriptions/create` | `prescriptions.controller.ts:13` (needs appointment IN_PROGRESS, `prescriptions.service.ts:62`) | broken | Button visible before Start (`LiveConsultationScreen.tsx:139`), generic error (`EPrescriptionScreen.tsx:140`); never callable after Finish (`:111`). |
| 8 | Finish visit (diagnosis, notes) | `LiveConsultationScreen.tsx:90` | `POST /care/appointments/:id/finish` | `appointments.controller.ts:70` | works | Diagnosis typed here and again in the prescription. |
| 9 | Sick leave / medical report / referral / test request | `SickLeaveScreen`, `MedicalReportScreen`, `ReferralScreen`, `RequestTestScreen` | `POST /provider/requests/:id/sick-leave`, `.../medical-report`, `POST /provider/referrals` | `provider.controllers.ts:331,381` | works | Reachable only while the visit is not completed (same cause as step 7). |
| 10 | Follow-up | none | none | none | missing step | Doctor cannot book/propose a follow-up, close or extend the 72 h thread (decision 24, `LiveConsultationScreen.tsx:143`). |

## Scenario 3: Home visit / nursing (and home lab) to result

Roles: `nursing`/`home_care`, `lab`. Navigators: `NursingDashboardNavigator` (`nursing/NursingDashboard.tsx:60`), `LabDashboardNavigator`.

| # | Step | Screen file | Call | Backend route | Status | Problem |
|---|---|---|---|---|---|---|
| 1 | Request arrives, accept | `NursingDashboard.tsx:148` / `:434` | `GET /provider/jobs/queue?kind=nursing&status=incoming`; `POST /provider/jobs/nursing/:id/accept` | `provider-jobs.module.ts:273` (state `CONFIRMED`; card needs payment, insurance needs coverage decision) | works | Another "Accept visit" in field-ops posts `/nursing/visits/:id/respond` which always answers 503 (`NursingFieldOps.tsx:118`). |
| 2 | On the way | `NursingFieldOps.tsx` "Start transit" (route `order_detail`) | `POST /nursing/visits/:id/transit` | `home-care.controller.ts:234` (CONFIRMED to IN_TRANSIT, notifies patient) | works | The other screen `DigitalCheckin` "start trip" (`NursingDashboard.tsx:629`) posts GPS only: no server state, no patient notice. |
| 3 | Arrived | `NursingFieldOps.tsx` "Check in (GPS)" | `POST /nursing/visits/:id/arrive` | `home-care.controller.ts:253` (IN_TRANSIT only) | works | `DigitalCheckin` "Check-in" (`:347`, `:642`) posts `/home-care/bookings/:id/check-in`, which refuses CONFIRMED (backend `home-care-compat.module.ts:183`): invalid_transition. |
| 4 | Care in progress, vitals, notes | `NursingFieldOps.tsx` "Start care"; `ProgressNotes`, `VisitChecklist` | `POST /nursing/visits/:id/start-care`; `POST /nursing/notes`; `POST /provider/ops/nursing/bookings/:id/checklist/before` | `home-care.controller.ts:293,60` | works | Checklist post has a swallowed error (`.catch(()=>`). |
| 5 | Done | `NursingFieldOps.tsx` "Complete visit" (needs patient signature) | `POST /nursing/visits/:id/complete` | `home-care.controller.ts:349` (CARE_IN_PROGRESS only) | works | `VisitReport` ends a visit with `visit-report {complete:true}` from ARRIVED with no signature (`home-care-compat.module.ts:238`). |
| 6 | Result upload (nursing) | `VisitReport` (`NursingDashboard.tsx:874`) | `POST /home-care/bookings/:id/visit-report` | compat module | missing step | Text and vitals only; no photo or file. |
| 7 | Home lab: trip, arrived, sample, report | `LabDashboard.tsx:1067` (arrived), `:809` (report) | `PATCH /labs/bookings/:id/state` (IN_TRANSIT, IN_LAB); `POST /labs/samples/register`; `PATCH /labs/samples/:id/stage`; `POST /labs/bookings/:id/upload-report` | `labs.controller.ts:56,148,154,98` | works | Arrival is stored as IN_LAB; report is structured rows only, `send_to` not used (`labs.service.ts:459`). |

## Scenario 4: New provider to first login

| # | Step | Screen file | Call | Backend route | Status | Problem |
|---|---|---|---|---|---|---|
| 1 | Choose type, sign-up wizard | `auth/AuthScreens.tsx` `WelcomeScreen` then `{Type}Registration` | `POST /provider-onboarding/start`; `POST /auth/login` (onboarding identity) | `provider-onboarding.module.ts:491` | works | Ambulance type still offered (`App.tsx:147`, decision 14). |
| 2 | Licence upload | `pharmacy/PharmacyRegistration.tsx:357` `handleNext`; same pattern in lab, radiology, nursing, doctor, facility | `POST /storage/upload`; `POST /provider-onboarding/step2` | `provider-onboarding.module.ts:497` | broken | Uploaded as `image/jpeg` then again as `application/pdf` (`:361`, `:909`); no "file picked" validation (`:289`). |
| 3 | Contract, signature, email OTP, submit | `PStep7Submit` (`PharmacyRegistration.tsx:861`) | `step3`, `step2`, `POST /provider-onboarding/submit` | `provider-onboarding.module.ts:505` | works | Creates the provider account as `pending_admin_approval` (`:392`). |
| 4 | Wait for admin | `auth/PendingDashboard.tsx:11` | `POST /provider/auth/send-otp`, `/verify-email` | `provider.controllers.ts` | dead end | No status refresh; rejected/needs_changes show the same "under review" text (`App.tsx:92`); OTP card never shows (`:27`). |
| 5 | Admin approves | admin app | `provider-admin.service.ts:132 approve` (role flip, bank approved, sessions revoked) | | works | Provider must log in again; nothing says so. |
| 6 | First login | `context/index.tsx:256 checkAppStatus` | `POST /provider/auth/login` | `provider-auth.service.ts:127` | broken | Server statuses `pending_admin_approval`, `needs_changes` are not mapped (`:260`): a not-yet-approved provider reaches the dashboard. |
| 7 | Onboarding state after approval | role navigator | none | none | missing step | No checklist (hours, stock, delivery area, bank, go online). |

## Scenario 5: Earnings to payout

| # | Step | Screen file | Call | Backend route | Status | Problem |
|---|---|---|---|---|---|---|
| 1 | Balance (doctor) | `DoctorWalletTab.tsx:46` | `GET /provider/wallet`, `/provider/wallet/transactions` | `provider-ops.module.ts:801-806` | broken | Figure = earned minus payouts, clamped, 200 rows, includes escrow (`:718`); "Dues" label wrong (`DoctorWalletTab.tsx:80`). |
| 2 | Balance (pharmacy, lab, nursing, radiology, facility) | `shared/shared/ProviderWalletScreen.tsx:30` | same + `GET /provider/me` | same | dead end | Pharmacy has no way to open it (`PharmacyDashboard.tsx:144`); lab, nursing, radiology, facility register no `withdrawal_workflow` (existing line in `provider-shared.json`). |
| 3 | Bank account | `shared/shared/WithdrawalWorkflow.tsx:30` | `GET/POST /provider/bank-account`, `GET /provider/banks` | `provider.controllers.ts:96` (review pending until admin) | works | Screen handles `review_status` correctly. |
| 4 | Withdrawal request | `WithdrawalWorkflow.tsx:98` | `POST /provider/payouts/request` (idempotency key) | `provider-payouts.controller.ts` (ledger reservation, min from config) | works | Minimum 100 hard-coded in the screen (`:81`). |
| 5 | Payout status | `WithdrawalWorkflow.tsx:286` | `GET /provider/payouts/mine` | `provider-payouts.controller.ts` rows with `state` | broken | Client reads `status`, `admin_note` (`:119`, `:76`, `:302`); every row shows green "paid" style and a raw label. Admin approval (`finance-suite.service.ts:287`) and execution (`finance-engine.module.ts:1120`, COMPLETED) exist. |

---

## Dead ends (the user cannot continue)

1. Pharmacy: line the first inventory search misses can only be "unavailable" (`PharmacyBroadcastResponse.tsx:41`); empty inventory cannot be filled from the app (`PharmacyDashboard.tsx:171`).
2. Pharmacy: wallet, withdrawal, order history, scanner, returns, reviews, working hours, notifications, support, expiry monitor, insurance config, certificates: registered, no link (`PharmacyDashboard.tsx:101`, `:144`).
3. Pharmacy: Dispatch list never refreshes, new selected order not noticed (`:900`) and no notification (backend `pharmacy-offer.service.ts:414`).
4. Pharmacy: `partially_confirmed` allocation (backend `pharmacy.schema.ts:102`).
5. Pharmacy: reject failure silent (`:305`).
6. Doctor: after "Finish visit" no prescription, sick leave, report, referral or test (`LiveConsultationScreen.tsx:111`).
7. Nursing: "Accept visit" in field-ops always 503 (`NursingFieldOps.tsx:118`); "Check-in" fails on a normal accepted job (backend `home-care-compat.module.ts:183`).
8. Sign-up: rejected or needs-changes provider has no reason, no resubmit (`App.tsx:92`).
9. Earnings: pharmacy cannot open the wallet; lab/nursing/radiology/facility "Request Withdrawal" opens nothing (existing audit line).
10. Payout history: wrong status mapping hides pending/rejected (`WithdrawalWorkflow.tsx:119`).

## Not walked / limits

- No runtime: provider sign-in is impossible with the test seed. Every "works" is by code only.
- The patient side of the same journeys (offers, payment, tracking) is in `docs/journeys/patient.md` (branch `design/journeys-patient`); this file starts at the moment the provider is involved.
- Lab, radiology and facility were walked only where a scenario step needs them (home lab report). Their screens remain covered by `PROVIDER_AUDIT_SUMMARY.md`.
- Backend gaps are listed with `[backend]`, not fixed (design session rule).
