# UX journeys: patient and provider, end to end

Walked on 2026-10-31 by reading the code (patient-web, patient-app, provider-app, admin, backend). **Nothing was run.** Every line below is a code reading; each names the file and line that draws or does the thing, so it can be checked. Branch `qa/ux-journeys`, from `main` at 61d2ed96.

Owner rule: every flow complete, smooth and logical, nothing missing, nothing duplicated (duplicates are merged), and no user-visible text saying "needs review".

Severity: **P0** = the journey cannot be completed, or money is wrong. **P1** = completed but wrong, confusing or duplicated. **P2** = polish or wording.

Format of each problem line: `file:line | severity | problem | fix`.

## "Needs review" check

No user-visible "needs review" text in `patient-web/messages`, `patient-app/src/i18n/locales`, or any screen. The hits are code comments only, except one provider-app badge (see P2 list, `PharmacyPrescriptionReview.tsx:116`).

## Patient journeys

### 1. Sign-up and sign-in

- **Web sign-up (e-mail):** `/register` → `POST /api/auth/register` → `/otp` (identifier in an httpOnly cookie) → `POST /api/auth/otp/verify` → `POST /api/auth/session/exchange` → `/dashboard`. Works for e-mail. Breaks for a phone identifier (see P0).
- **App sign-up (e-mail):** `(auth)/register` → `/auth/send-otp` → `(auth)/otp` → `/auth/verify-otp` → `/auth/register` → `/(tabs)`. Works, but on deprecated endpoints, and records no legal consents.
- **Phone OTP sign-in:** no entry point on web or app. Broken on both.
- **Password sign-in:** web `/login`, app `(auth)/login`. Works. 2FA and passkeys exist only for admin roles.
- **Password reset:** web link-token flow; app code flow. Both work, as two different mechanisms.
- **Onboarding after sign-up:** web has no step (the `[locale]/onboarding` route has a layout and no page); the app's onboarding is language and intro only. No profile, address or consent step on either. Missing.
- **Sign-out:** web works. App clears Redux but keeps the tokens, so relaunch restores the session. Broken.
- **Expiry:** web redirects to `/login` on 401. App deletes the token on 401 and never routes to login; refresh is never called. Broken.

### 2. Consultation: booking → payment → call → prescription → pharmacy → cancellation and refund

- **Booking (web and app):** works. The fee shown is the doctor base fee, not the total.
- **Payment:** the amount shown is `total_price` (115 SAR for a 100 SAR fee) but the intent charges `booking.price` (100 SAR). Broken at amount.
- **Call (web):** works. **Call (app):** starts via `/calls/initiate`, which skips the slot window that the web path enforces.
- **Prescription:** the doctor creates it; the patient reads it. Works. A note save also sends a "prescription issued" push even when none exists.
- **Pharmacy from prescription:** works (offers, select, pay, track). There is no pharmacy-choice step: the patient chooses by offer. The prescription `send` endpoint has no caller.
- **Cancel and refund:** broken. The refund base is wrong, the refund is not shown after cancel, and a completed visit can still trigger a refund.

### 3. Labs, radiology, nursing and insurance

- **Lab, web:** `/labs` → add → basket → providers → when → confirm → `POST /api/ordering/bookings` → pay → `/labs/bookings/[id]`. Works for card. No family-member choice, no doctor review step.
- **Lab, app:** cart → quote → when → confirm → pay → result. Works.
- **Radiology, web and app:** confirm fails with `service_kind_not_bookable_yet`. Broken at confirm. The results path works when reached by other means.
- **Nursing, web:** works, single visit only, no duration choice. **Nursing, app:** broken on duration (price shown and charged differ).
- **Insurance:** add policy → checkout context → insurance request → copay charged. The copay path works; the insured lab "pay share" and the rejected self-pay path are broken.

### 4. Provider registration to payout

- **Registration:** the wizard submits (`provider-onboarding/submit`). Works, but the step data lands where later steps do not read it.
- **Documents:** files are stored as ids on the profile. No `provider_documents` row. Broken at resubmit and at per-document review.
- **Admin approval:** works (role, commission, SEO, notification). Resubmit after `needs_changes` does not.
- **Services and prices:** lab and radiology prices work. The doctor's sessions price is saved but never read by booking. Broken for doctor sessions.
- **Orders:** works. Labs have two state surfaces.
- **Payout:** broken. Finance-suite approval never reaches a paid state.

## Problems

