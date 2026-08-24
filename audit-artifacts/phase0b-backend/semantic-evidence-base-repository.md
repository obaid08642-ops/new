# Phase 0B semantic evidence — BaseRepository

**Archive member:** `src/common/database/base.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–23 from the baseline archive extraction.

Lines 1–2 import Mongoose filter/update/query/projection/pipeline types. Lines 3–22 define the generic BaseRepository interface for create, findById/findOne/find, updateOne/updateById/updateMany/findOneAndUpdate, hard delete methods, insertMany, softDelete, counts, exists, aggregate, and optional raw database access.

**Auth/ownership:** none enforced by the interface; callers supply arbitrary filters/IDs and must establish ownership/role scope.

**State transitions:** repository contract exposes unrestricted update/delete/softDelete primitives; domain transition validation is external.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** `any` return types weaken compile-time guarantees; `findById`, update, delete, aggregate, and raw `db` access have no mandatory tenant/owner filter; hard-delete and aggregate operations can bypass the AuditPlugin soft-delete hooks; no transaction/session parameter is part of the common contract; no idempotency or optimistic concurrency primitive is exposed.

**Test implications:** repository implementations, filter scoping, soft-delete behavior, hard-delete/aggregate bypass, return typing, transactions, and caller ownership enforcement. No tests executed during this semantic read.

**Consumer traceability:** repository implementation and call-site mapping will feed the dedicated route-to-consumer phase.
