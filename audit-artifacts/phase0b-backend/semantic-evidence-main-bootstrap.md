# Phase 0B semantic evidence — Main bootstrap

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/main.ts:1–131`

The bootstrap initializes Sentry with an empty-string fallback DSN and environment/tracing defaults (`1–6`), creates the Nest app, optionally starts in-memory Mongo when `USE_MEMORY_MONGO=true` with a production rejection, but catches MongoMemoryServer startup failure and continues (`27–42`). Production requires `ALLOWED_ORIGINS`, yet outside production missing origins become `true`, enabling broad CORS; configured origins are passed as an array without visible normalization/strict origin policy (`44–55`).

Helmet enables production CSP but permits `'unsafe-inline'` for scripts and styles and allows every HTTPS image source (`70–81`), while cross-origin embedder policy is disabled. Compression, cookie parsing and a custom WebSocket adapter are enabled (`82–84`). Sentry exception filtering is global (`86–87`) but this file does not establish PII scrubbing or sampling rules beyond traces (`1–6`).

The JSON body parser accepts 25MB and copies the complete raw body into `req.rawBody` (`89–96`), increasing memory/PII exposure and request-amplification risk; no content-type, route-specific size, upload or raw-body retention boundary is visible. The app uses `/api` plus URI versioning with default `1` and a strict ValidationPipe (`97–108`). Swagger is enabled by default outside production and can be explicitly enabled in production (`110–119`); this is a controlled tradeoff but no auth/IP restriction is visible here. Shutdown hooks are enabled and the app listens on all interfaces with a parsed default port (`121–129`), but no readiness/liveness, dependency readiness, startup timeout, graceful drain deadline, or fail-closed required-config validation is established in this member. No product code was changed and no tests/builds were executed during this semantic read.