### P0 (journey cannot be completed, or money is wrong)

- `backend/src/modules/payments/payments.module.ts:480` | P0 | The consultation card intent charges `booking.price`, but the amount shown comes from `total_price` (`:368`); the gap is never caught | Charge `total_price` for consultations, and add a test that the intent amount equals the capabilities amount.
- `backend/src/modules/care/appointments.service.ts:518` | P0 | `cancel()` saves refund fields and emits `appointment.refund.calculated` before `transition()` rejects an illegal move (`:482-484`), so cancelling a completed or cancelled visit still refunds | Validate the transition before saving or emitting, and emit only after it commits.
- `backend/src/modules/finance-engine/finance-engine.module.ts:849` | P0 | The listener refunds `total_price` × percent (115 SAR at 100%), but `RefundExecutor` caps at the paid amount (100 SAR; `refund_exceeds_paid` at `:662-680`), so a full refund fails and the error is only logged | Base the refund on the amount paid; send listener failures to an ops queue.
- `patient-web/app/[locale]/consultations/cancel-reschedule/page.tsx:42` | P0 | The screen states the refund from `cancellation_policy` (full at 24 h), but the server refunds from `refund_policy.consultation` (full at 2 h); at 5 h the screen says 0% and the server refunds 100% | Make the screen show the server preview (`care/appointments.controller.ts:65`), not a client computation. *Citation not confirmed on this line; the mismatch is from the walk.*
- `patient-app/app/nursing/nurse-profile.tsx:127` | P0 | The estimate and button show price × days, but the request sends no session count and the server books one visit, so the patient is charged one visit | Send `sessions_count` from the duration sheet, or drop the multiplier from the estimate and label.
- `patient-app/app/diagnostics/booking-status.tsx:402` | P0 | The insured "pay share" shows the approved share but calls the lab intent, which charges `booking.total` (`payments.module.ts:480`) | Charge `insurance_copay` through the insurance request intent.
- `patient-app/app/diagnostics/insurance-approval.tsx:150` | P0 | "Pay myself" after a rejection pushes to `/diagnostics/checkout` without `labId`, and `checkout.tsx:48` always answers "pick a lab": a dead end | Route self-pay to accept-self-pay plus the insurance intent, or pass `labId`.
- `patient-app/src/utils/orderingBooking.ts:274` | P0 | Radiology quotes are posted to `/ordering/bookings`, which rejects non-lab quotes (`ordering.service.ts:363`) | Book radiology through `/radiology/bookings`, and hide the ordering radiology entry until then.
- `patient-web/components-next/ordering/confirm-client.tsx:110` | P0 | Same radiology failure on web; `orderingErrorKey` turns the 400 into a generic error | Send web radiology to the working booking route, and map `service_kind_not_bookable_yet`.
- `backend/src/modules/provider/services/provider-profile.service.ts:170` | P0 | Resubmit requires `provider_profiles.phones` and `address.city`, which the wizard never writes, so wizard-registered providers in `needs_changes` or `rejected` are stuck | Make `submitForApproval` use the wizard's fields, and keep one submit path.
- `backend/src/modules/provider/services/provider-profile.service.ts:174` | P0 | Resubmit requires `provider_documents` and `provider_bank_accounts` rows, which the wizard never writes | Have the wizard's submit write those rows.
- `backend/src/modules/provider-ops/provider-ops.module.ts:654` | P0 | `creditEarning` uses only the `finance_config` percent; the per-provider rate set at approval and the commission rules are never read on the credit path, while the wallet shows the per-provider rate | Make `creditEarning` call `CommissionResolver.resolve`, and show that same rate in the wallet.
- `backend/src/modules/provider-ops/provider-ops.module.ts:83` | P0 | Gross is `booking.total_price`, which includes the platform service fee and home fees, so providers are credited and charged commission on platform fees | Credit only the provider's own price lines.
- `backend/src/modules/provider/services/service-capability.service.ts:121` | P0 | The doctor's "service and price" is saved to sessions after approval, but patients are charged the `price_clinic`/`price_online`/`price_home` fields, which that screen never writes | Make booking read the approved session price, or remove the screen and keep one price setter.
- `admin/src/pages/admin/finance-suite.tsx:36` | P0 | Approve sets `APPROVED_FOR_PAYOUT`, but the payouts page lists and executes only `PENDING_ADMIN_APPROVAL`, and nothing moves `APPROVED_FOR_PAYOUT` to paid, so the transfer never runs | Use one payout state machine: execute accepts `APPROVED_FOR_PAYOUT` and writes `COMPLETED`; list both states.

