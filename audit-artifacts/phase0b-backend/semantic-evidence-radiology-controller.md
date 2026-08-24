# Phase 0B semantic evidence — radiology.controller.ts

**Archive member:** `src/modules/radiology/controllers/radiology.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–100 and 101–142; full 142-line member covered.

## Existing evidence retained and reconciled

The earlier evidence recorded that this controller exposes public service catalog/modalities/detail in an earlier controller shape, and that booking, patient booking list/detail, cancel, state transition, report publication, patient reports, documents, insurance status, provider inbox, technician assignment, report upload, check-in, scan, abort, review submission/approval, insurance approval, PATCH reschedule, tracking, catalog delta, preparation confirmation, admin list, catalog CRUD, and admin force-state were expected surfaces. It also correctly identified the absence of a controller-level JWT guard in the examined shape, reliance on downstream service/guard checks, many untyped `any` bodies, missing visible idempotency decorators, and the need for live method/path probes, owner/stranger/unauth tests, role matrices and service-detail 200/404 checks. The current baseline member was reread in full below to reconcile those observations with the actual 142-line source.

## Current baseline member

Lines 8–14 define `RadiologyController` at `radiology/bookings`, injecting `RadiologyCenterBooking`, `RadiologyService`, and `User` models. `CurrentUser` is imported and used only on patient booking/list/detail routes.

`POST /radiology/bookings` (21–59) requires `scheduled_at`, resolves the current patient by app-level `user.id`, optionally resolves a service by legacy `id`, accepts explicit scan fields, optionally resolves a provider account, then creates a center booking with UUID, patient Mongo ID, delivery mode, doctor ID, scan identity and `PENDING_ACCEPTANCE`. It returns only ID/status/message. No DTO validation, price/payment/insurance fields, idempotency, schedule conflict, provider eligibility, or service lookup by `_id`/short_code is visible.

`GET /radiology/bookings/mine` (62–67) resolves the patient and returns up to 80 bookings scoped by patient Mongo ID. `GET /radiology/bookings/:id` (70–79) accepts either Mongo `_id` or public `id`, loads the booking, resolves current user and permits patient owner, bound center, or admin; otherwise it returns `NotFoundException`, providing positive owner concealment at controller level.

`POST /allocate-machine/:id` (82–110) accepts `machineId`, checks any accepted/checked-in conflict by machine ID, then updates the booking by `_id` to set machine and `ACCEPTED`. It has no `CurrentUser`, role guard, booking ownership, time-window overlap, idempotency, or not-found check before returning success with possibly null data. Conflict comparison uses `conflict._id.toString()` against the route string, which may not match public UUID usage.

`POST /finalize-scan/:id` (112–141) accepts arbitrary report text, file URL array and PDF URL, updates by `_id` to `REPORT_UPLOADED`, and returns success/parent appointment. It has no `CurrentUser`, provider authorization, private storage validation, DTO validation, state guard, idempotency, audit event or visible doctor callback despite the response message/comments claiming automatic notification.

## Routes/events

Current baseline routes are: booking create, patient mine, patient single detail, machine allocation, and scan finalization. The retained earlier evidence identifies adjacent/alternate controller surfaces and expected route families that require route inventory reconciliation; no route should be claimed present in this 142-line member unless verified against the exact extracted source.

## Auth/ownership

`GET /mine` and `GET /:id` use `CurrentUser`; the latter performs owner/bound-center/admin checks and returns 404 to unauthorized viewers. The create route uses `CurrentUser` to resolve the patient. Allocation and finalization have no visible `CurrentUser` parameter or controller-level guard. No class-level JWT guard is visible. Protected behavior for current routes therefore remains incomplete unless supplied by global guards/interceptors or downstream service logic.

## State transitions

Create sets `PENDING_ACCEPTANCE`; allocation sets `ACCEPTED` without a visible prior-state guard; finalization sets `REPORT_UPLOADED` without a visible prior-state guard. The patient detail/list paths are reads. There is no controller-level transition validation, transaction, compare-and-set, or idempotency decorator in this member.

## Price/payment/insurance source

No price, payment, insurance eligibility, approval, copay, currency, or ledger field is written by the current controller. The create body is not used as a server-authoritative price source, but no payment contract is established here.

## Confirmed security/truthfulness findings

Provider operations lack visible authentication/role/ownership at controller level; finalize accepts raw S3/PDF URL fields despite the separate secure-storage service path; allocation/finalize use `_id` while booking creation and patient detail support public UUID; service lookup trusts legacy `id`; financial fields are not established; success messages claim callback behavior not invoked in this controller. The earlier evidence's concerns about untyped bodies, missing idempotency, and the need for live method/path and owner/stranger/unauth tests remain applicable.

## Test implications

Require exact method/route tests, unauth 401, owner/stranger 404, provider-role checks, public UUID versus `_id` consistency, schedule/machine conflict locking, strict DTOs, idempotency/replay, private storage enforcement, state transitions, callback/event delivery, and no-success-on-null update. Also reconcile any alternate route surface against the exact baseline member before route-to-consumer mapping. No tests executed during this semantic read.

**Consumer traceability:** deferred to the dedicated route-to-consumer phase.
