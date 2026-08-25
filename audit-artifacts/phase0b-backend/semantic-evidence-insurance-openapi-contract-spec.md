# Phase 0B semantic evidence — Insurance OpenAPI contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/insurance-openapi.contract.spec.ts:1–92`

The spec creates a Nest testing application with three insurance-related controllers and mocked patient repository, users service, patient model, insurance service, JWT service, reflector and Mongo connection (`15–40`). It configures global `api` prefix and URI version `1`, then checks generated OpenAPI metadata (`18–35`).

It asserts OpenAPI 3.0 metadata includes the canonical public v1 server and a named HTTP bearer JWT security scheme (`42–54`). It asserts the legacy `/user/insurance` GET is present, deprecated, bearer-protected, has compatibility-shaped 200 fields (`policies`, `insurance_policies`) and a 401 response (`56–67`). It distinguishes canonical patient insurance GET/POST, active projection and company catalog responses, checking bearer security, nullable canonical response wording, `verified: false`, `insurance_details`, `plans`, and 403 responses (`69–86`). It also checks that the legacy controller is registered in `UsersModule` (`88–91`).

These are useful documentation-shape and wiring assertions, not endpoint behavior or security proofs. The test does not issue requests, authenticate users, exercise owner/stranger/unauthenticated matrices, test patient-profile ownership, verify the actual 401/403 guards, validate POST DTO/idempotency/verification transitions, or prove company/plan/active policy truth (`19–40,56–86`). It does not cover claim submission/approval/rejection, insurer/provider eligibility, financial amounts/currency, attachments/PII, cache/indexing, legacy redirect/removal lifecycle, OpenAPI completeness/operation IDs/schemas, live deployed parity or production backend behavior. No code was changed and no build/test/application operation was performed during this read.
