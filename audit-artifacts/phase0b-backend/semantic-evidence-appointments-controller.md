# Phase 0B semantic evidence — AppointmentsController

**Archive member:** `src/modules/care/appointments.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–80 from the baseline archive extraction.

Lines 1–11 define a JWT-guarded `care/appointments` controller with `AppointmentsService`, current-user/role guards, appointment state enum, and three DTO classes. Lines 13–27 expose authenticated patient create, own-list filtered by status, and detail by ID, delegating ownership to the service.

Lines 29–32 expose waitlist join with a raw `{doctorId,date}` body. Lines 34–42 expose PATCH cancel and PATCH reschedule using typed DTOs; neither route visibly carries `RequireIdempotency` in this controller.

Lines 44–67 expose doctor/admin confirm, doctor/admin/patient check-in, doctor/admin start, and doctor/admin complete. Lines 69–73 expose POST finish for doctor/home-care roles with an untyped body. Lines 75–77 expose authenticated summary read.

**Routes/events:** POST create, GET mine/detail/summary, POST waitlist join/finish, PATCH cancel/reschedule/confirm/check-in/start/complete.

**Auth/ownership:** controller-level JWT guard; role decorators gate provider/state operations; patient ownership and stranger behavior are service-dependent for detail/mutations.

**State transitions:** appointment create → confirm → check-in → start → complete/finish; cancel/reschedule and waitlist side paths. Exact transition rules delegated.

**Price/payment/insurance source:** none visible in this controller; payment/hold/call-token behavior is delegated to service or other modules.

**Security/contract observations:** cancellation and rescheduling are mutating routes without visible idempotency decorator; waitlist and finish accept raw bodies; role gates differ between `complete` and `finish`; no call-token route is exposed here.

**Test implications:** unauth 401; owner/stranger 404 for detail/summary/cancel/reschedule; role matrix; replay/idempotency; typed DTO validation; waitlist duplication; valid state transitions; check-in actor policy; finish-vs-complete separation; and service-level payment/slot locking. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
