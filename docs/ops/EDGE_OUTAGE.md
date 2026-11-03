# Public pages while the origin is down (owner, 2026-11-02)

Production went dark at about 13:20 UTC: Cloudflare 522 everywhere. The origin already sent `stale-if-error=31536000` on shareable pages and the cache
rules of `tools/ops/cf/46` and `47` keep them, but **each Cloudflare data centre kept its own copy**, and a quiet one had none, so it asked the dead
origin. The owner's expectation: public pages keep opening from the edge; only sign-in, booking, payment and orders may fail.

## What changed

| Layer | Change | Where |
|---|---|---|
| Central copy | **Smart Tiered Cache**: a lower data centre asks an upper tier before the origin; one warm upper-tier copy serves all of them, stale included, when the origin is unreachable. | `tools/ops/cf/52-edge-resilience-{check,apply}.sh` |
| Persistence | **Cache Reserve** where the plan has it. It keeps only objects with a freshness lifetime of 10 hours or more (images, catalogue pictures); the 60 s home page does not qualify, so it is a supplement, not the fix. | same |
| Last resort | **Always Online**, where the plan has it. | same |
| Warm copy | Every 15 minutes an anonymous request for the home page and `/consultations/doctors` of each locale plus a rotating slice of the sitemap URLs the cache rule would keep. Counts only in the log; red when fewer than half answer 2xx. | `tools/ops/cf/53-edge-warmup.sh`, `.github/workflows/edge-warmup.yml` |
| Public API | `stale-if-error` on `@PublicCache` answers raised from 1 day to 30 days (`cache-control.interceptor.ts`, `redis-cache.interceptor.ts`). | backend |
| Guards kept | Private pages, signed-in screens, cart, checkout, sign-in, OTP, orders, payments: `no-store`, never cached; the cache rules still exclude session/theme cookies, `RSC`, `Authorization`. Existing tests unchanged. | |

## Steps for the owner's session (names only, no values)

1. `52-edge-resilience-check` (reads): shows each setting and what would change.
2. `52-edge-resilience-apply`: turns on `tiered`, `reserve`, `always`, reads each back, puts the old value back if the read-back disagrees. A setting the plan lacks is reported and the others still apply.
3. Run the `edge-warmup` workflow once by hand (`workflow_dispatch`); it then runs every 15 minutes. After the first run the log shows `cf-cache-status: HIT=…`.
4. Confirm: `bash tools/ops/cf/53-edge-warmup.sh` twice; the second run should show mostly `HIT`.

## What is and is not proven

- Proven (`tools/ops/tests/test_cf_edge.py`): the two scripts against a fake Cloudflare API; and a standards-following shared cache (RFC 5861) in front of an origin that sends the real `Cache-Control` produced by `patient-web/server/nonce-server.mjs`, then stopped: the public page is served (fresh and stale), a page that acts is not, and a page nobody requested before the outage is not.
- **Not proven:** Cloudflare's own behaviour with the real origin down. Tiered Cache and `stale-if-error` on a connection failure (522) must be confirmed on the live zone. Only a page that was requested **before** the outage is held; the warm-up job is what makes that true for the pages that matter. A page in no cache fails.
- No origin outage was simulated at Cloudflare.
