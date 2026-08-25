# Phase 0B semantic evidence — API security and abuse protection

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/api-security/api-security.module.ts:2–226`

The module defines route-class rate limits, honeypot paths, blacklist keys, security-event logging, Redis-backed counters, enumeration detection, middleware and admin security-event/blacklist-clear endpoints (`api-security.module.ts:2–226`). `logEvent` persists IP, device ID, user agent, path and arbitrary extra data; logging errors are swallowed (`46–70`). `isBlacklisted` returns false when Redis client is unavailable and `checkRate` returns allowed when Redis is unavailable (`72–100`), making protection fail open during dependency degradation.

Rate limits select class by regex over URL and increment IP/user/device counters sequentially; hourly escalation and blacklist occur after threshold, with no visible atomic Lua operation or failure handling around individual Redis commands (`86–123`). Enumeration detection trusts numeric path segments and IP-only streak keys (`124–145`). Middleware checks honeypots before rate limiting, blacklists the caller, logs, then returns a fake 200 empty payload; normal throttling short-circuits before Nest CORS and manually reflects origins from environment/default list (`149–187`).

Admin security events is JWT+ADMIN guarded and returns up to 100 raw events plus unbounded grouped counts; blacklist clear is a POST with no visible request validation, reason, audit, or explicit role beyond controller decorator and deletes both IP/device keys using the same caller-provided key (`190–215`). Middleware is applied to every HTTP route (`217–226`), including possible public/health/webhook paths, without visible exclusions or trust-boundary handling.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: fail-open security on Redis loss, non-atomic distributed rate limits, spoofable device identity, fake successful honeypot responses, URL heuristic weaknesses, PII event exposure, privileged blacklist clearing and global middleware interference.
