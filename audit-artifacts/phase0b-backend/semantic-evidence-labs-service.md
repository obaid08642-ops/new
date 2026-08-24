# Phase 0B semantic evidence — LabsService

**Archive member:** `src/modules/labs/labs.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 1–268, 269–565, and 566–584 from the baseline archive extraction.

Lines 2–26 define LabsService dependencies on lab service/booking/sample repositories, provider profiles, events, event bus, workflow engine, and PDF service. Lines 28–45 implement public catalog filtering for approved active non-imaging services, package filtering, search regex escaping, sort modes, and a 120-item cap. Lines 47–61 implement approved category counts and approved service detail.

Lines 63–85 implement compatible-provider lookup. Service IDs are deduplicated and must all resolve to approved active services; provider profiles are restricted to active public-eligible approved lab/hospital providers with account IDs, category coverage, and a 50-item cap. Rating is null when no rating count exists.

Lines 87–180 implement booking. Items/schedule are required; services are loaded from IDs and server-side item snapshots use service names/prices rather than incoming names/prices. Location aliases normalize to home/facility. Payment policy is home card/insurance only and facility cash/card/insurance. Patient bookings require provider_account_id unless admin/system. Home insurance requires doctor request/preauth proof, and home services must support home visits. Slot expiry and provider overlap capacity are checked; recent same-patient same-service-set bookings within three minutes return the original booking as duplicate suppression. Total sums server-loaded item prices plus a SAR 25 home fee. Insurance starts pending; booking/events/engine notifications are emitted.

Lines 182–190 implement patient/admin document append with ownership check and event emission. Lines 192–222 implement lab/hospital/admin insurance update, including status/copay/item coverage/reject/cash-price updates and insurance events. Lines 224–236 implement patient-owned item cash opt-in.

Lines 238–266 implement patient mine/detail/cancel. Detail and cancel return 404 for foreign/missing records. Cancel is idempotent for already terminal state and otherwise uses WorkflowEngine to transition and emit events.

Lines 268–286 implement provider/admin state transition through `LAB_BOOKING_TRANSITIONS`. Lines 288–307 implement provider/admin inbox and technician assignment, restricting non-admin users to matching provider account. Lines 310–358 implement report upload: provider/admin role, booking ownership, file/structured-data requirement, reportable state gate, optional generated PDF, report persistence, and workflow transition to REPORTED.

Lines 360–375 implement admin list with status/insurance/location/delay filters and a 500-item maximum; delayed means older than 24 hours unless terminal. Lines 377–405 implement provider/admin sample registration with barcode uniqueness, booking ownership, sample creation, and transition to SAMPLE_COLLECTED. Lines 408–440 implement sample stage transitions received→analyzing→result_ready→sent and synchronize booking PROCESSING/RESULT_UPLOADED states; sent requires booking REPORTED.

Lines 443–470 implement sample listing with admin-all or provider-booking scoping and helper ownership checks for assigned provider/admin. Lines 472–501 implement admin catalog CRUD and force-state; unlike controller baseline comments that fail closed, these service methods contain active create/update/delete/force behavior and role checks. Lines 504–514 implement reschedule by directly setting `new_date` with no future/slot alignment/overlap validation and appending a same-state history entry. Lines 516–528 implement GPS update using `body.lat || 0`, `lng || 0`, `eta || 0`, and `distance || 0`, which can turn missing/zero values into synthetic-looking defaults. Lines 530–549 implement tracking, returning ETA/distance defaults to zero, technician ID or `Unknown`, and all history entries as done/check icons. Lines 551–564 implement emergency cancellation with raw reason. Lines 566–583 implement provider reassignment back to CONFIRMED and clear technician assignment.

**Auth/ownership:** role checks use effective roles; patient detail/cancel/document/cash/tracking are owner-scoped; provider operations require assigned provider where helpers apply; admin has broad access. Foreign patient lab records generally return 404, while provider mismatches return 403.

**State transitions:** NEW_REQUEST → provider/sample/report lifecycle through transition tables; cancel; sample stages; report upload; emergency cancel; reschedule same-state mutation; reassign to confirmed.

**Price/payment/insurance source:** service catalog price is authoritative for item snapshot and total; home fee is hard-coded SAR 25; payment policy by location; insurance pending/approval/cash prices are persisted; no payment gateway flow is visible in this service.

**Security/truthfulness observations:** no visible idempotency decorator/service key for booking/cancel/reschedule/report/sample mutations; three-minute duplicate suppression is heuristic rather than Idempotency-Key; reschedule lacks slot validation; GPS/tracking use zero/Unknown fallbacks; report stores base64 in booking; admin service methods are active despite controller fail-closed messages; delayed SLA uses hard-coded 24 hours.

**Test implications:** server-price authority; provider requirement; home insurance proof; slot expiry/capacity and duplicate replay; owner/stranger 404; provider role/account; state transitions; report privacy/size/type; sample barcode/stages; reschedule invalid-slot behavior; GPS validation and honest null handling; emergency/reassign; admin catalog gate consistency; and mutation idempotency. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