### P1 (completed but wrong, confusing or duplicated)

Auth and account:
- `patient-app/src/components/account/AccountView.tsx:69` | P1 | Sign-out clears only Redux; the tokens stay in SecureStore, so the next launch restores the session (same gap at `SettingsViews.tsx:37`) | Clear both SecureStore keys in one logout helper.
- `patient-app/app/(auth)/login.tsx:137` | P1 | No phone-OTP sign-in on the app; the login branch in `otp.tsx:101-143` is unreachable | Add a code sign-in action, or delete the dead branch.
- `patient-web/components-next/login-form.tsx:33` | P1 | Web has no phone-OTP sign-in; `/otp` is reachable only after register | Add a "sign in with a code" action.
- `backend/src/modules/auth/auth.service.ts:450` | P1 | OTP for a phone-only account is delivered by push only, so a new phone sign-up gets `otp_no_channel` | Add an SMS or WhatsApp channel, or refuse phone identifiers on web sign-up with a clear message.
- `patient-app/src/utils/api.ts:184` | P1 | A 401 deletes the token, but Redux stays authenticated and nothing sends the user to login; `SessionManager.rotateTokens` has no caller, so refresh never runs | On 401, dispatch logout and replace to `/(auth)/login`, and call `rotateTokens` first.
- `patient-app/src/services/auth/AuthInterceptor.ts:39` | P1 | The 401 handler only logs a warning | Trigger the same forced logout.
- `patient-app/app/(auth)/otp.tsx:65` | P1 | App sign-up and reset use deprecated aliases instead of the canonical endpoints | Move to `otp/request`, `otp/verify` and `password/reset`.
- `patient-app/app/(auth)/otp.tsx:123` | P1 | App sign-up calls legacy `/auth/register` with no consents, so no legal consents are stored, though the terms box is shown | Send consents through the same contract as web.
- `patient-app/app/(auth)/register.tsx:43` | P1 | App sign-up requires phone and e-mail; web accepts one identifier | Let the app accept either, as web does.
- `patient-app/app/(auth)/reset-password.tsx:35` | P1 | Password reset exists twice: a code flow on the app and a link flow on web | Move the app to the link flow and delete the code path.
- `patient-app/app/(auth)/forgot-password.tsx:19` | P1 | The app accepts e-mail only, so a phone-only account cannot reset from the app | Accept phone here too.
- `patient-web/app/api/auth/password/reset/route.ts:8` | P1 | Reset requires a 10-character minimum, but the form and backend accept 8, so 8 or 9 character passwords fail with a generic error (same at `patient-web/app/api/settings/password/route.ts:8`) | Use the shared minimum (8).
- `patient-web/messages/en.json:2399` | P1 | Reset copy says "Enter the code you received", but the e-mail carries a link | Reword to the link or token, in all locales.
- `patient-web/components-next/otp-screen.tsx:151` | P1 | After the 15-minute identifier cookie expires, `/otp` shows "missing" and resend is disabled | Let the user type the identifier, or reissue the cookie on resend.
- `patient-app/src/components/AppGate.tsx:59` | P1 | Maintenance and update screens use hard-coded Arabic (also lines 32, 37, 62), shown to every language | Move to i18n keys.

