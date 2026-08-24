# Phase 0B semantic evidence — AuditLogInterceptor

**Archive member:** `src/common/audit-log.interceptor.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–133 from the baseline archive extraction.

Lines 1–28 define `Audited` metadata with model, optional route ID parameter, action, Mongo connection, and AuditService dependencies. Lines 30–45 resolve handler metadata; unannotated routes pass through, while annotated routes extract route ID.

Lines 46–57 fetch a before document by generic `id` and silently continue if the model is missing/unregistered. Lines 58–95 attach an asynchronous `tap` callback. It reads actor role/ID, IP or forwarded-for fallback, user-agent, and `request.correlation_id`; fetches the after document by route ID or returned data ID; computes a before/after diff; and writes action/resource/details/severity/correlation metadata to AuditService. Request body is included directly in audit details.

Lines 97–132 calculate creation, deletion, or field diffs using JSON serialization and exclude Mongo/version/timestamp fields. Lines 90–92 swallow audit failures so audited requests are not blocked.

**Auth/ownership:** actor data is read from request.user but no actor authorization is established here; generic model `id` lookup and route metadata determine resource capture.

**State transitions:** no domain state; before/after audit record around annotated handler execution.

**Price/payment/insurance source:** none explicitly, but request body and changed document fields can contain financial/medical data.

**Security/truthfulness observations:** audit is opt-in by decorator; asynchronous `tap` means audit write is not awaited by request completion; request body and user-agent/IP can contain secrets/PII with no visible redaction; forwarded-for is trusted; model lookup uses generic `id` and may miss ObjectId resources; failed model lookup/audit writes are silent; JSON diff can retain sensitive fields and mishandle non-JSON values; correlation property uses `request.correlation_id`, while middleware evidence uses `req.correlationId`.

**Test implications:** decorator coverage, actor/resource scope, before/after race, audit write failure, sensitive-field redaction, forwarded-for trust, correlation property consistency, ObjectId resources, async completion, and diff correctness. No tests executed during this semantic read.

**Consumer traceability:** `Audited` decorator/interceptor registration and route usage will feed the dedicated route-to-consumer phase.
