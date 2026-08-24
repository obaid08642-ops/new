# Phase 0B semantic evidence — admin-web-core/schemas/procurement-request.schema.ts

**Archive member:** `src/modules/admin-web-core/schemas/procurement-request.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–21; full 21-line member covered.

Lines 2–4 import Mongoose Document/Types and define ProcurementRequestDocument. Lines 6–21 define a timestamped ProcurementRequest schema.

Lines 8–9 require pharmacy_id as a User ObjectId reference. Lines 11–12 require `items` as an untyped Array. Lines 14–15 define `total_warehouse_quotation_price` as a Number defaulting to zero. Lines 17–18 restrict status to PENDING_ADMIN_REVIEW, QUOTATION_ISSUED or COMPLETED, defaulting to PENDING_ADMIN_REVIEW. Line 21 creates the schema.

**Audit judgment:** Items are untyped and have no medicine identity/quantity/price/currency bounds or uniqueness; total quotation price accepts zero/any number with no currency or precision; there is no request id/idempotency key, source/tenant/provider binding beyond pharmacy_id, quote expiry/version, rejection/cancellation state, approval actor/time, payment/settlement linkage or audit trail. The status enum lacks explicit rejected/expired/cancelled lifecycle. No unique active procurement request constraint is defined.

No product code was changed and no tests were executed during this semantic read.
