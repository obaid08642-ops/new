# Provider app and admin: screens audit, round 2 (client wiring)

Method: four read-only passes, each reading **both** the client call and the backend controller/DTO/service (endpoint, body fields, response fields read, error shown, mock/no-op), over registration/documents, availability/settings/notifications, the order flow (receive → accept → in progress → complete) for every provider type, and earnings/payouts plus the admin approval queues and money screens. 99 defects were reported by the passes; each fix below was re-read in code before it was changed. **Nothing was run against a live stack or a device.**

Counts: provider app ≈ 70 screens/files and ≈ 220 calls read; admin 14 screens and ≈ 70 calls read. Fixed in this PR: 34 client defects. Backend gaps: 23 (one line each below). Money items: 17, reported only, **FOR F**.

## Fixed in this PR (client)
| Area | Defect | Fix | File |
|---|---|---|---|
| Auth | "Resend code" only toasted "Code resent" (fake success) | calls `/provider/auth/forgot-password` again | `screens/auth/AuthScreens.tsx` |
| Auth | wrong/expired reset code showed nothing (`NOTP` had no error line) | error line under the code boxes | `components/ui.tsx`, `AuthScreens.tsx` |
| Auth | login labelled "Email / Mobile / Account ID" but the server signs in by email only | label and validation say email | `AuthScreens.tsx` |
| Onboarding | "Resubmit for review" posted to `/provider/onboarding/submit`, which needs document/bank rows the wizard never creates | posts to `/provider-onboarding/submit` (which re-queues a reviewed account); contract test updated | `PendingDashboard.tsx`, `provider-app.contracts.test.js` |
| Onboarding | documents step showed one fixed "failed" for every cause | invalid IBAN, bad licence date, file type, size are named | `registration/kit.ts` + 4 wizards |
| Onboarding | IBAN editable on the review page without a check | validated before submit | `registration/ReviewStep.tsx` |
| Hours | "8:00" accepted by the app, refused by the server | two-digit `HH:MM` | `shared/RealScreens.tsx` |
| Hours/schedule | toast said "saved" though the change only goes to review | says it was sent for review | `RealScreens.tsx`, `NursingDashboard.tsx` |
| Nursing schedule | started from invented defaults, never loaded the saved ones | loads `GET /provider/schedule/settings`; max visits validated | `NursingDashboard.tsx` |
| Doctor availability | vacation switch never saved (Save was disabled in vacation mode) while the toast said "enabled" | saves at once, reverts on failure, copy no longer claims it blocks bookings | `DoctorAvailabilityScreen.tsx` |
| Doctor availability | exceptions changed the screen only, toast "added" | saved at once, validated (date, HH:MM, start < end) | same |
| Doctor availability | a provider who never saved availability got no insurance list | null response handled | same |
| Doctor availability | insurance save always failed (server needs `classes`) | sends saved classes or the insurer's plans; copay checked 0–100 | same |
| Insurance screen | invented default copay `20`; matrix failure swallowed | starts empty; copay required 0–100; failure shown | `InsuranceConfigScreen.tsx` |
| Pricing | the second request's failure was swallowed; no validation | both must succeed; price > 0 for an active service | `DoctorSettingsTab.tsx` |
| Security | change-password showed one generic error; titled "2FA" (none exists) | wrong current password and policy shown; title "Security & Password" | `RealScreens.tsx` |
| Notifications | a failed load looked like "no notifications"; no mark-read | error with retry; tap marks read | `RealScreens.tsx` |
| Doctor sessions | specialty hard-coded `General Medicine` (server keys sessions by it) | the doctor's own specialty | `DoctorServiceManagementScreen.tsx` |
| Doctor queue | online-paid shown as "pay at clinic" (`'PAID'` vs `'paid'`); age never shown | case-insensitive; reads `patient_age` | `DoctorHomeTab.tsx` |
| Doctor insurance | every submission stored as PENDING (server reads `approvalStatus`); error text dropped | sends `approvalStatus`; server message shown | `DoctorHomeTab.tsx` |
| Doctor appointment | reschedule refused off the 15-minute grid; Confirm shown for confirmed/finished visits | rounds up to 15 min; Confirm only while pending | `AppointmentDetailScreen.tsx` |
| Lab | assign-technician sent typed text as an id (403) | lists the lab's technicians (`GET /labs/team/technicians`), or assigns the caller | `LabDashboard.tsx` |
| Lab | "Confirm direct order (cash)" offered for unpaid card / cash-at-home (server refuses) | says what it waits for | `utils/confirmBlocker.ts`, `LabDashboard.tsx` |
| Lab | home-collection dead end at `IN_LAB` | "Register sample" at `IN_LAB` | `LabDashboard.tsx` |
| Lab | emergency/reassign calls had no error handling; inbox failure looked like "no orders"; insurance error hid the reason | errors shown, retry on load failure | `LabDashboard.tsx` |
| Radiology | "Accept" offered for unpaid card/cash-at-home; aborted scans in no list; dead Reschedule on aborted; inbox failure = empty | gated, listed under In Progress, no dead button, retry | `RadiologyDashboard.tsx` |
| Nursing | Orders tab split on `status` (server sends `state`) so "Confirmed" was always empty; no-show/abort offered in every state; online toggle failure swallowed | split on `state`; buttons only where the server allows; toggle reverts with the reason | `NursingDashboard.tsx`, `NursingFieldOps.tsx` |
| Nursing (backend) | `GET /nursing/jobs/active` listed states the engine never writes, so confirmed/in-transit visits never showed | real states added | `backend/src/modules/home-care/nursing-compat.controller.ts:30` |
| Pharmacy | radar offered "Create offer" again for answered orders (`my_offer_status` dropped); "Dispatch" offered for pickup orders; hand-over of cash-on-delivery without collection | status kept and shown; next step chosen from the order detail, loaded when the order is ready | `PharmacyDashboard.tsx` |
| Facility | "Today's schedule" read fields the queue does not return and ignored `today` | maps the real fields, filters to today | `FacilityHomeTab.tsx` |
| Payout bank | a rejected bank account had no way to be corrected, reviewer note not shown | re-entry form with the note | `WithdrawalWorkflow.tsx` |
| Admin | provider/delta lists treated a 403/500 as "no pending accounts"; approve dialog claimed the bank is approved too | error with retry; text corrected | `admin/src/pages/admin/provider-moderation.tsx` |

