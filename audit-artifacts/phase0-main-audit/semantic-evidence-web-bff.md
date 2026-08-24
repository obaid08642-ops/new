
## BFF and allowlist evidence — main baseline

Source files: `nabd-patient-web/app/api/patient/[...path]/route.ts` and `nabd-patient-web/lib/api/patient-allowlist.ts`.

The catch-all exports GET, POST, PUT, PATCH and DELETE at `route.ts:11`, but `isAllowedPatientApiRequest` returns true only when `method === "GET"` at `patient-allowlist.ts:46–48`. Therefore the route exports are broader than the effective allowlist; all mutation requests are currently rejected as `resource_not_found` rather than forwarded. This must be reported as an intentional or incomplete read-only boundary, not as a body-forwarding defect.

The proxy derives the upstream access token from the httpOnly access cookie and returns 401 when absent at `route.ts:10`. It builds an empty `Headers` instance and forwards the request method/path/query to `callPatientApi`; no client `Authorization` header is accepted in this layer. On upstream 401 it attempts refresh using the httpOnly refresh/device cookies and rotates session cookies on success. Failed refresh clears session cookies. These are source observations; cookie flags, response header filtering and refresh replay behavior require their own tests.

The allowlist covers a finite set of patient read surfaces including orders/tracking, cart reads/checkout path, consultation detail, health, family, insurance, mental-health, privacy/security/storage/sessions, bookmarks and chat thread reads. The presence of `/cart/checkout` in a GET-only allowlist does not prove checkout mutation capability; its method/contract must remain classified separately.

No code behavior was changed in Phase 0.
