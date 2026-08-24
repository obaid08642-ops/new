# Phase 0B semantic evidence — MongoRepository

**Archive member:** `src/common/database/mongo.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–88 from the baseline archive extraction.

Lines 1–5 define the abstract implementation of BaseRepository over a Mongoose model. Lines 7–10 create documents and save them. Lines 12–18 implement findById/findOne. Lines 20–22 expose `distinct`, which is not part of BaseRepository. Lines 24–26 implement find.

Lines 28–34 implement `updateOne` using `findOneAndUpdate` with `new:true`, and `updateById` using `findByIdAndUpdate`; no transition, owner, or session enforcement is added. Lines 36–42 implement updateMany and findOneAndUpdate. Lines 44–58 expose findOneAndDelete, deleteOne, deleteById, and deleteMany as hard-delete operations.

Lines 60–62 implement insertMany. Lines 64–66 implement softDelete using `{ deletedAt: new Date() }`, with camel-case `deletedAt`; the AuditPlugin field is `deleted_at`, so the two conventions do not visibly align. Lines 68–78 implement count/countDocuments/exists. Lines 80–87 expose aggregate and the underlying model database connection through `db`.

**Auth/ownership:** none enforced; arbitrary caller-supplied filters/IDs pass directly to Mongoose.

**State transitions:** generic update/delete/soft-delete operations; no domain-state validation, optimistic concurrency, transaction/session, or idempotency.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** hard deletes and aggregate can bypass AuditPlugin filtering; `softDelete` writes `deletedAt` while plugin uses `deleted_at`, making soft-delete behavior inconsistent; `updateOne` naming hides `findOneAndUpdate` semantics; options are spread after `new:true` and can override it; raw `db` escape hatch bypasses repository controls; return types are `any`; no validation or owner/tenant requirement exists.

**Test implications:** BaseRepository contract parity, soft-delete field naming, query plugin interaction, hard-delete/aggregate bypass, option override, transaction/session support, owner filters, and raw-db usage. No tests executed during this semantic read.

**Consumer traceability:** repository implementation call-site mapping will feed the dedicated route-to-consumer phase.
