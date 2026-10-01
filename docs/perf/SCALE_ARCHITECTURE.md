# Nabd+ at scale: layers, techniques and honest capacity (reviewer research, 2026-10-01)

**The owner's goals:**
- hundreds of thousands to millions of visitors at the same time;
- thousands of purchases, add-to-cart actions, bookings and calls at the same time;
- running on the current OVH server;
- every page loads in a fraction of a second;
- the site and apps stay up under heavy pressure.

This document explains how high-traffic sites, including sites that run on modest servers, achieve this. It maps each technique to a plan task (`02_AGENT_EXECUTION_PLAN.md`, Phases 14, 15 and 20). Sources are listed at the end.

## 1. The honest answer
- **Reading (browsing, searching, opening product, doctor and service pages)** can scale to very large audiences if the pages and public data are served from Cloudflare's edge. The origin server then barely sees anonymous traffic. This is how large stores survive peaks on small origins.
- **Writing (add to cart, checkout, payment, booking, chat, calls)** always reaches the origin, because it cannot be cached. On one server the real ceiling has to be **measured** with load tests (14.2, 14.27). "Thousands of transactions per second" needs the scale-out steps in §6. Nobody can honestly promise "millions of transactions per second" on one server, and this plan does not.
- **Calls** are limited mostly by bandwidth. On a 1 Gbps port, one LiveKit node carries roughly 200–400 two-way participants in small rooms. Calls therefore move to their own server(s) (14.22).

## 2. What exists today (checked in `deploy/` and the code on 2026-10-01)
| Area | Today | Verdict |
|---|---|---|
| Edge | Cloudflare in front of the domains | Good base; caching rules not yet designed for HTML or public JSON |
| Origin proxy | Nginx with `limit_req`, upstream keepalive, and a 5–15 min API cache with `proxy_cache_lock` | **Unsafe** (see X0): the cache key is the URL only and private responses are marked `public` |
| API | NestJS on Express; Fastify is opt-in (`USE_FASTIFY=true`); Node cluster with one worker per CPU in production | Fastify is about 2–3× Express on simple routes; the cluster is good, **but the state is not cluster-safe** (X11) |
| Realtime | Socket.IO, clients websocket-only, **no Redis adapter** | Events are lost across workers (X11) |
| Database | MongoDB single-node replica set, WiredTiger cache **0.5 GB** | Too small; there is no secondary for reads yet |
| Redis | One instance, 512 MB, `volatile-lru`, used for both cache and BullMQ | BullMQ requires `noeviction`; cache and queue must be split (X12) |
| Calls | LiveKit and coturn on the same machine as everything else | Competes with the API for CPU and bandwidth |
| Web | Next.js 16, `output: standalone` | Cache Components/PPR are available and not yet used for entity pages |

### Defects found during this research (added to `REVIEW_P7R_TO_P12.md` as X0, X11 and X12)
- **X0 (critical, proven):** the backend marks every GET under `/api/v1/radiology`, `/api/v1/medicines` and the other "catalog" prefixes as `public, s-maxage=300`, including `radiology/bookings/mine`, `radiology/reports/mine` and `radiology/admin/*`. Nginx caches those prefixes for 15 minutes with the key `$uri$is_args$args`.
  - The reproduction used the exact production location block in Docker:

    | Request | Result |
    |---|---|
    | Anonymous → backend | 401 |
    | Patient A → Nginx | 200, `MISS` |
    | Anonymous → Nginx | **200, `HIT`, A's data** |

  - Anyone can read the last patient's radiology reports for up to 15 minutes.
- **X11:** process-local state under the production cluster. This covers Socket.IO rooms, presence, doctor queues, SSE subjects, step-up tokens and write-behind locks.
- **X12:** the queue and the cache share one Redis instance with an eviction policy.

