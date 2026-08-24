# Phase 0B semantic evidence — AppointmentsService

**Archive member:** `src/modules/care/appointments.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 1–335 and 336–471 from the baseline archive extraction.

Lines 1–35 define the appointment service, repositories, Mongo connection, events, and workflow engine. Lines 12–17 define hard-coded platform fees: SAR 15 service fee, SAR 100 home-visit fee, and SAR 50 transportation fee. Lines 37–52 implement family on-behalf booking authorization through `family_groups`, requiring ownership or a `booking` permission.

Lines 54–189 implement appointment creation. Required doctor/service/slot fields are checked; family bookings switch patient identity while retaining booker ID. Payment policy is explicit: online consultation card-only, home visit card/insurance, clinic cash/card/insurance. Doctor must be active and support the service type. Slot must be at least five minutes in the future and exactly 15-minute aligned. Duration defaults to 30 minutes; a five-minute buffer is used in overlap checks. Doctor price is snapshotted from profile fields, fees are added, and total is persisted. Creation starts PENDING; non-card payment auto-confirms through a system actor, while card waits for payment webhook. Duplicate slot errors map to conflict.

Lines 191–204 implement doctor-owner detection across multiple identity fields and appointment access for admin, patient owner, or doctor owner; unauthorized access returns `ForbiddenException`, not 404. Lines 206–224 implement listMine with role-specific query: admin all, doctor profile appointments, otherwise patient appointments, capped at 200.

Lines 226–247 implement detail. It authorizes the appointment, attaches doctor display data, then returns hard-coded strings for `queue_position='٣'`, `ahead_count='٢'`, and `wait_time='١٥'`. These are explicit truthfulness defects in the baseline source.

Lines 249–273 implement generic state transition through `APPT_TRANSITIONS` and WorkflowEngine, with a system actor bypass. Lines 274–324 implement cancellation/refund calculation based on no-show, hours until appointment, patient/doctor actor, refund destination, and doctor penalty; it saves refund metadata, emits a refund-calculated event, then transitions to CANCELLED. Refund execution is delegated to event consumers.

Lines 326–342 provide confirm/check-in/start/complete wrappers. Lines 343–360 implement doctor finish, persisting SOAP-like summary fields before completion. Lines 362–371 return summary to patient/doctor/admin, but missing summary returns 404 not-ready.

Lines 373–428 implement reschedule. It checks owner/doctor/admin access, rejects terminal states, validates future 15-minute slot, checks overlap/buffer, creates a replacement appointment copying price/fees and setting CONFIRMED, then marks the original RESCHEDULED. Failure of original save compensates by deleting the replacement; there is no visible database transaction or idempotency key in this service.

Lines 430–443 implement waitlist join as event emission plus success response; no waitlist persistence or duplicate suppression is visible. Lines 445–471 implement `payment.completed` event handling for consultation. It ignores other booking kinds, logs missing appointments, skips already non-PENDING appointments, sets payment status paid, transitions to CONFIRMED as system, and emits appointment confirmed. This is logically idempotent on appointment status but has no visible amount validation against the appointment total or transaction dedupe key.

**Auth/ownership:** patient/doctor/admin service checks; unauthorized appointment access is 403. Family booking uses group membership/permission. System actor bypasses generic access for internal transitions.

**State transitions:** PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED, plus CANCELLED/RESCHEDULED; card payment webhook confirms pending appointments; no-show/refund metadata and doctor penalty side effects.

**Price/payment/insurance source:** doctor profile prices plus hard-coded fee schedule; payment policy by service type; card confirmation via payment event; insurance is accepted as a method but adjudication delegated; refunds emit calculated metadata, execution delegated.

**Security/truthfulness observations:** hard-coded queue/ahead/wait values; 403 rather than non-disclosing 404; hard-coded platform fees; reschedule replacement/old-state writes are compensating, not transactional; waitlist is event-only and not durable; payment webhook lacks amount/transaction validation; no visible idempotency on create/cancel/reschedule/waitlist.

**Test implications:** payment-method policy, family permissions, slot alignment/overlap/race, price snapshots/fee configuration, owner/doctor/admin access, 403-vs-404 contract, hard-coded queue regression, cancellation/refund rules, reschedule compensation and replay, waitlist duplicate behavior, payment webhook amount/transaction/idempotency, and state transitions. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
