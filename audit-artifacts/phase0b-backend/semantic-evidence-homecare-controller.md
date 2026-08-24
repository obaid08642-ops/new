# Phase 0B semantic evidence — Home-care/Nursing controllers

**Archive members:** `src/modules/home-care/home-care.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 1–317 and 318–418 from the baseline archive extraction.

Lines 1–21 define the guarded `NursingController` and inject booking/service/provider models, Mongo connection, events, and workflow engine. Lines 23–51 define admin/provider-role checks, visit lookup by public `id`, read access for admin/patient/assigned provider, and provider mutation access with optional unassigned allowance.

Lines 53–92 implement nursing notes create/list. Creation validates patient/booking IDs and their match, requires provider mutation access, truncates note/vital strings, and inserts into the raw `nursing_notes` collection. Listing permits patient/admin or a nursing provider assigned to at least one booking for that patient. Lines 94–114 expose public approved catalog reads and admin catalog CRUD routes that fail closed with `ServiceUnavailableException` pending approval workflow.

Lines 116–129 expose provider/admin visit list and owner/provider detail. Lines 131–173 expose visit tracking with read access, GPS coordinates, and an honest ETA only when both nurse and destination coordinates exist; ETA uses a straight-line 30 km/h estimate and otherwise returns null. Clinical report fields appear only when present.

Lines 175–199 implement provider respond accept/reject. It validates boolean accept, requires provider assignment access, restricts the source state to `NEW_REQUEST`, records rejection or uses WorkflowEngine for acceptance and state history. Lines 202–218 implement transit start from `CONFIRMED`, writes timers and emits patient notification. Lines 220–253 implement arrival with finite coordinate/range validation and a rough degree-distance geofence threshold, then records GPS/timers and notification.

Lines 255–269 implement start-care from `ARRIVED`. Lines 271–289 implement no-show only after arrival and a 10-minute elapsed timer. Lines 291–306 implement emergency abort from transit/arrived/care-in-progress, records reason/refund status pending finance review, and notifies patient. Lines 308–333 implement completion from care-in-progress, persist vitals/clinical notes/recommendations/signature, append state history, and notify patient/referring doctor.

Lines 335–390 implement provider wallet data. Staff may inspect a provider ledger; non-staff must be nursing provider and see only own wallet. It calculates balance and pending escrow from real bookings and service fee fallbacks, creates earning/transport transactions for completed bookings, and does not synthesize amounts when values are invalid. This is a derived ledger, not a separate accounting transaction source.

Lines 393–418 define guarded `HomeCareContractController` under `home-care`. `GET /home-care/bookings/:bookingId` queries `{id, patient_id:user.id}` and returns 404 for non-owner/missing records. It exposes bounded status/service/schedule/nurse display/timeline fields; avatar is always null. This member contradicts any assumption that `/home-care/bookings/my` is the canonical list route; list routing is elsewhere and must be reconciled against live backend.

**Auth/ownership:** controller-level JWT guard; patient/assigned-provider/admin read checks; provider mutation checks; home-care contract detail explicitly owner-scoped 404.

**State transitions:** new request → provider response/confirmed → transit → arrived → care in progress → completed; no-show and emergency branches; notifications/events and timer writes at key transitions.

**Price/payment/insurance source:** catalog returns persisted approved services; provider wallet derives amounts from booking fee fallbacks; emergency refund is pending finance review. No patient booking mutation/payment route is visible in this member.

**Security/truthfulness observations:** raw `any` bodies; rough geofence math; no visible idempotency decorators on nursing mutations; wallet amounts use fallback fields and derived ledger; avatar null is an explicit bounded absence; admin catalog mutations fail closed. These are audit observations only.

**Test implications:** unauth 401; patient/assigned provider/admin access matrix; owner/stranger 404 for details and notes; provider role/assignment checks; transition matrix and replay/idempotency; GPS bounds/geofence; no-show timer; emergency refund state; signature/report privacy; wallet ownership and amount-source tests; catalog publication blocked behavior; and exact route method checks. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