## 3. The layers (request path)
```
User (app / browser)
  │  L0 client: HTTP cache, persisted query cache, prefetch, Speculation Rules, small images
  ▼
Cloudflare edge (300+ cities)
  │  L1: TLS 1.3/HTTP3, WAF + managed rules, Bot Fight Mode, Turnstile, rate-limit rule,
  │      Cache Rules (public HTML + public JSON), Smart Tiered Cache, purge by Cache-Tag,
  │      async stale-while-revalidate + stale-if-error, image resizing, (optional) Waiting Room
  ▼
OVH network: always-on anti-DDoS
  ▼
Nginx (origin)
  │  L3: micro-cache 1–10 s for PUBLIC routes only (lock + background update + use_stale),
  │      bypass on Authorization/session cookie, limit_req/limit_conn per route group, static files
  ▼
API: NestJS on Fastify, Node cluster
  │  L4: load shedding by priority, timeouts + circuit breakers, singleflight, pagination caps
  ├──► Redis CACHE (allkeys-lru): read-through, tags, SWR, hot keys precomputed       (L5)
  ├──► Redis QUEUE (noeviction, AOF): BullMQ, outbox, priority queues                   (L6)
  ├──► MongoDB replica set: indexes, projections, precomputed aggregates, secondaries   (L7)
  ├──► Meilisearch: Arabic-aware typo-tolerant search for 20,990 × 6 locales             (L8)
  └──► Realtime: Socket.IO + Redis adapter (→ Centrifugo when connections grow)         (L9)
Separate workers: queues and crons, kept out of the API processes                       (L12)
Media: object storage + CDN + imgproxy/Cloudflare Images (AVIF/WebP, EXIF stripped)     (L11)
Calls: LiveKit on its own server, simulcast + dynacast + audio-only fallback, TURN on 443 (L10)
```

| Layer | Technique | Why it matters | Plan |
|---|---|---|---|
| L0 | TanStack Query cache persisted on the device; prefetch; Speculation Rules (prefetch on hover, prerender likely next pages, never add-to-cart or checkout); bfcache-safe pages | The fastest request is the one never sent. On Chromium, prerendered pages open instantly. | 14.23, 14.24, 15.4 |
| L1 | Cloudflare Cache Rules for anonymous HTML and public JSON; `Cache-Control: public, s-maxage, stale-while-revalidate, stale-if-error`; **purge by Cache-Tag (now on every plan, about 150 ms globally)**; Smart Tiered Cache (free); Cache Reserve (paid) for the long tail of about 126k medicine pages; Turnstile (free); WAF free managed ruleset; one free rate-limit rule; Waiting Room (Business plan) | Anonymous traffic is served at the edge without touching OVH. Tags allow long caching that is still fresh within a second of a change. Async SWR means no visitor waits for revalidation, and `stale-if-error` keeps pages up when the origin is down. | 14.1, 14.8, 14.9, 14.19 |
| L3 | Nginx micro-cache: `proxy_cache_lock on`, `proxy_cache_use_stale updating error timeout http_500 http_502 http_503 http_504`, `proxy_cache_background_update on`. **Never** cache a request that carries `Authorization` or a session cookie. | 100 identical requests in one second become 1 request to Node. This is the classic weak-server technique. | X0, 14.11 |
| L4 | Fastify adapter (the code already supports it); cluster-safe state; load shedding on event-loop delay (503 + `Retry-After`) for low-priority routes; never shed auth, checkout, payment webhooks, SOS/ambulance or live calls | More requests per core, and graceful degradation instead of collapse. | 14.12, 14.13, 14.17 |
| L5 | Read-through Redis cache with TTL + jitter, singleflight (exists), stale-while-revalidate, tag invalidation; hot keys (home sections, categories, ranking) precomputed | Removes repeated database work and prevents cache stampedes. | 14.3, 14.14 |
| L6 | Separate queue Redis (`noeviction`, AOF `everysec`); outbox pattern; priority queues; rate-limited senders (SMS, push, email, WhatsApp) | Checkout returns fast and no side effect is lost. | X12, 14.4, 14.26 |
| L7 | WiredTiger cache sized to RAM (now 0.5 GB); every hot query indexed (CI explain check, no COLLSCAN); `maxTimeMS`; projections; materialized aggregates (`$merge`) for dashboards and reports; 3-node replica set and secondaries for analytics later | The database is usually the first real bottleneck. | 14.15 |
| L8 | Meilisearch: its tokenizer normalizes Arabic (for example it drops "ال") and handles typos; synonyms from `search_aliases`; synced from the outbox | Fast multilingual search without `$regex` scans on Mongo. | 14.16, 13.R7 |
| L9 | Socket.IO + `@socket.io/redis-adapter` now; Centrifugo (Go; tested at 1M WebSocket connections on one modern server) when concurrent connections grow | Realtime that works across workers and servers. | X11, 14.21 |
| L10 | LiveKit on a dedicated node; simulcast + dynacast (stops encoding layers nobody watches) + adaptive stream; audio-only fallback; TURN over TLS 443; LiveKit Cloud as overflow | Calls stop competing with the API and survive weak networks. | 14.22, 15.4 |
| L11 | imgproxy (self-hosted, very fast) or Cloudflare image resizing; AVIF/WebP; `srcset`; lazy loading; EXIF/GPS stripped | Images are most of the bytes, and photos can leak the user's location. | 14.20, 16.5 |
| L12 | Queue and cron workers as separate processes, scaled independently | Sitemaps, feeds, reports and campaign fan-out to 1M users never slow the API. | 14.26 |

