# Live journey findings: work for the implementer agent

The reviewer finds these problems by driving the real backend with the live journeys
(`tools/live/j_*.py`). The reviewer fixes small issues directly. Anything larger is
listed here for the implementer agent, working on `fix/audit-2026-09`.

Rules for each item:
- Fix it where it is described. Do not widen the change.
- Add a unit test for the rule.
- Make the named live journey step pass (see `tools/live/README` or `start-backend.sh`).
- Commit with the item id in the message, e.g. `LJ-01`.

Status: `open` means the agent does it; `done` means the reviewer verified it live.

---

## PHASE LJ — Live-journey gaps

### LJ-01: Staff attendance has no caller (hospital)
- **Status:** open
- **Where:**
  - Backend: `backend/src/modules/facility-ops/facility-ops.module.ts`
    - `POST /facility/shifts/attendance/check-in`
    - `POST /facility/shifts/attendance/check-out/:id`
  - App: provider-app `FacilityDashboard.tsx`, the attendance screen (`GET /facility/shifts/attendance`).
- **Problem:**
  - The screen says attendance is "auto-registered when staff log in within facility GPS range", but no app calls check-in or check-out, so the list is always empty.
  - The controller only allows the HOSPITAL role, so a staff doctor could not check in anyway.
  - The facility id comes from `u.parent_provider_account_id || u.id`, but a staff member's token carries neither the facility id nor a link to it.
- **Required:**
  1. A provider linked to a facility (`provider_accounts.facility_id`, set on invitation accept or for hospital-created sub-accounts) can check in and out for its own facility from the provider app. Use GPS, and check the location against the facility coordinates (`provider_profiles` geo) within a configurable radius.
  2. The facility id is resolved on the server from `provider_accounts.facility_id`, never taken from the client.
  3. Allow one open attendance per person, and check-out only by its owner or the facility.
  4. The facility attendance screen lists real rows. Remove the "auto-registered" text unless it becomes true.
- **Live check:** in `tools/live/j_facility.py`, the linked doctor checks in, the facility sees them present, the doctor checks out, and a second check-in while one is open is refused.

### LJ-02: Insurance claims are a stub (submit-claim / claim-tracking)
- **Status:** open
- **Live check:** `tools/live/j_insurance.py`, journey "submit-claim -> claim-tracking" (currently fails).
- **Where:**
  - App: patient-app `app/insurance/submit-claim.tsx`, `claim-tracking.tsx`, and `hub.tsx` (`GET /insurance/claims`).
  - Backend:
    - `POST /insurance/claims/submit` and `GET /insurance/claims` are served by `InsuranceController` (`modules/insurance/insurance.module.ts`).
    - `GET /insurance/claims/my` is served by `InsuranceFlowController` (`modules/insurance-engine`), which returns insurance *requests*, not claims.
- **Problem:**
  - The screen sends only `{claim_type, status: 'pending', submitted_at}`, with no service, amount, booking, invoice or attachment, so the backend answers 400 "service is required".
  - The client also sets `status` itself.
  - Even a valid claim would never appear in claim-tracking, because that screen reads a different store.
