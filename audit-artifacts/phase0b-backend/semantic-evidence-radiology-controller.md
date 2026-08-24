# Phase 0B semantic evidence — RadiologyController

**Archive member:** `src/modules/radiology/radiology.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–183 from the baseline archive extraction.

Lines 1–7 define an unguarded controller with `Public` and `CurrentUser` imports. Lines 9–35 expose public service catalog, modalities, and service detail. Catalog filters include modality, body part, search, home-only/home-visit, highest-rated, nearest, and lowest-price; boolean query parsing is explicit. Detail delegates directly to `getById`.

Lines 37–70 expose booking create, patient booking list/detail, cancel, state transition, report publication, patient reports, documents, and insurance status. No controller-level JWT guard is applied, so protected behavior depends on downstream guards/service checks; several mutations accept `any` bodies. Lines 72–85 expose provider inbox, technician assignment, and report upload without visible role decorators in this controller.

Lines 87–119 expose check-in, start-scan, abort, report review submission/approval, and insurance approval. These are authenticated by `CurrentUser` only at the method signature level; no `RequireIdempotency` decorator is visible on these mutations. Insurance approval accepts a typed approval code/copay body but service enforcement is delegated.

Lines 121–143 expose PATCH reschedule with `{new_date, reason}`, tracking, catalog delta request, and patient preparation confirmation. Lines 145–155 expose admin listing behind an explicit JWT guard, with status/insurance/location/delayed/disputed filters and optional parsed limit. Lines 158–175 expose admin catalog CRUD that fails closed with `ServiceUnavailableException` pending versioned approval. Lines 177–182 expose admin force-state behind JWT guard but no explicit admin-role decorator visible in this controller.

**Routes/events:** public services/modalities/detail; booking create/mine/detail/cancel/state/report/documents/insurance/checkin/scan/abort/reschedule/tracking/preparation; provider inbox/assignment/uploads; report QC; insurance approval; catalog delta; admin list/catalog/force-state.

**Auth/ownership:** no controller-level guard; `CurrentUser` is passed to most service methods. Public catalog/detail are intentionally public. Patient/provider/admin ownership and role enforcement must be proven in service/guards; this controller alone does not establish 401/404 behavior.

**State transitions:** booking creation → check-in → scan → report upload/review/approval; cancel/reschedule/insurance/preparation side transitions; assignment/provider inbox and tracking; emergency scan abort.

**Price/payment/insurance source:** catalog and booking bodies are delegated to service; insurance approval carries approval code/copay; no server-side price or payment verification is visible here.

**Security/truthfulness observations:** many mutation routes lack visible idempotency; most bodies are untyped; admin catalog mutations fail closed; admin force-state has guard but no visible role decorator; public detail requires service-level protection against enumeration if intended. These are observations only.

**Test implications:** live method/path probes; unauth 401 for booking/provider/admin mutations; owner/stranger 404 for booking/report/document/tracking; role matrix; replay/idempotency; scan state machine; report privacy and review workflow; insurance approval limits; reschedule slot validation; catalog admin blocked behavior; and service-detail 200/404 behavior. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