## Backend gaps (one line each)
1. `provider-production.module.ts:567` weekly schedule, vacation and exceptions saved under `provider_accounts.availability`; nothing reads them (`care/slot.service.ts:137` uses `provider_schedule_slots`, `doctor.working_hours`, `leaverequests`). The doctor "weekly calendar" is decorative.
2. `provider-production.module.ts:567-610` the availability pulse (`instant_available*`) is not synced to `provideravailability`, which discovery reads (`care/care.service.ts:421,440`).
3. `provider/services/provider-profile.service.ts:44` allowed-key list omits `specialty` and `degree`, so a doctor profile edit with only those returns 400 while the app says "Sent".
4. `provider-ops.module.ts:627-638` working hours, pricing and schedule are pending deltas; the GET returns only the approved value, so a pending edit vanishes from the screen with no "pending" state.
5. `provider/services/provider-profile.service.ts:125-133` `listDocuments` reads `provider_documents` only; the wizard's `license_documents` never appear, so "Update documents" lists every type as missing.
6. `provider-onboarding.module.ts:148-151` the IBAN is validated for doctors only; other types are saved unchecked and `bank-row.ts` silently skips an invalid one.
7. `provider-onboarding.module.ts:446,467` `email_verified: true` is set at submit with no OTP check; the verification is client-side only.
8. `provider-onboarding.module.ts:206-213` the radiology allow-list lacks `home_visit_radius_km`; the value is dropped.
9. `storage/storage.module.ts:132,265` HEIC is not accepted; the app uploads `.heic` as `image/heic`.
10. `provider-jobs.module.ts:263-285` the insurance call only stores details and changes no state, so an insured request has no accept path for the doctor.
11. `radiology.service.ts:365` reschedule allows `PENDING`, `NEW_REQUEST`, `CONFIRMED` only; an aborted scan cannot be rescheduled (and nothing returns it to `CONFIRMED`).
12. `home-care/nursing-compat.controller.ts:45-49` and `provider-jobs.module.ts:129-146` the queue and `/nursing/jobs/active` return no service name, booking mode, hours, shift or price, so the nursing incoming sheet always shows generic text.
13. `home-care` has no `POST /home-care/provider/availability` route (the nursing online toggle calls it).
14. `provider-jobs.module.ts:129-146` the queue has no `is_urgent`, `doctor_name` or `department` (urgent badge and facility schedule columns).
15. `admin/provider-admin.service.ts:40` the provider list filters `status=pending`: a bank resubmitted after approval is never queued; approve-bank/reject-bank are reachable only from that panel.
16. `provider-admin.service.ts:401-426` "Reactivate" lives on the pending panel and approves a pending provider without commission or document handling; a suspended provider cannot be selected.
17. `provider-admin.service.ts:434,545-551` the delta approval reason the admin types is dropped (the reject path stores it).
18. `provider-profile.service.ts:161-185` the old `/provider/onboarding/submit` requires `provider_documents`, a bank row, `phones`, `display_name_ar`, `address.city`; the wizard writes none of them. The route is now unused by the app and could be removed.
19. `labs.service.ts:636` `listTechnicians` returns only operators of the lab; a lab owner is not listed (the app falls back to assigning the caller).
20. `ratings`/`provider-notifications`: the doctor `NotificationsScreen.tsx:49` and shared `NotificationsCenter.tsx:40` parse the old array shape (`{items,total,unread_count}` now); both components are unused and should be deleted.
21. `provider.controllers.ts:587-588` zones exist (`POST/DELETE /provider/zones`) but no app screen creates them; `LabHomeServiceScreen` is read-only.
22. `provider.controllers.ts:145` `/provider/operators` (staff) has no app screen.
23. `provider.controllers.ts:77-84` `GET /provider/auth/sessions` and `/history` exist; the app never shows signed-in devices.

