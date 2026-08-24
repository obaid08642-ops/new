# Phase 0B semantic evidence — ProcurementService

**Archive member:** `src/modules/pharmacy/services/procurement.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–227 from the baseline archive extraction.

Lines 1–22 define procurement and quotation repositories plus DTO dependencies. Lines 24–35 create pharmacy procurement requests with pharmacy/creator IDs, submitted items, and PENDING_ADMIN_REVIEW status; visible service code does not perform actor authorization.

Lines 38–53 list/get pharmacy-owned requests, with ObjectId parsing for detail and NotFound for absent or foreign requests. Lines 55–89 accept pharmacy quotation feedback only when QUOTATION_ISSUED, permit APPROVED_BY_PHARMACY or CANCELLED, persist feedback, and mirror status to the linked quotation.

Lines 91–113 implement admin request listing and summary aggregation. Lines 115–129 export request items as an Arabic-safe CSV with BOM; line fields reflect raw name/medicine name, requested quantity, category, catalog match, and notes.

Lines 131–145 implement adminStartReview but deliberately leaves status at PENDING_ADMIN_REVIEW because the new spec has no intermediate review status. Lines 147–182 create/reissue quotations for pending requests, deleting any prior quotation, persisting admin ID/items/total/admin notes, moving request to QUOTATION_ISSUED, and storing quotation ID.

Lines 184–191 get a request quotation. Lines 193–211 cancel requests except approved/completed/cancelled. Lines 213–226 complete requests only from APPROVED_BY_PHARMACY.

**Auth/ownership:** pharmacy list/detail are scoped by pharmacy ID; feedback is scoped by pharmacy ID; admin methods assume controller authorization and lack visible actor predicates; createRequest accepts pharmacyId/createdBy parameters without validating their relationship.

**State transitions:** PENDING_ADMIN_REVIEW → QUOTATION_ISSUED → APPROVED_BY_PHARMACY/CANCELLED → COMPLETED; admin review is a no-op state method.

**Price/payment/insurance source:** admin quotation total/items are accepted from DTO and persisted; no payment/refund/insurance logic visible.

**Security/truthfulness observations:** service relies heavily on upstream controller auth; quotation reissue deletes prior quotation and creates a new one non-transactionally; no visible idempotency; ObjectId parsing can throw on malformed IDs; CSV export includes request-supplied values; status mirror can diverge if quotation update/request save partially fails.

**Test implications:** pharmacy owner/stranger/unauth, admin role, malformed IDs, quote reissue/replay, status transitions, quotation total integrity, feedback replay, cancellation/completion guards, export encoding/content, and partial-failure consistency. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
