# Phase 0B semantic evidence — refund-request.schema.ts

**Archive member:** `src/schemas/refund-request.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–17; full 17-line member covered.

Lines 2–3 import uuidv4. Lines 4–17 define a timestamped RefundRequest schema.

The schema generates a unique string id (6), requires booking_kind, indexed booking_id and indexed patient_id (7–9), requires free-text reason (10), makes amount optional Number (11), and defines status requested/approved/rejected/completed with requested default and index (12). It stores optional resolved_by, resolved_at and admin_note (13–15), then creates the schema (17).

**Audit judgment:** The lifecycle has useful requested/approved/rejected/completed states and indexed booking/patient references. However amount is optional and has no currency, precision, finite/nonnegative/maximum bound; booking_kind is unrestricted; there is no provider payment-intent/charge/refund reference, idempotency key or unique active refund claim, decision reason/actor-role/approval separation, settlement status/error, partial-refund remaining balance, or immutable audit/outbox linkage. Patient ownership is represented as a field but cannot be enforced by schema alone.

No product code was changed and no tests were executed during this semantic read.
