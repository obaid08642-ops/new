# Phase 0B semantic evidence — procurement-status.enum.ts

**Archive member:** `src/modules/pharmacy/enums/procurement-status.enum.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–8; full 8-line member covered.

Lines 2–8 define six procurement status values: `DRAFT`, `PENDING_ADMIN_REVIEW`, `QUOTATION_ISSUED`, `APPROVED_BY_PHARMACY`, `CANCELLED`, and `COMPLETED`.

**Semantic interpretation:** The enum supplies vocabulary for a pharmacy-to-warehouse procurement lifecycle. It does not encode allowed transitions, actor permissions, terminal-state behavior, timestamps, version/CAS, cancellation reason, quotation expiry, approval evidence, delivery proof or idempotency. The apparent intended path is draft/submission → admin review → quotation → pharmacy approval → completion, with cancellation as a terminal alternative, but the valid transition graph must be established in ProcurementService and schema/controller consumers rather than inferred solely from this enum.

**Integrity implications:** Any consumer that accepts a status directly from a client or uses this enum without a transition matrix could allow skipping review, approving without a quotation, completing without delivery, or changing terminal states. Enum membership alone is insufficient authorization or state validation.

**Test implications:** require an explicit transition table with actor/role per edge, CAS/version checks, terminal-state rejection, quotation expiry, approval/delivery evidence, cancellation/refund behavior, audit attribution, idempotency and concurrent transition tests. No tests executed during this semantic read.
