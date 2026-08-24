# Phase 0B semantic evidence — LabsController

**Archive member:** `src/modules/labs/labs.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–178 from the baseline archive extraction.

Lines 1–7 define the labs controller and service. Lines 9–36 expose public services, packages, categories, and service detail. Filtering supports category/search/home-only/home-visit/highest-rated/nearest/lowest-price; package detail delegates to the same `getById` service.

Lines 38–68 expose booking create, patient mine/detail, cancel, state transition, documents, insurance update, and item cash opt-in. Most bodies are `any`; no `RequireIdempotency` decorator is visible on these mutations. Lines 70–83 expose provider inbox, technician assignment, and report upload; role checks are delegated to service.

Lines 85–109 expose reschedule, GPS update, tracking, emergency declaration, and reassign. These are authenticated by `CurrentUser` only in the method signature; no visible controller-level guard or idempotency decorator is present.

Lines 111–140 expose guarded admin listing and sample registration/stage/list. Lines 142–165 expose admin catalog CRUD that fails closed with `ServiceUnavailableException` and admin force-state behind JWT only. Lines 168–176 expose public package detail and compatible-provider lookup; `testIds` is split on commas without visible identifier validation.

**Routes/events:** public catalog/packages/categories/detail/compatible providers; patient booking lifecycle, documents, insurance/cash/reschedule/GPS/tracking/emergency/reassign; provider inbox/assignment/report; admin list/sample/force-state/catalog gates.

**Auth/ownership:** no controller-level guard; method signatures pass `CurrentUser` to service. Explicit JWT guards appear only on admin/sample routes. Patient/provider/admin authorization and stranger behavior depend on service.

**State transitions:** booking create → provider/technician workflow → report; cancel/reschedule/emergency/reassign; sample registration/stage; admin force-state. Exact state matrix delegated.

**Price/payment/insurance source:** catalog/package values and booking/payment semantics delegated to service; insurance update and cash opt-in are distinct mutations; no server-side total verification visible in this member.

**Security/truthfulness observations:** untyped mutation bodies, no visible idempotency on booking/cancel/reschedule/emergency/cash/insurance routes, public detail/compatible-provider enumeration depends on service, and admin force-state has JWT but no visible role decorator. Catalog mutations fail closed.

**Test implications:** method/path probes; unauth 401; owner/stranger 404; role matrix; replay/idempotency; catalog/service/package 200/404; slot validation; GPS/emergency privacy; report/document access; insurance/cash authorization; sample/admin role enforcement; and testIds validation. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