Consultation, cancellation and refund:
- `patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:26` | P1 | The BFF reads refund figures from the cancel response, which returns only `booking_id` and `status`, so the patient never sees the refund after cancelling | Return `refund_percentage`, `total_price` and `payment_status`.
- `backend/src/modules/care/appointments.service.ts:577` | P1 | Late cancels store `refund_destination: 'wallet'`, but the money goes to the card | Derive the destination from the executor, or drop the field.
- `patient-app/app/consultations/video-call.tsx:92` | P1 | Calls start via `/calls/initiate`, which does not check the slot window that `issueBookingCallToken` enforces | Apply the same window in `initiateCall`, or use the call-token route.
- `patient-app/app/consultations/cancel-reschedule.tsx:162` | P1 | Duplicate cancel: the app cancels from two screens through `PATCH /care/appointments/:id/cancel`, web uses `POST /unified-bookings/consultation/:id/cancel`, and a third route exists | Keep one route and one cancel screen.
- `patient-web/components-next/appointment-booking-form.tsx:61` | P1 | Duplicate booking form that posts without the slot lock; no page imports it | Delete it.
- `backend/src/modules/doctors/doctors.module.ts:303` | P1 | Duplicate booking backend: `POST /doctors/appointments` writes a separate collection; no client calls it | Remove the route.
- `backend/src/modules/care/doctor-referrals.controller.ts:73` | P1 | `issue-referrals-and-prescription` drops the medications but still says "prescription saved"; no client calls it | Delete it; use `prescriptions/create`.
- `backend/src/modules/doctors/doctors.module.ts:243` | P1 | Every consultation-note save pushes "prescription and report issued", even with no prescription; the copy is hard-coded Arabic in the backend | Send it only on a real prescription or report, and take the copy from the notification catalogue.
- `patient-app/app/consultations/cancel-reschedule.tsx:172` | P1 | The cancel failure alert shows the raw server code (e.g. `cannot_reschedule`) | Map codes to localized copy, as `booking-status.tsx:163` does.
- `backend/src/modules/prescriptions/prescriptions.controller.ts:36` | P1 | `POST /prescriptions/:id/send` has no caller, so a patient cannot send a prescription to a chosen pharmacy | Delete it, or add a pharmacy choice to the rx-order step.
- `patient-app/app/pharmacy/checkout.tsx:161` | P1 | Pharmacy order creation is duplicated in three places (`checkout.tsx:161`, `reorder.tsx:109`, `patient-web lib/pharmacy/broadcast.ts:122`) | Route all three through one create-and-submit helper.

Labs, radiology, nursing, insurance:
- `patient-app/app/diagnostics/checkout.tsx:115` | P1 | The legacy checkout pays only the first booking, so a mixed lab and radiology order leaves radiology unpaid, and the cart is cleared before payment succeeds | Pay each booking, or block mixed carts; clear only after a successful intent.
- `backend/src/modules/ordering/ordering-lifecycle.service.ts:311` | P1 | `postResults` writes an `ordering_results` store that nothing writes to except this, and the booking screens read only that store; real results come from `upload-report` | Delete the ordering results store, or share one write path with a notification.
- `patient-web/components-next/diagnostics-cart-client.tsx:101` | P1 | The legacy cart total excludes the home fee that `labs.service.ts:362` adds (latent: no current entry writes the cart) | Delete the legacy cart.
- `patient-web/components-next/diagnostics-checkout-form.tsx:74` | P1 | Home address is required in the form but never sent, so legacy home collection has no address | Send `address_id`, or remove the chain.
- `patient-web/app/[locale]/diagnostics/lab-comparison/page.tsx:36` | P1 | Duplicate lab cart and checkout on web (`diagnostics/cart`, `diagnostics/checkout`, `/api/diagnostics/orders`, a localStorage cart) beside the ordering basket; `lab-comparison` has no inbound link | Delete the legacy chain after confirming no entry point uses it.
- `patient-app/src/components/diagnostics/InsuranceUploadForm.tsx:189` | P1 | The hub prescription order creates legacy bookings outside the ordering flow, and only the first id is tracked, so a radiology booking has no approval screen | Route through `/ordering/bookings`, or track every booking.
- `patient-app/app/insurance/add-policy.tsx:142` | P1 | Two policy writers into the profile (`save-policy` here and in the web BFF, versus `POST /users/me/insurance` in the hub with a different shape); last writer wins | Keep one endpoint and one form.
- `backend/src/modules/labs/lab-results.service.ts:69` | P1 | Lab results go straight to REPORTED and notify the patient, with no doctor review, while radiology has a two-person approval | Add a review state before release, or document that lab results are auto-released.
- `patient-web/components-next/ordering/order-context-bar.tsx:40` | P1 | Web ordering cannot pick a family member (the app can) | Add a member picker and send `family_member_id`.
- `patient-web/components-next/ordering/booking-status-client.tsx` | P1 | Web insured booking has no pay-share action, so the patient cannot pay the approved share on web | Add the share payment through the corrected intent.
- `patient-web/components-next/ordering/confirm-client.tsx:206` | P1 | Insured confirm shows the total minus covered and ignores the copay estimate the server sends | Show the estimate when present.
- `patient-web/components-next/home-care-booking-form.tsx:53` | P1 | No duration or booking-mode choice on web; continuous services silently book one session | Expose the service's modes and session options, and send them.