## 4. Principles used by high-traffic sites (also on modest servers)
1. **Static-first.** Render once and serve many times: edge cache plus Next.js 16 Cache Components/PPR, where the static shell is cached and small personal parts load separately.
2. **Cache in layers.** Every layer uses stale-while-revalidate and stale-if-error, and **collapses identical requests** (singleflight, `proxy_cache_lock`).
3. **Invalidate by tag**, instead of waiting for a TTL: a medicine price change purges `med-<id>` everywhere.
4. **Keep personal data out of shared caches.** Personal fragments (cart badge, name) are fetched client-side over a cached shell.
5. **Do less per request:** precompute, paginate, project only the needed fields, and index every query.
6. **Move slow work off the request path:** queues, outbox, separate worker processes.
7. **Protect the core:** rate limits, load shedding by priority, kill switches, a waiting room. Emergency and payment paths are never shed.
8. **Measure everything:** SLOs, real-user monitoring, load tests before launch, monthly capacity reviews.

## 5. How we will know the real numbers (14.2, 14.27)
- **Tool:** k6, run on staging with a copy of production data. Scenarios:
  - **load:** ramp to the expected peak and hold;
  - **stress:** ramp until p95 > 500 ms or errors > 0.5%;
  - **spike:** ×10 in 30 s;
  - **soak:** 4 h at moderate load.
- **Traffic mix:** browse, search, product, doctor, add to cart, checkout with the payment webhook (gateway double), booking, chat, call join, notification fan-out.
- **Targets to start with** (tightened after the first report):

| Target | Value |
|---|---|
| Cached page from the edge | TTFB < 150 ms |
| Public API at origin | p95 < 300 ms |
| Logged-in API | p95 < 500 ms |
| Checkout and booking | p95 < 800 ms; 0 lost orders; 0 duplicate charges |
| Error rate | < 0.5% |

- **Output:** `docs/perf/load-test-<date>.md`, with the measured ceiling per scenario, the first bottleneck, and the next scale step.

## 6. Scale-out steps (switch on when the metrics say so)
| Step | When (any of) | What |
|---|---|---|
| 1. Tuned single server | Now | X0, X11 and X12; Fastify; edge caching; micro-cache; Mongo cache sized; Redis split; workers separated |
| 2. Split stateful services | CPU > 70% sustained, or Mongo cache misses rising | MongoDB and Redis on their own server(s); LiveKit on its own server |
| 3. Horizontal API | p95 > 400 ms at peak after step 2 | 2+ API nodes behind a load balancer (OVH LB or Nginx); 3-node Mongo replica set; secondaries for reports |
| 4. Realtime tier | > 50–100k concurrent sockets | Centrifugo or a dedicated Socket.IO cluster |
| 5. Region resilience | Business need or regulation | Second region or KSA hosting (see Phase 19 on data residency); CDN-only degraded mode |

## 7. Device and network reality (feeds Phase 15)
- **Minimum OS for the apps today (Expo SDK 57):** iOS 16.4+ and Android 7+.
  - iPhone 7 and older cannot install the app. The store shows "incompatible", and the website remains available.
  - The plan adds a clear "update iOS / use the website" message.
