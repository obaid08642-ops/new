# Phase 0B semantic evidence — FastAPI NestJS proxy

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `infra/fastapi/nestjs_proxy.py:1–48`

The module exposes a catch-all `/api/v2/*` and `/api/v2` proxy to fixed `http://localhost:8002/api` (`1–15,40–47`). The upstream is plaintext HTTP and is configured as a module-global `httpx.AsyncClient` with a 30-second timeout and no redirects (`14–15`). There is no environment-bound upstream identity, TLS/mTLS, allowlist, circuit breaker, retry budget, connection pool limits, health/readiness integration or shutdown close hook.

`_forward` concatenates the request path onto the upstream base and forwards all methods/body/query parameters (`18–31,40–47`). It removes a small hop-by-hop/host header set but passes all other request headers, including Authorization, Cookie, tracing, client and potentially sensitive headers, without an explicit trust boundary or normalization (`20–22`). There is no route-level authentication, tenant/actor binding, method/path allowlist beyond the broad catch-all, path validation, query/body size limit, content-type policy, request ID or rate limit. The route can therefore act as a broad compatibility tunnel and bypass contract-specific controls if the upstream accepts the forwarded request.

On upstream request failure, the proxy returns a JSON 502 containing `str(e)` (`32–33`), which can expose internal host, port, URL or transport details. Upstream response headers are copied except for four headers, so security, cache, cookie and other control headers may be duplicated or mishandled; response content is returned as-is with upstream content type (`34–37`). There is no response redaction, error normalization, body-size cap or upstream status contract. The client is never explicitly closed during application shutdown (`14–15`), and there is no structured proxy telemetry, upstream latency/error classification or audit context.

This is a second routing/contract surface whose `/api/v2` broadness and header/body forwarding must be reconciled with the authoritative NestJS API, especially for authentication, cookies, ownership, idempotency and error semantics. No product code was changed, the proxy was not run, and no tests/builds were executed during this semantic read.
