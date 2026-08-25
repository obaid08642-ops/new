# Phase 0B semantic evidence — CallMetric schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/callmetric.schema.ts:1–18`

`CallMetric` is a timestamped Mongoose schema with generated unique indexed ID, required indexed `session_id` and `participant_id`, optional bitrate, packet loss, jitter, RTT, a comment-described 1–5 quality score, and an unconstrained `raw` object defaulting to `{}` (`5–15`). The schema exports a document type omitting the generated ID from the Mongoose document intersection and creates the model (`17–18`).

Indexed session/participant identifiers support basic metric lookup. The metrics have no numeric minimum/maximum, unit/source/time-sampling validation, device/network attribution, aggregation window or calculation provenance (`8–14`). `quality_score` is only commented as 1–5 and is not visibly constrained at runtime (`14`). `raw?: any` permits arbitrary nested content, potentially including credentials, audio metadata, IPs, user identifiers or medical/session data without schema, size, redaction, retention or projection controls (`15`).

No ownership/tenant/facility relationship, participant authorization, consent, call-session linkage integrity, event correlation, idempotency, duplicate sample key, timestamp/freshness field, deletion/TTL policy or role-based metric projection is visible (`8–15`). No operational index for session/time or participant/time range is shown beyond individual identifiers, and no privacy-safe observability policy is represented. No code was changed and no build/test/application operation was performed during this read.
