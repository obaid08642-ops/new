# Phase 0B semantic evidence — Audit, tracing and security headers

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/security/security.module.ts:2–180`

`AuditService` writes arbitrary audit entries to `AuditLog` and swallows persistence failures; query methods return raw documents with bounded numeric limits but no visible projection/redaction, retention, tenant scope or immutable append-only enforcement (`security.module.ts:11–53`). Event handlers capture authentication, booking, payment, upload, provider, admin, finance, insurance, medical-report and deletion events. Several handlers place amounts, provider account IDs, patient IDs, phone tails, notes and other details in audit records; event payload shape/ownership is trusted and write failures are silently ignored (`55–99`).

`TracingMiddleware` accepts caller-provided `x-correlation-id` without visible format/length validation, returns it, and logs method/URL/status/latency/correlation ID to console for slow/errors (`101–117`). `SecurityHeadersMiddleware` sets basic headers but no CSP, Permissions-Policy, cache policy or deployment-aware HSTS policy is visible (`120–132`).

Audit controller is JWT guarded; admin endpoints use method-level ADMIN metadata, personal activity filters by current user ID, while recent/critical return raw logs through generic queries with no visible pagination/scope (`134–168`). Module globally applies tracing and security headers to all routes and exports middleware/service (`170–180`), with no visible webhook/health/static exclusions or route-order policy.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: fail-silent audit loss, raw sensitive-event storage, caller-controlled correlation IDs, request URL console leakage, incomplete header hardening, global middleware ordering and raw audit query exposure.