- **Required:** a reimbursement claim the patient can actually file and track, in one store behind one controller.
  1. The form collects the booking (picked from the patient's paid bookings), amount, service date and invoice/receipt upload (existing upload/storage flow).
  2. The server sets the status and ignores any client `status` or `submitted_at`.
  3. `claim-tracking` and `hub` read the same store.
  4. Admin or the insurer can approve or reject; approval produces a refund to the patient through the existing refund path.
  5. Remove the duplicate route that is not served.

### LJ-03: Lab/radiology insurance has no copay payment and never confirms the booking
- **Status:** open
- **Live check:** `j_insurance.py` → `insured_lab`.
  - Today it only proves the decision and opt-in-cash. Extend it to: pay the copay/cash part, then the booking reaches CONFIRMED.
- **Where:**
  - Backend: `modules/labs/labs.service.ts` `updateInsuranceApproval` and `optInCash`.
  - Apps: patient-app `app/diagnostics/insurance-upload.tsx` (also creates `/radiology/bookings` with `payment_method: 'insurance'`) and `insurance-approval.tsx`; provider-app `LabDashboard.tsx` `handleUpdateInsurance`.
- **Problem:**
  - Consultations use the insurance request engine (decide, then copay/self-pay checkout, then CONFIRMED). Labs use a separate ad-hoc path: the lab writes a free-form `insurance_status` and per-item flags; the patient flags items "opt-in cash".
  - No copay or cash amount is ever charged, and the booking is not moved to CONFIRMED by the decision.
  - `status` is not validated (any string).
  - The radiology bookings created on insurance have no decision path at all.
  - *(Reviewer already fixed: only the assigned lab or an admin may decide.)*
- **Required:**
  1. Route lab and radiology insurance through the same insurance request engine as consultations: create the request at booking, the provider decides (full, partial with copay, or reject), and the patient pays the copay or self-pay by card with the existing intent/verify.
  2. On payment, confirm the booking (`confirmServiceBooking` already handles lab/radiology).
  3. Keep per-item coverage if needed, but the amount to pay is computed on the server.
  4. Validate the decision values.

### LJ-04: Insurance hub "CHI" import saves an invalid policy
- **Status:** open
- **Where:** patient-app `app/insurance/hub.tsx`, around line 160.
- **Problem:**
  - After the CHI lookup it posts `save-policy` without `company_id`, so the server answers 400.
  - It falls back to the fake policy number `'CHI-SCRAPED'` and sends `verified: true`. The server now ignores this flag, which is correct.
- **Required:**
  1. Map the CHI company name to an active insurance company (code or id) before saving.
  2. Do not save when there is no real policy number; ask the patient instead.
  3. Never send `verified`.

### Notes (reviewer, already fixed in `review/close-p1-p4`)
- `save-policy` looked the company up by `id`, but the add-policy screen sends its `code`, so no patient could add a policy (404). It now accepts either, keeps the form fields (expiry, national id, member name) and always stores `verified: false`.
- `payment-split.tsx` called `/payments/insurance/:id/(self-pay-)capabilities`, which does not exist (404), so the copay and self-pay checkout never opened. It now calls `/insurance/requests/:id/...`.
- After self-pay the server moves the request to COPAY_PENDING at 100%. The app's SELF_PAY_* states are never produced by the server; the app handles this through `checkout_copay`.

### LJ-05: Returns: the admin cannot see or decide them; service returns never work; two refund stores
- **Status:** open
- **Live check:** `tools/live/j_returns.py`.
  - Currently failing: "admin panel can list/decide", "refund-status lists the refund".
  - The refund itself works when the API is called directly.
- **Where:**
  - Backend: `modules/returns/*`; `modules/insurance-engine` `RefundController` (`/refunds/*`); `modules/patient-ux` refunds; `finance-engine` `RefundExecutor`.
  - Apps: patient-app `app/returns/new-request.tsx` and `hub.tsx`, `app/insurance/refund-status.tsx`; admin (no page).
- **Problem:**
  1. There is no admin list route (`ReturnsService.adminList` is never exposed). `POST /pharmacy/returns/:id/decide` sits outside `/admin/*`, so the admin BFF cannot reach it, and there is no admin page. **No return can ever be approved from the admin panel.**
  2. `new-request.tsx` offers consultation, diagnostics, nursing and insurance returns, but the server only resolves those amounts from the legacy `orders` collection. They always fail (400).
  3. The patient types the order id by hand, and the screen sends hardcoded amounts (250/120/80). The server ignores the amounts, which is correct, but the screen shows them.
  4. Refunds are recorded in three places: RefundExecutor (ledger plus wallet or Moyasar), `/refunds/*` (insurance-engine) and patient-ux refunds. `refund-status` reads `/refunds/my`, so executed refunds never appear there.
- **Required:**
  1. Add admin `GET /admin/returns` (filter by status) and `POST /admin/returns/:id/decide`, plus an admin page (list, detail with items and amount, approve/reject with note).
  2. `new-request` picks the order or booking from the patient's own delivered/completed ones (pharmacy orders, lab, radiology, nursing, consultations) and shows the server's eligibility and amount. Remove the hardcoded amounts.
  3. For service bookings, either resolve the amount from the real booking collections, checking ownership and paid status, or send those cases to the existing cancellation/refund rules. Do not keep a return path that can never succeed.
  4. Use one refund read model: `refund-status` lists every refund executed by RefundExecutor (card or wallet) with its status.
- *(Reviewer already fixed:)*
  - RefundExecutor credited nothing ("offline_recorded") when the patient had no wallet document yet; it now creates the wallet.
  - The non-pharmacy branch now rejects an order that is not the patient's.

### LJ-06: Patient↔provider chat must be per booking; direct messages are unrestricted
- **Status:** open
- **Live check:** `tools/live/j_chat.py`.
  - It already drives the target: booking thread, doctor PreVisitChatScreen, outsider refused.
  - Add patient-app steps once the screens use it.
- **Where:**
  - patient-app `app/consultations/chat-with-doctor.tsx`, which `clinic-confirm.tsx`, `home-visit-tracking.tsx`, `follow-up.tsx` and `NotificationHandler.tsx` open with `doctorId` only.
  - `modules/chat` `POST /chat/threads/direct`.
- **Problem:**
  1. chat-with-doctor needs the doctor's user id, but the public doctor profile (`/care/doctors/:id`) does not expose it, so the screen never opens a thread (it stops at `doctorUserId` undefined).
  2. `POST /chat/threads/direct` lets any user open a thread with any user id and message them, with no booking and no relationship check.
  3. Before the reviewer fix, the doctor's PreVisitChatScreen looked for a booking thread that the patient never created, and never loaded history.
- **Required:**
  1. chat-with-doctor opens `POST /chat/threads/booking {booking_kind:'consultation', booking_id}`, so every caller passes the appointment id. For follow-up and notifications, use the appointment of that conversation.
  2. Restrict `threads/direct`: allow only family (existing `checkIfFamily`) or an existing booking relation between the two users; otherwise 403.
  3. Nursing and other providers already use booking threads; keep them.
- *(Reviewer already fixed:)*
  - The booking thread admits only the booking's patient and provider. The caller was previously always added, and so was any client `provider_id` (IDOR on any booking conversation).
  - The doctor's PreVisitChatScreen now reads and sends on the appointment's booking thread (`GET /provider/chat/appointment/:id`, polling).

### LJ-07: Providers get no in-app notifications for new work
- **Status:** open
- **Live check:** `j_chat.py`, step "the doctor was notified about the new booking" (fails today).
- **Where:**
  - `modules/notifications/notifications.service.ts` (`service.assigned` → `create({ role: 'provider' })`).
  - `provider_notifications`, read by provider-app `/provider/notifications` (bell).
  - `push.module.ts`.
- **Problem:**
  - The provider bell reads `provider_notifications`, which only radiology results and ambulance dispatch write.
  - New consultations, lab, radiology and nursing bookings, pharmacy offers requested, insurance requests to decide and patient chat messages never notify the provider in the app.
  - `service.assigned` writes a role-wide notification to *every* provider instead of the assigned one.
- **Required:**
  1. On `service.assigned` / `service.requested` (and pharmacy broadcast, insurance request created, new chat message to a provider), write a `provider_notifications` row for **that provider account only**, with `related_type`/`related_id` so the bell opens the job, and send the device push to that account.
  2. Remove the role-wide provider broadcast.

### LJ-08: Loyalty cannot be administered; wishlist cannot be added to
- **Status:** open
- **Live check:** `tools/live/j_loyalty.py` (95/95 for what exists).
  - Rewards/claim steps only run when rewards exist; today there are none.
- **Where:**
  - `modules/loyalty/loyalty.controller.ts`
  - admin `pages/admin/loyalty-config.tsx`
  - patient-app `app/loyalty/*`, `app/pharmacy/wishlist.tsx`
- **Problem:**
  1. There are no admin routes to create, edit or disable rewards or challenges, so the rewards catalogue and challenges are always empty. The patient can earn points but never spend them.
  2. The admin loyalty page saves with `PUT /loyalty/config`, but only `GET` exists (404). The points table cannot be changed.
  3. The wishlist screen can only list and remove (the remove uses `POST /users/me/wishlist/:id`, a toggle). No screen in the app adds an item, so the wishlist is always empty.
- **Required:**
  1. Admin CRUD for rewards (name, points cost, stock, active) and challenges (goal, points, dates, active), plus admin pages.
  2. `PUT /admin/loyalty/config` (whitelisted keys, audited), with the page pointed at it.
  3. A heart/save button on the medicine detail (and pharmacy product card) that toggles `/users/me/wishlist/:medicineId`, and a wishlist screen that shows the real item names and prices.
- *(Reviewer already fixed:)* points were never earned.
  - Nothing emitted `booking.completed` or `review.submitted`.
  - `order.delivered` carried `patient_id` while the listener read `user_id`.
  - Loyalty and referral now listen to the workflow engine's `service.completed` (all domains); reviews emit `review.submitted`; order payloads are accepted.

### LJ-09 (CRITICAL): Provider earnings are never credited on completion, so no payout is possible
- **Status:** open
- **Live check:** `tools/live/j_admin_ops.py` → `payouts` (fails today).
  - A doctor who completed a card-paid consultation has `available: 0, lifetime_earned: 0`.
  - `POST /provider/payouts/request` → 400 `valid_amount_required`.
  - The admin payouts page is empty.
- **Where:**
  - `modules/provider-ops/provider-ops.module.ts` `creditEarning`, plus its callers:
    - `endConsultation` works on the legacy `doctor_appointments` collection, so it never runs for real appointments;
    - the lab/nursing ops endpoints use their own `ref_type`s (`lab_booking`, `homecare_booking`).
  - `workflow-engine` emits `service.completed` for every domain; `finance-engine` ledger; `payouts`.
- **Problem:**
  - The governed completion paths (`/care/appointments/:id/finish`, lab/radiology result publish, nursing complete, pharmacy allocation delivered) never write a `provider_earning` ledger row.
  - The provider balance, "today's earnings", the CRM revenue, the admin ledger summary and payouts are therefore all zero.
- **Required:**
  1. One place credits earnings: on `service.completed` (or the domain's completion transition), resolve the booking, its provider account (for pharmacy, the allocation's pharmacy per delivered allocation), and the gross amount the patient actually paid (card paid or cash collected; insurance: the covered part plus the copay).
  2. Call `creditEarning` with one canonical `ref_type` per domain, idempotent on the booking id, so the ops endpoints and the event cannot double-credit.
  3. Refunds already claw back through RefundExecutor (keep that working).
  4. Add the ledger step to each domain journey: after completion the provider's `lifetime_earned > 0`; after the delay window the payout request, then admin execute, then the provider sees it paid.

### Notes (admin sweep, `tools/live/j_admin_sweep.py`)
- Every literal page-load call in the admin panel (60) returns 2xx, except:
  - `nursing-portal` (`/admin/nursing/requests` 503): the intentional gate "pending eligible-provider/PHI/audit workflow".
  - `security` (`/auth/passkey/devices` 403): passkeys are restricted to the designated admin email by design.
  - `impersonation` (403): super-admin only by design.
  - The pages must show those states instead of an error. Check this in the render test (task #4).
- *(Reviewer already fixed:)* the admin BFF sent `PUT /legal/policy/:key` to the public controller (404), so legal policies could not be edited. Legal edits and diffs now go to `/api/v1/admin/legal/*`.
- On a fresh database there are no legal policies (`/legal/policies` = []). The admin must publish privacy/terms before launch (added to the deploy brief).

### LJ-10: Website render test: small UX gaps
- **Status:** open
- **Live check:** `tools/live/web_render.mjs` over all 227 static patient-web pages as a logged-in patient.
  - Every page answers 200, with no JS errors and no 5xx.
- **Remaining:** `/family/chat` for a patient with no family group calls `/family/chat/messages` and receives 403. The page must show the "create or join a family" state instead of an error.
- *(Reviewer already fixed:)* `/map` was blocked by the web BFF allow-list (`/providers/map` 404). It is now allowed as a read-only request.
- **Note:** `POST /api/auth/heartbeat` returned 404 on every page of the `main` build. The agent's P6 commit `e3afb28` adds that proxy; verify it when P6 is reviewed.