Provider:
- `backend/src/modules/provider-onboarding/provider-onboarding.module.ts:148` | P1 | Registration IBAN is stored on the profile only; payouts need an approved bank-account row, so admin approval returns `no_pending_bank_account` | Create and approve the bank-account row from the wizard's bank step.
- `admin/src/pages/admin/finance-suite.tsx:36` | P1 | Duplicate payout approval: finance-suite, `payouts.tsx:50` and `financial-ledger.tsx:118` have different states, reason rules and dual-approval rules | Keep one screen and one endpoint pair.
- `admin/src/pages/admin/commissions.tsx:42` | P1 | Three commission setters (commission rules, `finance_config`, per-provider %); only `finance_config` reaches the ledger | One setter, plus an explicit per-provider override read by `creditEarning`.
- `admin/src/pages/admin/provider-moderation.tsx:117` | P1 | Default commission tables disagree (5/8/10/15 here; 10/12/12/15 in `commission-defaults.ts:18-24`; 10 in the schema) | One defaults module, imported everywhere.
- `provider-app/src/screens/shared/shared/ProviderWalletScreen.tsx:138` | P1 | "Approx. net" ignores VAT on commission and the insurance split, unlike `creditEarning` | Show the ledger's provider-earning sum.
- `provider-app/src/screens/shared/shared/WithdrawalWorkflow.tsx:115` | P1 | No `PAID` case in `statusLabel`, but `finance.controller.ts:123` writes `PAID`, so providers see the raw value | Map `PAID`, or standardise on `COMPLETED`.
- `admin/src/pages/admin/provider-moderation.tsx:216` | P1 | The reject prompt says document images are deleted; `provider-admin.service.ts:229-231` keeps them | Correct the prompt, or delete the files.
- `provider-app/src/screens/doctor/doctor/DoctorSettingsTab.tsx:105` | P1 | The same pricing is sent twice (`settings/delta` and `settings/pricing`), creating two pending changes | Send once.
- `backend/src/modules/provider/providers.service.ts:227` | P1 | Duplicate approve: the legacy `/providers/:id/approve` skips commission and document and bank approval | Delete it, or point it at `ProviderAdminService.approve`.
- `backend/src/modules/provider/providers.service.ts:133` | P1 | Duplicate onboarding: public `POST /providers/apply` creates a provider without `provider_accounts`, documents or bank, so it never reaches the admin queue | Remove it, or redirect to `/provider-onboarding/start`.
- `backend/src/modules/doctors/doctors.module.ts:154` | P1 | A second doctor booking path charges `consultation_fee`/`home_visit_fee`, while the care path charges `price_clinic`/`online`/`home` | Retire one path.
- `backend/src/modules/care/appointments.service.ts:226` | P1 | Home visit fee and transport price typed at registration are never charged; the platform's 100 + 50 SAR is added instead | Charge the provider's fees, or drop them from the wizard.
- `backend/src/modules/labs/labs.service.ts:362` | P1 | Lab home-collection fee typed at registration is never read | Same as above.
- `backend/src/modules/provider-jobs/provider-jobs.module.ts:215` | P1 | Job "complete" for a lab sets REPORTED with no result, bypassing `upload-report` | Route lab completion through `upload-report`.

### P2 (polish, wording, dead code)

- `provider-app/src/screens/pharmacy/PharmacyPrescriptionReview.tsx:116` | P2 | Hard-coded English "Needs review" badge (the only user-visible "needs review" found) | Use a "Pending review" key from the message files.
- `provider-app/src/screens/lab/LabDashboard.tsx:1064` | P2 | Hard-coded English "GPS TRACKING ACTIVE" in the Arabic UI | AR/EN key.
- `provider-app/src/screens/registration/kit.ts:103` | P2 | English fallback "Error" shown to Arabic users | Localized fallback.
- `admin/src/pages/admin/medicines-catalog.tsx:296` | P2 | Hard-coded Arabic import note | Move to a message key.
- `provider-app/src/**` | P2 | No message files in the provider app; strings are inline AR/EN ternaries | Move to a locale file.
- `patient-web/components-next/login-form.tsx:109` | P2 | "Forgot password" appears twice | Keep one.
- `patient-web/app/api/auth/send-otp/route.ts:1` | P2 | Orphan route with no caller | Delete it.
- `patient-web/components-next/sign-out-button.tsx:25` | P2 | Three sign-out components do the same POST | One shared component.
- `patient-app/app/(auth)/login.tsx:149` | P2 | E-mail placeholder and keyboard, but phones are accepted | Neutral placeholder.
- `patient-app/app/(auth)/otp.tsx:33` | P2 | Resend timer 60 s on the app, 300 s on the web | Align.
- `patient-app/src/navigation/guards/AuthGuard.tsx:1` | P2 | Exported and not imported by any screen checked | Wire it or delete it.
- `patient-web/app/[locale]/labs/page.tsx:14` | P2 | `/labs` and `/diagnostics/labs` render the same catalogue with different canonicals | Pick one, redirect the other.
- `backend/src/modules/insurance-engine/insurance-engine.module.ts:935` | P2 | Three copay endpoints; no frontend caller | Remove the unused routes.
- `backend/src/modules/notifications/notifications.service.ts:1083` | P2 | Listener for `radiology.report_published`, which nothing emits | Remove it.
- `backend/src/modules/payments/payments.module.ts:489` | P2 | Pharmacy intent subtracts `wallet_applied`, which capabilities do not subtract and nothing writes | Subtract in capabilities too, or delete the branch.
- `backend/src/modules/care/appointments.service.ts:582` | P2 | 50 SAR doctor penalty hard-coded, not in the refund policy | Read it from the policy.
- `patient-web/app/api/orders/[orderId]/cancel/route.ts:21` | P2 | Dead BFF route calling a legacy endpoint that refuses canonical pharmacy orders | Delete it.

