# Phase 0B semantic evidence — procurement.controller.ts

**Archive member:** `src/modules/pharmacy/controllers/procurement.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–143; full 143-line member covered.

Lines 2–9 import Nest/Mongoose types, ProcurementRequest and Medicine schemas, ProcurementService, auth decorators, UserRole and AiGatewayService. Lines 18–26 define `ProcurementController` under `pharmacy/procurement`, protected by JwtAuthGuard, with procurement/medicine models plus service and AI dependencies.

Lines 28–50 expose POST `submit-request`, allowed for pharmacy/admin/super-admin. Identity is derived from `@CurrentUser()` and pharmacy_id/created_by are set from user.id, which is a positive IDOR boundary. However, the request body is `any`; items are truncated to 500, identifiers are conditionally converted to ObjectId or null, raw names and notes are string-truncated, quantities are coerced/clamped, and category_group is normalized to two values. Items may still contain null medicine IDs and non-catalog raw strings. `fileUrl` is accepted as a string up to 1000 characters without visible ownership, scheme, host, storage ACL, MIME or malware validation. A request is created directly with PENDING_ADMIN_REVIEW and no Idempotency-Key, duplicate detection, transaction, audit actor or outbox. Response exposes request._id.

Lines 52–58 expose GET `my-requests` for pharmacy/admin/super-admin and filter by pharmacy_id from the token. The route returns the full list without visible pagination, projection/redaction, tenant/admin scope distinction or explicit `.lean()`/limit; sensitive procurement, pricing, notes, uploaded URLs and status may be exposed to admin users across pharmacies depending on intended role semantics.

Lines 60–68 expose POST `:id/feedback` for pharmacy only. It passes user.id and id to ProcurementService, but accepts raw `dto` fields status and pharmacyFeedback with no enum, length, transition, ownership or idempotency validation in the controller. The generic `:id` is declared after static routes, but live method/path tests are still required.

Lines 70–79 expose POST `analyze-file` for pharmacy/admin/super-admin. It accepts either file_base64 or text, rejects neither when both absent, and caps base64 length at 8,000,000 characters. There is no MIME allowlist, decoded-byte limit, file signature validation, content scanning, prompt-injection isolation, rate limit, user quota, retention policy or request idempotency. The endpoint sends user-provided text/image to the AI gateway.

Lines 81–93 construct an Arabic prompt requesting JSON-only extraction and pass imageBase64 and caller MIME type to AiGatewayService. Lines 95–106 defensively parse the first JSON object from model output, cap extracted items at 200 and coerce quantities to at least 1. This permits malformed/non-integer/very large quantities after model output and silently returns an empty list on parse errors.

Lines 108–128 match extracted names against the live Medicine catalog with escaped regex and `$options: i` across Arabic/English/active ingredient fields, excluding deleted items. It uses `findOne` and therefore first-match ambiguity is possible; no active/approved/stock/prescription eligibility or tenant/catalog source is enforced. Category is inferred from `med.category`, defaulting unmatched items to medical.

Lines 130–141 return `ok`, AI provider/model metadata, matched items, medicine IDs/names and counts. Returning provider/model metadata may expose implementation details; matched medicine names and IDs may disclose catalog data. No confidence, source span, human confirmation, ambiguity or hallucination audit is returned. There is no persistence of the analysis request or linkage to a procurement draft.

**Confirmed findings:** arbitrary DTOs and raw file URLs; missing mutation idempotency; direct create without transactional/outbox guarantees; unbounded list/projection; feedback state/ownership validation delegated/unproven; AI file/text surface lacks visible MIME/security/rate/quota/prompt-isolation controls; model output coercion and first-match ambiguity; catalog eligibility/category truthfulness gaps; AI metadata and catalog disclosure.

**Test implications:** require owner/stranger/unauth/admin/super-admin matrix; duplicate replay and concurrent submit/feedback; DTO/status/quantity bounds; file URL/base64 validation and scanning; AI abuse/rate/quota/prompt-injection tests; exact catalog match/ambiguity/eligibility; projection/pagination/redaction; transaction/outbox and audit tests; live method/path probes. No tests executed during this semantic read.
