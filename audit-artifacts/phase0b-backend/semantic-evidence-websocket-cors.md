# Phase 0B semantic evidence — WebSocket CORS configuration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/config/websocket-cors.ts:1–15`

`getWebSocketCorsOptions` reads `NODE_ENV`, splits `ALLOWED_ORIGINS` on commas, trims values and removes empty entries (`3–6`). It treats development/test as local environments, rejects a literal wildcard outside those environments, returns an explicit origin array with credentials enabled when origins exist, throws outside local environments when no origin is configured, and otherwise returns `origin:true` with `credentials:true` for development/test (`6–15`).

The non-local fail-closed and wildcard rejection are positive controls. However, `origin:true` combined with `credentials:true` in development/test allows arbitrary origins with credentialed WebSocket CORS if that configuration reaches a remotely accessible environment (`10–15`). The function does not validate scheme/host/port/HTTPS, canonicalize trailing dots/default ports/case, reject duplicate/confusable origins, or distinguish browser origin from trusted deployment host (`5–10`).

The returned `CorsOptions` is only configuration data; this member contains no Socket.IO handshake, proxy, deployment, auth-token, cookie, or integration test. It does not prove that every WebSocket gateway consumes these options or that HTTP CORS and WebSocket CORS are consistent. No code was changed and no build/test/application operation was performed during this read.
