# Phase 0B semantic evidence — Redis HTTP cache interceptor

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/common/redis-cache.interceptor.ts:1–39`

`RedisCacheInterceptor` handles HTTP execution contexts, bypasses non-GET requests and requests carrying an `Authorization` header, and constructs a key from `request.originalUrl` (`10–23`). It reads Redis and returns `JSON.parse` of a hit; misses pass through to the handler, then asynchronously store any truthy response for 300 seconds using JSON serialization (`24–36`).

The Authorization-header bypass is a useful basic boundary, but the member does not account for cookie-authenticated users, alternate auth headers, public/private route metadata, tenant/facility/account scope, or accidental application to endpoints that return sensitive data (`18–23`). `originalUrl` alone omits method/host/protocol and may vary or collide on normalization/query ordering; it also does not explicitly include locale, representation, API version, user-agent/device, content negotiation or feature policy (`23–24`).

`JSON.parse` can throw on corrupted/non-JSON Redis data and Redis errors are not isolated (`24–28`). The interceptor caches every truthy successful-looking response without status/content-type/PII/schema checks, awaits no write inside the RxJS tap, and has no stampede lock, size bound, serialization version, compression policy, cache poisoning defense or stale/error strategy (`30–36`). There is no explicit invalidation on mutations, deletion, publication, authorization changes or price/inventory updates, so the five-minute TTL is the only freshness boundary visible here (`31–35`). No code was changed and no build/test/application operation was performed during this read.
