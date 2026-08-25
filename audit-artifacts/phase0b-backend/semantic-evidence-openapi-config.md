# Phase 0B semantic evidence — OpenAPI configuration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/config/openapi.config.ts:1–88`

The configuration defines public and local API v1 servers, an `access-token` bearer security scheme, title/version/description, and a contract-first note that operations must document role/ownership rather than treating authentication as authorization (`10–33`). `createNabdahOpenApiDocument` invokes Nest Swagger, strips `/api/v1` or `/v1` prefixes from scanned paths, and adds explicit patient contract-pack paths (`36–45`). The comment explicitly forbids aspirational endpoints (`48–51`).

The injected contract-pack paths document OTP request/verify/session exchange, bounded user display/update/health ID, vitals log/create and cart item creation (`53–86`). Some protected paths use the bearer scheme, and vitals creation declares a required UUID-formatted Idempotency-Key (`56–57,68–84`).

The injected request/response schemas are generic `{type:'object'}` and do not describe DTO properties, required fields, formats, error bodies, cookies or one-time token structure (`55–86`). OTP verify documents an exchange token response but does not model its single-use/60-second claims; session exchange states HttpOnly behavior in prose only (`62–66`). `/cart/items` is protected in prose/summary context but has no explicit `security` entry and no Idempotency-Key declaration (`83–85`). `/users/me` mutation also lacks Idempotency-Key (`71–72`).

The function adds a small set of paths manually after scanning; no collision detection, duplicate-path audit, operationId policy, tag/version policy, deprecation consistency or route-to-live endpoint verification is encoded (`36–45,53–86`). A single bearer scheme does not express roles/ownership/scopes, and there is no payment/x402/MPP/UCP/ACP discovery metadata, webhook/callback, cookieAuth or CSRF contract (`20–32,53–86`). The local server is hardcoded HTTP localhost while production is hardcoded public URL (`10–11,25–26`). No code was changed and no build/test/application operation was performed during this read.
