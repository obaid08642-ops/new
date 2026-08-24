# Phase 0B semantic evidence — admin-procurement.controller.ts

**Archive member:** `src/modules/pharmacy/controllers/admin-procurement.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–86; full 86-line member covered.

Lines 2–17 import Nest decorators/response handling, JwtAuthGuard/Roles, ProcurementService, AdminCreateQuotationDto and ProcurementStatus. Lines 19–23 define `AdminProcurementController` under `admin/procurement`, protected by JwtAuthGuard and class-level `@Roles('admin' as any)`.

Lines 25–29 expose GET `/admin/procurement` with optional status query cast to ProcurementStatus and delegate to adminListRequests. The controller does not visibly validate enum membership, pagination, tenant scope, or field projection.

Lines 31–35 expose GET `/admin/procurement/summary` and delegate status counts to adminSummary.

Lines 37–44 expose GET `/admin/procurement/:id/export`, set CSV content type, call adminExportCsv, and construct a filename from the raw id before sending. The member does not validate identifier format, constrain CSV fields, prevent formula injection, verify admin tenant scope, or set content-disposition hardening such as safe filename encoding.

Lines 46–50 expose GET `/admin/procurement/:id` and delegate adminGetRequest. Lines 52–56 expose PATCH `/:id/review` and delegate adminStartReview. Lines 58–67 expose POST `/:id/quotation`; it extracts `req.user.sub` as adminId and passes the DTO to adminCreateQuotation. Lines 69–73 expose GET `/:id/quotation`. Lines 75–79 expose PATCH `/:id/cancel`. Lines 81–85 expose PATCH `/:id/complete`.

**Route-order implication:** Static routes `summary` and the suffix routes `:id/export`, `:id/quotation`, `:id/cancel`, `:id/complete` are declared around the generic `@Get(':id')`. Nest route matching generally resolves specificity, but live method/path probes and controller tests are still required to prevent an id route from swallowing a static/suffix route under framework configuration.

**Security/integrity:** Class-level admin guard/role is present, but actor identity is explicitly propagated only for quotation creation. Review/cancel/complete do not receive `req.user` in this controller, so actor attribution, tenant/admin scope, and audit linkage depend entirely on ProcurementService context or are absent. No Idempotency-Key header is consumed for quotation/cancel/complete/review; no transaction or state CAS is visible here. `status` and `id` are raw query/path inputs.

**Financial/PII surface:** procurement list/detail/quotation/export can contain medicine, pharmacy, pricing and delivery data. No controller-level least-privilege projection, CSV sanitization, or sensitive-field redaction is visible.

**Test implications:** require live method/path probes, admin/unauth/non-admin matrix, tenant scope, enum/pagination validation, safe CSV and formula-injection tests, actor/audit propagation, idempotency replay, state CAS for review/cancel/complete, quotation amount/currency/server-authority checks, transaction/outbox and failure-recovery tests. No tests executed during this semantic read.
