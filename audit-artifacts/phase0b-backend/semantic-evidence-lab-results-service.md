# Phase 0B semantic evidence — LabResultsService

**Archive member:** `src/modules/labs/lab-results.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–143 from the baseline archive extraction.

Lines 1–23 define dependencies on result/booking repositories, Mongo connection, events, workflow engine, and effective-role calculation. Lines 25–32 implement result flagging: numeric values beyond 1.5× high reference or below 0.5× low reference are critical; values beyond reference are high/low; invalid numeric values are normal.

Lines 34–74 implement result creation. Booking ID and result type are required; booking must exist; only admin/lab/hospital effective roles may create; non-admin users must own the booking provider account; booking must be in RESULT_UPLOADED. Entries are parsed and auto-flagged unless caller supplies a flag. WorkflowEngine applies RESULT_UPLOADED → REPORTED while creating a result with patient/service metadata, attachments/findings/impression/recommendations/notes, reporter identity, and critical flag. The booking receives an embedded report reference and state history; result-ready and booking-state events are emitted.

Lines 76–103 implement `mineFor`. Standalone result records exclude source `radiology`; embedded reports from `labbookings.reports` are aggregated and projected, then both collections are merged and sorted by created/uploaded time. The union intentionally supports legacy/generated report storage but requires consistency between embedded report IDs and detail resolution.

Lines 105–108 implement booking-scoped results using both booking ID and patient ID, returning an empty list for foreign/missing booking rather than exposing records. Lines 110–141 implement detail. Standalone results enforce patient ownership and return 404 for foreign records; patient reads mark results viewed with timestamp. If no standalone result exists, legacy embedded report detail resolves by report ID plus patient ownership predicate (admin bypass), returning a normalized projection.

**Auth/ownership:** controller JWT guard; creation restricted to provider roles and assigned provider ownership; reads patient-scoped, admin-readable for detail; booking-scoped query uses patient predicate.

**State transitions:** RESULT_UPLOADED → REPORTED through WorkflowEngine; embedded report reference and booking history update together only through service callback.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** result creation accepts raw body and attachments; no visible idempotency key; auto-flagging can be overridden by caller-supplied `flag`; result union has two storage paths; report detail correctly resolves legacy IDs with ownership predicate; invalid numeric values classify as normal.

**Test implications:** role/assigned-provider ownership, state gate, entry flag thresholds and override policy, replay/idempotency, transaction consistency between result and booking, standalone/embedded union dedupe, owner/stranger 404, viewed marker, admin access, and attachment privacy/limits. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
