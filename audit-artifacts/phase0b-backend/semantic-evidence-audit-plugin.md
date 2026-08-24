# Phase 0B semantic evidence — AuditPlugin

**Archive member:** `src/common/database/audit.plugin.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–26 from the baseline archive extraction.

Lines 1–9 add soft-delete and actor fields (`is_deleted`, `deleted_at`, `created_by`, `updated_by`) to any schema receiving the plugin. Lines 11–21 register pre-query hooks for find, findOne, findOneAndUpdate, count, countDocuments, and updateMany; unless the query explicitly requests `is_deleted=true`, the hook adds `is_deleted != true` filtering and calls next.

Lines 24–26 state that Mongoose handles timestamps and mention a possible updated_by hook, but no such hook is implemented in this member.

**Auth/ownership:** actor fields are schema properties only; no authenticated actor propagation or authorization is implemented.

**State transitions:** soft-delete fields can be persisted, but no delete mutation or automatic deleted_at transition is implemented here.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** `is_deleted=true` can be explicitly requested by any code path that uses the plugin; there is no visible authorization boundary for deleted-document reads; `findOneAndDelete`, aggregate, distinct, or other query types are not covered; updateMany filtering can affect bulk operations but no actor audit is recorded; `updated_by` is never automatically set despite the field existing; plugin options are unused.

**Test implications:** plugin registration, each covered query type, explicit deleted reads, aggregate/delete bypass, soft-delete lifecycle, actor propagation, and interaction with audit interceptor. No tests executed during this semantic read.

**Consumer traceability:** schema plugin registration mapping will feed the dedicated route-to-consumer phase.
