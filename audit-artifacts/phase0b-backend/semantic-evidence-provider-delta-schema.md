# Phase 0B semantic evidence — provider-delta.schema.ts

**Archive member:** `src/modules/providers/schemas/provider-delta.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–34; full 34-line member covered.

Lines 4–8 define `DeltaStatus` as `PENDING`, `APPROVED`, and `REJECTED`. Lines 10–11 define a timestamped Mongoose `ProviderDelta` document.

Lines 12–13 require `providerId` as a User ObjectId reference. Lines 15–19 require untyped object fields `oldData` and `newData`, each stored as `Object` and typed only as `Record<string, any>`. Lines 21–22 store status with the enum and default `PENDING`. Lines 24–28 optionally store `reviewedBy` User reference and `reviewedAt`. Lines 30–31 optionally store an unbounded string `rejectionReason`. Line 34 creates the schema from the class.

**State/approval contract:** The schema models a review workflow but does not encode allowed transitions, immutable snapshot behavior, reviewer separation of duties, or approval atomicity. A schema-level enum prevents unknown status values but not direct transitions from approved/rejected back to pending or repeated review. `reviewedBy` is only a reference and does not prove an admin role or independence from `providerId`.

**Security/integrity:** `oldData` and `newData` are unrestricted objects. No allowlisted field set, nested validation, size cap, sanitization, immutable old snapshot, version/base-revision field, or redaction policy is visible. This creates mass-assignment, sensitive-field mutation and oversized-payload risks unless service/controller layers strictly validate and diff these objects. `providerId` references User rather than an explicit provider profile/account model, requiring downstream type/role checks.

**Auditability:** timestamps and reviewer fields provide a minimal trail, but no rejection/approval event ID, request origin, reason requirement for rejection, or tamper-evident audit linkage is present. No unique/index declaration is visible for pending deltas per provider or query performance.

**Test implications:** enforce owner/provider-role binding, allowlisted mutable fields, immutable oldData, base-version conflict detection, reviewer authorization/separation, one-way state transitions, required rejection reason, atomic apply+status update, duplicate/replay behavior, payload limits/redaction, and index/query tests. No tests executed during this semantic read.
