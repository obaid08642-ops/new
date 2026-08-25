# Phase 0B semantic evidence — SlotLock schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/slot-lock.schema.ts:1–20`

The schema defines timestamped `SlotLock` records with generated unique ID, indexed provider and patient IDs, required free-form booking kind, required slot start/end, a TypeScript-only status union defaulting to `held`, required `expires_at` with a TTL index, and optional booking ID (`7–20`). A provider/start/status compound index supports a basic conflict lookup, and the TTL index is an explicit expiry mechanism (`16,20`).

The persisted status is not given a Mongoose enum, so the union is not a runtime database constraint (`15`). No validation establishes slot_start < slot_end, timezone/normalization, allowed duration, provider availability, or that expires_at is within the intended hold window (`12–16`). No cross-document provider/patient/booking ownership, tenant, or booking-kind contract is represented (`10–17`). The compound index is not unique or partial, so it does not alone prevent overlapping locks or duplicate active locks; interval overlap and atomic acquisition semantics are absent from this schema (`20`). No status transition actor/time/reason/version, idempotency key, confirmation/release CAS, expiry race policy, or audit history is represented (`15–17`). TTL deletion is eventual and no post-expiry access/cleanup policy is represented (`16`). No code was changed and no build/test/application operation was performed during this read.
