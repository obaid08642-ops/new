# Phase 0B semantic evidence — audit-log.interceptor.spec.ts

**Archive member:** `src/common/audit-log.interceptor.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–120 and 121–155; full 155-line member covered.

Lines 16–47 build a testing module with mocked Reflector, AuditService, Mongo connection/model, and manually replace the injected connection token. Lines 49–67 verify non-audited handlers pass through and do not write an audit record. Lines 69–125 verify a metadata-described `JobPosting` update queries before/after state and writes an audit payload containing action, user id, role, IP, resource kind/id, and a title diff. Lines 127–154 verify a thrown DB query is fail-safe and the request still completes with the handler result.

**Security/truthfulness:** tests establish fail-open request completion when audit DB reads fail; they do not establish alerting, durable retry, tamper resistance, audit immutability, tenant isolation, actor ownership, sensitive-field redaction, authorization enforcement, or behavior when audit write itself fails. The request fixture accepts `user.id`, `role`, and `ip` as supplied mock values; no proxy/IP trust validation is tested.

**State transitions:** non-audited request → passthrough; audited update → before/after diff → AuditService write; DB read failure → request continues without audit evidence.

**Price/payment/insurance source:** none visible.

**Test implications:** integration tests remain needed for write failure, sensitive-field redaction, actor/tenant binding, malformed/missing identifiers, concurrent updates, audit persistence/retry/alerting, and authorization interaction. No tests executed during this semantic read.
