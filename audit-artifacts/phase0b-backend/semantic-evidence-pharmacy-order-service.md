# Phase 0B semantic evidence — PharmacyOrderService

**Archive member:** `src/modules/pharmacy/services/pharmacy-order.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–171 from the baseline archive extraction.

Lines 1–27 define patient pharmacy order dependencies: repositories for pharmacy orders/allocations, SmartSplit, notification/broadcast/event bus, and WorkflowEngine. `assertPatient` requires an exact patient role.

Lines 29–56 implement patient order creation. Input items are normalized into manual/matched line records with generated IDs, names, dosage/form/frequency/duration, quantity, SKU/matched SKU, unit price, intake source, and notes. Empty items are rejected. The order is created as DRAFT with patient account ID, delivery address, attachments, zero totals in SAR, and a timeline event; workflow creation is announced.

Lines 58–63 implement patient list scoped by patient account and optional status, bounded to 200. Lines 65–84 implement detail. The source order is loaded by ID, missing order returns 404, patient mismatch returns 403, allocations are fetched, and effective status is auto-aggregated from allocation states unless order is persistently cancelled/completed. Returned detail includes allocation details.

Lines 86–110 implement draft update. Patient role and ownership are required; only DRAFT is editable. Item fields are rebuilt from opaque body data, including client-provided `unit_price`, `matched_sku`, and `match_status`; address/notes/timeline are updated and saved.

Lines 112–137 implement submit. Patient ownership is required; only DRAFT/READY_FOR_SPLIT paths are accepted. Workflow transitions to READY_FOR_SPLIT, records submission, and starts broadcast rounds; SmartSplit is now fallback behavior in comments but not directly invoked in this method.

Lines 139–170 implement patient cancellation. Patient ownership is required and delivered/completed/cancelled orders cannot be cancelled. Workflow transitions to CANCELLED, records reason/timeline, releases stock for open allocations, marks them cancelled, and emits an allocation-release event. No visible Idempotency-Key extraction or replay claim exists in this service.

**Auth/ownership:** exact patient role for create/list/update/submit/cancel; patient account ID predicates on detail/update/submit/cancel; detail returns 403 for foreign patient rather than privacy-normalized 404.

**State transitions:** DRAFT → READY_FOR_SPLIT → broadcast workflow; cancellation from non-terminal state → CANCELLED; allocations released/cancelled as part of cancellation.

**Price/payment/insurance source:** totals are initialized to zero; line `unit_price` is accepted from request; no visible server catalog price resolution, payment, insurance, or refund logic in this service.

**Security/truthfulness observations:** opaque `any` bodies and client-supplied unit price/match status; prescription attachments accepted without visible validation in this service; foreign detail uses 403; no visible idempotency for create/update/submit/cancel; notification dependency is injected but not used in the visible methods; effective status is derived from allocation states.

**Test implications:** patient role/owner/stranger/unauth, draft edit gate, server-side pricing/zero-total behavior, attachment validation/privacy, submit replay/broadcast duplication, cancel replay/stock release, allocation status aggregation, and 404-vs-403 contract. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