- **Huawei phones without Google services** receive no FCM push, and Expo has no built-in HMS support. They need HMS Push Kit through a config plugin, or a fallback: in-app inbox, polling on open, and SMS/WhatsApp for critical messages (7E-N13).
- **Weak networks:** every request needs a timeout and backoff with jitter, honors `Retry-After`, and uses idempotency keys. The app shows cached data offline. Calls fall back to audio-only and then to chat (Phase 15).

## Sources
- Cloudflare: [all purge methods on all plans](https://developers.cloudflare.com/changelog/post/2025-04-01-purge-for-all/) · [Instant Purge](https://blog.cloudflare.com/instant-purge/) · [async stale-while-revalidate](https://developers.cloudflare.com/cache/changelog/) · [Origin Cache-Control](https://developers.cloudflare.com/cache/concepts/cache-control/) · [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/) · [Cache Reserve](https://developers.cloudflare.com/cache/advanced-configuration/cache-reserve/) · [Waiting Room](https://developers.cloudflare.com/waiting-room/) · [bots on Free/Pro/Business](https://developers.cloudflare.com/use-cases/solutions/stop-malicious-bots/) · [account takeover protection](https://developers.cloudflare.com/use-cases/solutions/stop-account-takeover-attacks/)
- Nginx micro-caching: [nginx blog](https://blog.nginx.org/blog/benefits-of-microcaching-nginx) · [GetPageSpeed guide](https://www.getpagespeed.com/server-setup/nginx/nginx-proxy-cache-microcaching)
- Next.js 16 Cache Components/PPR: [nextjs.org/blog/next-16](https://nextjs.org/blog/next-16) · multi-instance cache handlers: [next-shared-cache](https://github.com/caching-tools/next-shared-cache), [known issue #99288](https://github.com/vercel/next.js/issues/99288)
- Fastify vs Express with NestJS: [Encore comparison](https://encore.dev/articles/nestjs-vs-fastify) · [Java Code Geeks](https://www.javacodegeeks.com/2024/08/nestjs-http-adapters-express-vs-fastify.html)
- BullMQ requires `noeviction`: [BullMQ going to production](https://docs.bullmq.io/guide/going-to-production) · [Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- Cache stampede patterns: [Redis cache stampede](https://oneuptime.com/blog/post/2026-01-21-redis-cache-stampede/view)
- Load shedding in Node: [overload-protection](https://github.com/davidmarkclements/overload-protection)
- MongoDB sizing and pools: [WiredTiger cache](https://oneuptime.com/blog/post/2026-03-31-mongodb-wiredtiger-cache-size/view) · [Node driver pools](https://github.com/mongodb/docs-node/pull/1067/files)
- Search: [Meilisearch language support](https://meilisearch.com/docs/learn/resources/language) · [Meilisearch vs Typesense](https://www.meilisearch.com/docs/resources/comparisons/typesense)
- Realtime: [Centrifugo](https://centrifugal.dev/)
- Calls: [LiveKit benchmarking](https://docs.livekit.io/transport/self-hosting/benchmark/) · [LiveKit production guide](https://fazliev.com/blog/livekit-production-guide)
- Images: [imgproxy](https://imgproxy.net/)
- Web: [Speculation Rules](https://developer.chrome.com/docs/web-platform/prerender-pages)
- Mobile: [FlashList v2 on Expo](https://reactnativerelay.com/article/react-native-flashlist-v2-expo-high-performance-lists-migration) · [Expo SDK 57](https://expo.dev/changelog/sdk-57) · [Huawei push with Expo](https://medium.com/@contact.richet.maxime/react-native-hms-core-with-expo-7192acc52a24)
- Offline-first: [TanStack Query mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- Load testing: [k6 guide](https://oneuptime.com/blog/post/2026-02-02-k6-load-testing/view)
- OVH anti-DDoS: [OVHcloud Bare Metal 2026](https://itbrief.co.uk/story/ovhcloud-unveils-bare-metal-2026-servers-with-amd-chips)
