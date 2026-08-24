# Phase 0B semantic evidence — admin-web-core provider-delta.schema.ts

**Archive member:** `src/modules/admin-web-core/schemas/provider-delta.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–24; full 24-line member covered.

Lines 2–4 define ProviderDeltaDocument. Lines 6–7 define a timestamped ProviderDelta schema. Lines 8–9 require indexed provider_id as a User ObjectId. Lines 11–12 require provider_type enum DOCTOR/PHARMACY/LAB/RADIOLOGY. Lines 14–18 require arbitrary old_profile_snapshot and proposed_new_metadata objects. Lines 20–21 define PENDING/APPROVED/REJECTED status with PENDING default and index. Line 24 creates the schema.

**Audit judgment:** Provider reference/type enums, before/after snapshots and explicit review lifecycle are useful moderation primitives. However there is no requester/actor/admin decision actor, reason, request correlation/idempotency key, version or optimistic concurrency guard, effective/review timestamps, rejection note, approval provenance, unique pending delta constraint or immutable change history. Arbitrary snapshots may contain secrets/PII and can grow without bounds. Schema state alone cannot ensure approved metadata is applied atomically to the canonical provider profile.

**Duplicate-model context:** The previously existing evidence file `audit-artifacts/phase0b-backend/semantic-evidence-provider-delta-schema.md` covers a different member, `src/modules/providers/schemas/provider-delta.schema.ts`, with providerId/oldData/newData/reviewedBy/reviewedAt/rejectionReason. This admin-web-core model uses provider_id/provider_type/old_profile_snapshot/proposed_new_metadata and has no reviewer fields. The two similarly named models therefore represent incompatible ProviderDelta contracts and must not share an assumed lifecycle or authoritative collection.

No product code was changed and no tests were executed during this semantic read.
