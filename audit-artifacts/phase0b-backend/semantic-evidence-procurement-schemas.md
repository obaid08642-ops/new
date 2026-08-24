# Phase 0B semantic evidence — procurement schemas

**Archive members:** `src/modules/pharmacy/schemas/procurement-request.schema.ts`, `src/modules/pharmacy/schemas/quotation.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** request lines 1–43; quotation lines 1–38 from baseline archive extraction.

## ProcurementRequest schema

Lines 1–5 define the Mongoose document type. Lines 6–15 persist pharmacy UUID string ownership and creator UUID string. Lines 16–27 define embedded request items with optional Medicine ObjectId, required raw name and quantity, medical/non-medical category, and notes. Lines 29–35 constrain status to DRAFT, PENDING_ADMIN_REVIEW, QUOTATION_ISSUED, APPROVED_BY_PHARMACY, CANCELLED, or COMPLETED, with pending review default and index. Lines 37–42 persist uploaded file URL and warehouse quotation price.

The schema comment explicitly records that platform user IDs are UUID strings and using ObjectId caused CastErrors in submit/my-requests flows; this is a contract-sensitive detail. There is no explicit index combining pharmacy/status/createdAt and no unique idempotency key.

## Quotation schema

Lines 1–14 define the Quotation document interface: procurement request ID, admin ID, item medicine IDs/quantities/prices, total price, status, notes, feedback, and timestamps. Lines 16–38 create the Mongoose schema. The request reference is a string, item medicine IDs are required strings, quantity and price are required numbers, totalPrice is required number, and status uses `ProcurementStatus` enum with QUOTATION_ISSUED default.

**Auth/ownership:** pharmacy ID, creator ID, and admin ID are stored but schema-level ownership/role enforcement is absent.

**State transitions:** enum persistence constraints only; service enforces lifecycle transitions.

**Price/payment/insurance source:** warehouse quotation price and quotation item/total prices are persisted as caller/service inputs; no subtotal/total invariant, currency, non-negative constraint, payment link, or insurance field is defined.

**Security/truthfulness observations:** embedded `items: any[]` in requests permits weak typing; uploaded file URL has no visible content/type/ownership validation; numeric quantity/price/total fields lack non-negative and arithmetic validation; quotation request relation is a string ref while item medicine relation uses string/ObjectId inconsistently; no unique quotation-per-request constraint or idempotency key is visible.

**Test implications:** UUID/ObjectId compatibility, owner/stranger/unauth at controller boundary, enum transitions, negative/zero quantity and price, total arithmetic, quotation reissue concurrency, upload URL ownership/type, duplicate quotation, and partial save consistency. No tests executed during this semantic read.

**Consumer traceability:** schema-to-service/controller mapping will feed the dedicated route-to-consumer phase.
