# Phase 0B semantic evidence — Call metric repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/livekit/repositories/callmetric.repository.ts:1–13`

`CallMetricRepository` is an injectable typed wrapper around `MongoRepository<CallMetricDocument>`, binding `CallMetric.name` to `Model<CallMetricDocument>` (`livekit/repositories/callmetric.repository.ts:2–11`). The member contains no session/booking/participant/tenant scope, trusted telemetry-source policy, validation of duration/quality/latency/packet loss/timestamps, anti-forgery or replay protection, aggregation consistency, minimum-necessary projection, redaction, retention/deletion/anonymization, audit/provenance or billing/quality-reporting boundary. Generic inherited operations therefore leave metric integrity, privacy and linkage correctness entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