## Not verified

- Runtime behaviour of every journey: nothing was run.
- Moyasar webhook and the payment return verification path (only the handlers' existence was confirmed).
- Whether `moyasar_payments` is set for consultations (the P0 on the consultation payment assumes the transactions path).
- Whether ordering-insured bookings carry `insurance_request_id` (decides how far the insured pay-share P0 reaches).
- The `cancel-reschedule` page's use of `cancellation_policy` (the citation did not match on that line).
- Radiology completion writes a `state` field the radiology schema may not declare.
- Whether `payout_approved` is emitted by finance-suite approval.
- Insurance copay path on the admin side, provider-web (not in repo), and notification i18n keys.
- Hard-coded string checks were sampled, not exhaustive.

## Delta after the merged fixes (2026-10-31)

Checked against `main` at 8975b933: the commits merged since this walk, and the cited lines re-read on `main`. Nothing was run.

### Fixed on main (per commit message; the code was not re-walked in full)

- Web sign-in with a code (phone OTP): `a0a7eef0` (`patient-web/components-next/login-form.tsx`, P0 on web). The app's sign-in is still open (`patient-app/app/(auth)/login.tsx:137`).
- Web password minimum, reset copy and OTP identifier re-entry (`a0a7eef0`): the P1 items for the 8-character reset, the "enter the code" wording and the expired identifier cookie.
- `otp_no_channel` now has a clear message (`a0a7eef0`). Delivery is unchanged: no SMS or WhatsApp channel exists, so `backend/src/modules/auth/auth.service.ts:450` stays open (P1).
- Admin reject prompt no longer says documents are deleted (`324b9102`, `admin/src/pages/admin/provider-moderation.tsx:216`, P1).

### Still open on main (the cited lines still match)

- Consultation payment amount: `backend/src/modules/payments/payments.module.ts:480` still charges `booking.price` (P0).
- Cancel after completion still refunds: `backend/src/modules/care/appointments.service.ts:518` (P0).
- Payout states: `admin/src/pages/admin/finance-suite.tsx:36` approves to `APPROVED_FOR_PAYOUT`, which nothing executes (P0).
- Radiology through the ordering route: `patient-app/src/utils/orderingBooking.ts:274` still posts radiology quotes to `/ordering/bookings` (P0, app; web at `patient-web/components-next/ordering/confirm-client.tsx:110`).
- Nursing duration: `patient-app/app/nursing/nurse-profile.tsx:127` still multiplies the estimate by days but books one visit (P0).
- Every other item in the walk: the files they cite were not changed on `main` since the walk.

### Open PRs that touch these items (not merged)

- #2215 `f/refunds`: validate before refunding, cap at paid, one policy source, refund in the cancel response (covers the cancel and refund P0s, not yet on main).
- #2214 `fix/auth-app`: app session handling, canonical OTP, register and reset, code sign-in (covers the app auth P0/P1 items, not yet on main).

### Still open on this PR's base

- PR #2015 (`qa/e2e-sweep-account`) is red on `live gate (shard 1/5)`. The only failing step is `j_web_qa_chi`: after a reload it finds two CHI links where it expects one. The code has one source of that link, so the cause is not yet established.
