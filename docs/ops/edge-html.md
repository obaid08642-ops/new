# Edge-cached HTML for anonymous visitors (P14.9, issue #1548)

Why the site is slow on a first visit: every product, doctor and catalogue page is rendered at the origin on a cache
miss (21k products), and nothing is cached at the edge. Pages carry `cache-control: private, no-cache` and
`cf-cache-status: DYNAMIC`, because each HTML response holds a CSP nonce that must be new on every response (F68).

## How it works

```
visitor ── Cloudflare ── worker nabd-edge-html ──(x-nabd-edge-stamp: <token>)── nonce-server ── Next (ISR)
                             │  Cache API: unstamped HTML per URL, under /__edge_html/...
                             └─ every response: fresh nonce in the CSP header and on every <script>/<style>/<link as=script>
```

- **Origin, edge mode** (`patient-web/server/nonce-server.mjs`, already on main): a request carrying
  `x-nabd-edge-stamp: <NABD_EDGE_STAMP_TOKEN>` for a public page gets the page **unstamped** (placeholder nonce) with
  Next's `s-maxage` + `stale-while-revalidate` + `stale-if-error`. Any other request is stamped by the origin and is
  `private, no-cache`, as today. Empty token = edge mode off.
- **Worker** (`deploy/cloudflare/edge-html-worker/worker.mjs`): caches only GET/HEAD document requests for public
  pages (`patient-web/lib/seo/public-indexable.ts`, the same list, kept equal by a test) from visitors with no session.
  It keeps the unstamped copy in the Cache API under its own key (never in the zone cache, so the placeholder page
  can never be served to anyone), and stamps a fresh nonce per response with the origin's own `stampTags`.
  - Never cached, sent to the origin untouched: `nabd_access` / `nabd_refresh` / `admin_access` cookie or
    `Authorization`; non-GET; any page outside the public list (cart, checkout, sign-in, orders, profile, payment,
    pharmacy order screens, …); RSC and prefetch requests (`_rsc`, `rsc`, `next-router-prefetch`); any origin answer
    that is not a 200 with `s-maxage` and the placeholder nonce.
  - Guests' cookies are not sent to the origin for a cached page (the page is the same for every guest); `Set-Cookie`
    (next-intl's `NEXT_LOCALE`) is never stored or sent from the cache. Tracking parameters (`utm_*`, `fbclid`,
    `gclid`, …) are not part of the cache key.
  - Fresh for `s-maxage`; then served stale at once and refreshed in the background (`stale-while-revalidate`).
  - Origin down or 5xx: the stored page is served for as long as `stale-if-error` allows (no cap, owner decision
    2026-10-06). No stored copy: the origin's own translated unavailable page (`/{lang}/unavailable`, kept by the worker
    from an earlier miss, re-stamped) as **503 + Retry-After: 30**.
  - Response header `x-nabd-edge`: `HIT` `STALE` `MISS` `REVALIDATED` `ERROR-STALE` `UNAVAILABLE` `BYPASS`.
  - CPU: stamping a 270 KB page takes about 1 ms (Workers Free allows 10 ms per request).
- **Routes**: `nabd.plus/*`, `www.nabd.plus/*`, **fail open** (if the worker cannot run, the origin answers as today).

## Cloudflare rules (unchanged by the worker)

The zone keeps `Bypass: logged-in sessions` and the HTML cache rules stay **disabled** (`docs/deploy/CLOUDFLARE_STATE.md`
§A): the zone cache never holds HTML, only the worker's Cache API does. `deploy/cloudflare/rules.md` C1–C3 are what the
worker enforces in code.

## Rollout (build session, `server-ops`, owner Approve)

1. A random 48-character token goes to `.env.production` as `NABD_EDGE_STAMP_TOKEN` (the compose file passes it to
   patient-web) and patient-web is recreated; the same value is set as the worker secret `EDGE_STAMP_TOKEN`.
2. The worker is uploaded (`wrangler.toml`: name, compatibility date) and its two routes are added, fail open.
3. Verify (the plan's 14.9 Verify):
   - anonymous `/ar`, `/ar/p/<slug>`, `/ar/doctor/<slug>`: `x-nabd-edge: HIT` on ≥ 90% of repeated requests; a fresh
     nonce every time (two responses never share one); no `set-cookie`;
   - signed-in (`nabd_access` cookie) and `/ar/cart`, `/ar/checkout`, `/ar/login`: `x-nabd-edge: BYPASS`, `no-store`;
   - with patient-web stopped: a page seen before answers 200 `ERROR-STALE`; an unseen one answers 503 with the
     translated unavailable page;
   - TTFB first visit < 800 ms for a page already in the colo's cache (issue #1548 numbers before/after).
4. Rollback: delete the two routes (the origin answers as before); clear `NABD_EDGE_STAMP_TOKEN` to switch edge mode off.

## Limits

- The Cache API is per data centre (no tiered cache): each colo fills its own copy.
- Workers Free: 100k requests/day. Above it the routes fail open to the origin (slower, never broken).
- A price or stock change shows at the edge after at most `s-maxage` (3600 s for products, 60 s for the home page), or
  at once after a purge of the `/__edge_html/...` key (purge bus, P14.8).
