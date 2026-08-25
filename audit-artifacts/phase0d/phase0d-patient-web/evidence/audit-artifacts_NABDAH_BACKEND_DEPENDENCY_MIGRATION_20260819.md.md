# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_BACKEND_DEPENDENCY_MIGRATION_20260819.md`
- **Member SHA-256:** `ff71912df8beb2262304b5ba0c859fca8ec334e2dfdbc9f2f3b6eb674e773bd3`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: The SheetJS replacement is not a dead-dependency removal. The former package served both the prescription spreadsheet parser and a legally scoped settlement workbook exporter. Two focused tests now prove bilingual spreadsheet parsing, inval`
### backend_consumers_or_contracts
- `12: | Nest framework line | Nest 10.4.x mixed ecosystem | Compatible Nest 11 ecosystem, including core/common/platform/websocket/testing/CLI, Mongoose 11, Swagger 11, Terminus 11 and supporting direct modules. | Existing module contracts and te`
### auth_ownership
- `5: The Backend dependency remediation was performed only in an isolated copy of the current governed Backend archive. It began from the previously fixed prescription-detail authorization source, made no production request or deployment, and us`
- `14: | JWT config typing | Nest 10-compatible unconstrained string | `StringValue` type on the unchanged `JWT_EXPIRES_IN` environment value. | Default duration remains `1h`; no runtime session policy was changed. |`
- `41: This migration removes the high/critical findings reported by the current Backend audit, but 28 moderate findings still require ongoing triage. It does **not** authorize a production deployment or close the live BOLA proof for the prescript`
- `47: [3]: NABDAH_PHASE11_PRESCRIPTIONS_AUTHORIZATION_REMEDIATION_20260819.md "Phase 11 prescription detail authorization remediation"`
### state_transitions
- `13: | Google Vision | 5.3.7 | 6.0.0 | `ImageAnnotatorClient` construction and document-text extraction contract compile and retain their existing fail-closed error behavior. |`
### payment_insurance_relevance
- `17: The SheetJS replacement is not a dead-dependency removal. The former package served both the prescription spreadsheet parser and a legally scoped settlement workbook exporter. Two focused tests now prove bilingual spreadsheet parsing, inval`
- `27: | `npm audit --json` before work | 58 total: 3 low, 46 moderate, 9 high, 0 critical |`
- `28: | `npm audit --json` after work | **28 total: 0 low, 28 moderate, 0 high, 0 critical** |`
- `29: | Backend ZIP integrity | **PASS**; excludes `node_modules`, `dist` and `coverage` |`
- `41: This migration removes the high/critical findings reported by the current Backend audit, but 28 moderate findings still require ongoing triage. It does **not** authorize a production deployment or close the live BOLA proof for the prescript`
### error_empty_loading_retry_cancel
- `13: | Google Vision | 5.3.7 | 6.0.0 | `ImageAnnotatorClient` construction and document-text extraction contract compile and retain their existing fail-closed error behavior. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
