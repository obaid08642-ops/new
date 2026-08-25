# Phase 0B semantic evidence — WebSocket CORS spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/config/websocket-cors.spec.ts:1–27`

This unit spec snapshots the WebSocket CORS helper in three cases: staging without an allowlist must throw, production wildcard must throw, and a staging comma-separated explicit list must return the two trimmed origins with credentials enabled (`3–25`). It restores `process.env` after each case (`4–5`).

The cases provide narrow regression evidence for non-local missing-list and literal-wildcard rejection plus explicit-origin parsing. They do not cover development/test fallback (`origin:true, credentials:true`), empty/whitespace values, duplicate/equivalent origins, non-HTTPS/unsafe schemes, malformed URLs, ports, wildcard subdomains, `NODE_ENV` variants, mixed wildcard lists, adapter installation, HTTP/WebSocket parity, proxy/handshake behavior, cookies/CSRF or actual Socket.IO connections (`7–25`).

Because the test compares helper output only, it does not prove that all gateways consume the helper or that credentials are safe in deployment. No test was run and no product code was changed during this semantic read.
