# Phase 0B semantic evidence — radiology.service.ts

**Archive member:** `src/modules/radiology/radiology.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–150, 151–300, and 301–429; full 429-line member covered.

## Construction and booking lookup

Lines 9–22 define provider roles and inject RadiologyService, legacy/center booking models, User, LabResult, StorageObject, WorkflowEngine and EventEmitter. Lines 27–30 unify booking lookup across legacy and center collections by trying `{ id }` in each. Lines 32–37 require a private, non-deleted storage object owned by `user.id`, and optionally require PDF MIME.

## Workflow and report paths

Lines 39–59 implement generic transitions using either `state` or `status`, normalize center aliases, check `RADIOLOGY_BOOKING_TRANSITIONS`, append state history with actor metadata, save, and emit `radiology.state_changed`. Lines 64–88 implement check-in and scan start with expected prior-state checks. Lines 94–115 validate abort reasons, restrict abort to arrived/in-scanning, save `SCAN_ABORTED`, and emit an abort event whose comment says a refund ticket is generated.

Lines 120–143 reject raw report URLs, require provider-owned private PDF storage, optionally validate DICOM/images as private storage, clear public URL fields, write findings/report draft state, and save. Lines 147–159 submit a report for review if secure report storage exists. Lines 162–183 approve an under-review report, set reviewer/timestamp, transition to ready, optionally emit doctor notification and set `doctor_notified`, then emit patient notification. `publishReport` delegates to approval (185–187).

## Insurance, reschedule, tracking, catalog request

Lines 193–210 process insurance approval only in three insurance-phase states, store approval code/copay/status, transition to waiting copay or confirmed, and emit an approval event. Lines 216–225 reschedule by directly assigning `new Date(body.new_date)`, append a same-state history entry, save and emit an event; no date validation, ownership, conflict check, lock, or idempotency is visible. Lines 231–266 return patient tracking from the legacy booking model and map states to Arabic/English labels. Lines 271–275 emit a catalog delta request and report success without persistence or approval result. Lines 277–285 mark preparation confirmed without visible actor or state checks.

## Catalog and patient/provider/admin methods

Lines 290–300 list active, non-deleted, publicly eligible, medically approved services with modality/body/search/home filters and return popularity-sorted results; modalities uses the same eligibility filters. Lines 303–312 resolve details by `_id` when ObjectId-valid or `short_code`, explicitly avoiding the legacy binary-corrupt `id`; it applies the same public/approved filters. Lines 314–333 implement patient booking with a three-minute duplicate heuristic by patient/service and active state, then create a UUID booking with `patient_id=user.id` and `NEW_REQUEST`; this is not an explicit `Idempotency-Key` contract. Lines 335–343 list a patient’s bookings and fetch a booking by raw id, but `getBooking` does not constrain by `user.id` or ownership.

Lines 345–356 cancel through generic transition and update insurance status on any found booking without visible ownership/role/state validation. Lines 358–364 append arbitrary document body to a booking without visible ownership, validation, storage authorization, or null-array handling. Lines 366–370 list provider bookings by `provider_account_id`, but provider role/tenant checks are not visible here. Lines 372–378 assign any technician ID to a found booking without visible provider/admin authorization or technician validation. Lines 380–386 admin-list all bookings with optional filters and a caller-supplied limit defaulting to 50; admin enforcement is not visible in this method. Lines 388–398 union patient reports from legacy and center bookings using both app UUID and Mongo `_id`, filtering report-ready states and excluding `_id`/`__v`.

Lines 400–418 protect catalog create/update/delete with `user.role === 'admin'`, but create/update accept arbitrary body fields, use legacy `id` for update/delete, and have no audit/idempotency/version guard visible. Lines 420–428 protect force-state by admin role, but allow arbitrary target state without transition validation.

## Confirmed security/truthfulness findings

**Ownership bypass:** `getBooking`, `updateInsuranceStatus`, `addDocument`, `assignTechnician`, and generic transition callers retrieve by raw booking ID without an explicit actor/tenant predicate in this service. `getTracking` similarly queries by ID and ignores `user`. This is evidence of missing service-level ownership checks; controller guards may still exist and must be traced separately.

**Mutation integrity:** booking duplicate prevention is a time-window heuristic, not a server-wide idempotency key or unique operation record. Reschedule, insurance update, document append, technician assignment, catalog CRUD and state changes show no idempotency or transaction/CAS in this member. `findBooking` across two collections increases consistency/race complexity.

**State machine gaps:** generic transition validates allowed transitions, but checkin/startScan/upload/approve/reschedule and adminForceState use different enforcement levels; adminForceState bypasses transition map. Reschedule records a same-state transition and accepts arbitrary date strings.

**Truthfulness/event gaps:** comments claim refund-ticket generation on abort and doctor auto-routing on approval; only event emission is visible, with no refund-ticket or delivery guarantee. Catalog delta returns success immediately after emitting an event without persisted approval state. Findings and document bodies are accepted without visible schema validation.

**Financial/insurance gap:** insurance approval trusts caller-supplied approval code/copay, sets `insurance_status='approved'`, and emits an event without visible NPHIES/payment verification, currency, claim reference, or ledger. No prices/payment settlement are computed in this service.

**Data source:** catalog list/detail filters provide active, non-deleted, public-eligible, medically-approved records from `svcModel`; booking/insurance/report data comes from legacy or center booking models. No external source verification is visible.

**Test implications:** require owner/stranger/unauth integration tests for every patient/provider/admin path; exact method/route verification; idempotency/replay and CAS/transaction tests; cross-collection consistency; report storage and signed access; state-machine enforcement including admin force; reschedule date/slot conflicts; insurance/payment verification; document validation and audit events. No tests executed during this semantic read.
