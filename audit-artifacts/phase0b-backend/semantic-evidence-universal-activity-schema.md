# Phase 0B semantic evidence — UniversalActivity schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/universal-activity.schema.ts:1–29`

The timestamped `universal_activities` schema defines a unique generated ID, required indexed free-form eventType, optional indexed userId/providerId, Mixed metadata defaulting to an empty object, and indexed timestamp defaulting to a new Date (`7–25`). A compound `{ eventType: 1, timestamp: -1 }` index is explicit (`28–29`).

`eventType` has no runtime allowlist, version, producer/source or schema payload contract (`12–13`). Optional user/provider IDs do not establish actor, subject, organization, tenant or cross-document ownership; neither does the schema distinguish system actor from affected user (`15–19`). Mixed metadata permits arbitrary fields, including secrets/PII/PHI, with no size, depth, type, redaction, sanitization or field-level projection controls (`21–22`). timestamp does not establish server event ordering, source clock, sequence, correlation or ingestion time (`24–25`). No idempotency/event key, uniqueness beyond document ID, append-only/update/delete guard, immutable provenance, audit reason, retention/TTL, legal hold, deletion/anonymization or access authorization is represented. No code was changed and no build/test/application operation was performed during this read.