## Money items, reported only (FOR F)
RevenueInsights groups "top services" by a field earnings rows do not carry (`provider-ops.module.ts:699-705`) and shows a balance from a different source than the wallet (`:744-749`); StatisticsScreen labels rolling buckets as calendar days/months (`:511-552`); admin `payouts.tsx:89` shows a raw provider id (`finance-suite.service.ts:312-327`) and `:46-47` drops a reason under 10 characters silently; `commissions.tsx:18-20,129` shows a hard-coded rate table (`commission-defaults.ts:21-27`), `:61-62` swallows load errors, `:154-157` reads fields the ledger rows do not have; `financial-ledger.tsx:86-98` recomputes commission with hard-coded rates, `:110-124` shows success without checking `res.ok`, `:10-20,115,231` types the warehouse order with fields the document lacks (`admin-extended-operations.controller.ts:17-21`); `disputes.tsx:38` sends no `booking_kind`/`booking_id` (`admin-disputes.controller.ts:~188-196`), `:35,66` says the refund goes to a wallet (it goes to the original payment method), `:60` reads `refunded_so_far` from a store the detail says is gone.

## Left as found, not fixed here
Doctor `DoctorHomeTab.tsx:262`: an insured request has only "Accept & Process Insurance" (needs gap 10). `FacilityOrdersTab.tsx:56-58` load failures still look like empty lists; its "Confirmed" cards have no action. `RevenueInsights.tsx:42` swallows a load error (money screen). Both notification components in gap 20 are unused.
