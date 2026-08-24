# Phase 0B semantic evidence — lab-results.service.spec.ts

**Archive member:** `src/modules/labs/lab-results.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–66; full 66-line member covered.

Lines 5–12 define mocked result/booking/event/workflow dependencies. Lines 14–24 test rejection of a foreign provider and rejection of result creation before the booking reaches `RESULT_UPLOADED`. Lines 26–33 test result creation and booking release through WorkflowEngine only, with transition `RESULT_UPLOADED -> REPORTED` and booking save. Lines 35–52 test resolving an embedded booking report for its owning patient through a projection-limited Mongo collection query. Lines 54–65 test a foreign patient receives `NotFoundException` and the query is scoped to that patient ID.

**Security/ownership:** positive service-level evidence exists for provider ownership on creation and patient ownership/404 concealment for embedded reports. No HTTP guard, authenticated identity provenance, tenant boundary, report URL authorization, signed URL expiry, or anti-enumeration behavior beyond the tested query is established.

**State transitions:** processing blocks result creation; result upload permits create and workflow transition to reported.

**Truthfulness/payment source:** no price, payment, insurance, report-content validation, or external storage verification is tested. Test URL is `https://example.invalid/report.pdf`, which is explicitly a fixture and not evidence of a live report source.

**Test gaps:** no idempotency/replay, duplicate result, concurrent release, malformed entries, PDF/content security, event delivery/retry, audit logging, patient unauthenticated 401, or controller integration coverage. No tests executed during this semantic read.
