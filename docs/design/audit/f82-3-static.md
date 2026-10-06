# F82-3: public pages static/ISR (patient-web), design, measurements and findings

Branch `design/f82-3-static`, from `main` at `f203a333` (#301 hash/edge-nonce CSP and #302 stale-if-error are in). Plan: `docs/review/F82_PERFORMANCE_PLAN.md`. Earlier step and why it was blocked: `audit/f82-1-web.md`.

## What is static now, what is not (`next build`, webpack)

`●` = prerendered/ISR (opts in with `generateStaticParams`, returns `[]`: nothing is rendered at build, so the build needs no backend; the first request renders and caches). Everything else under `/[locale]` is `ƒ` (264 routes, unchanged), because a route with a dynamic segment and no `generateStaticParams` is dynamic: **a new private page is dynamic without being touched**, and a test fails if a page that opts in is not one the proxy marks public.

| Route | Rendering | revalidate | Notes |
|---|---|---|---|
| `/[locale]` (Home) | `●` ISR | 60 s | same window as its public reads (config, home content, doctors) |
| `/[locale]/c/[[...category]]` | `●` ISR | 3600 s | page 1 without a search; `?page=`/`?q=` go to the dynamic twin |
| `/[locale]/p/[slug]` | `●` ISR | 3600 s | product read window is 1 h |
| `/[locale]/doctor/[slug]` | `●` ISR | 3600 s | |
| `/[locale]/doctors/[specialty]/[city]` and `/[neighborhood]` | `●` ISR | 3600 s | |
| `/[locale]/consultations/doctors` | `●` ISR | 60 s | unfiltered list; `?q=`/`?specialty=`/`?sort=` go to the twin |
| `/[locale]/articles`, `/[locale]/articles/[slug]` | `●` ISR | 600 s | the three reads were `force-cache` (kept forever, a static page would never see an edit); now 600 s |
| `/[locale]/unavailable` | `●` prerendered (6 languages) | no data | what the nonce server answers with when a public page failed with no cached copy |
| `/[locale]/q/c/...`, `/q/consultations/doctors`, `/q/articles` | `ƒ` dynamic | none | the twins; noindex; reached only by rewrite |
| sign-in/up, otp, password, welcome, onboarding, dashboard, cart, checkout, payments, orders, prescriptions, notifications, wishlist, profile, settings, health, family, insurance, pharmacy flows, appointments, consultations (except the list), diagnostics (all), AI, community, ... | `ƒ` dynamic | | private CSP path (per-request nonce, `no-store`), unchanged |
| public pages **not converted**: `/consultations/doctors/[doctorId]` (slots, `no-store` by design), `/doctor/[slug]/[city]` (the proxy does not classify it public: it carries `noindex` today, see Needs review), `/condition`, `/facility`, `/pharmacies/[city]`, `/home-nursing/[city]`, `/services`, `/radiology`, `/labs`, `/map`, `/voice`, `/nursing/catalog`, `/medicine-catalog`, `/diagnostics/labs`, `/diagnostics/radiology` | `ƒ` dynamic | | not in the owner's list; the entity-graph ones are the same one-file change as the doctor pages, the ones that read `searchParams` need a twin (the pattern is in `lib/security/query-twin.ts`) |

## How

- **Root layout.** `app/layout.tsx` read `x-next-intl-locale` (`headers()`), which made every page dynamic. `app/[locale]/layout.tsx` is now the root layout (`<html lang dir>` from the locale segment). It reads no cookie and no `x-nonce`.
- **Per-user parts on the client.** `lib/auth/session-identity.ts`: one shared in-memory store, **one** `GET /api/auth/session` per page load (`no-store`), reset on sign-in/sign-out. Users of it: the layout's `SessionActions` and `PresenceBeacon`, the Home top bar (`components-next/home/home-identity.tsx`: Home link target, bell, sign-out, avatar, sign-in), the phone tab bar, and `NavLink` for `/diagnostics` only. Nothing else asks (no cart request). Neutral state of the static HTML: the public Home link, no bell, and an **invisible stand-in with the size of the sign-in button** (`visibility: hidden`, `aria-hidden`), so an anonymous visitor sees no shift and the stand-in is never a paint candidate. A signed-in visitor gets bell/sign-out/avatar after the answer. The dashboard (rendered per request, knows the session) passes `signedIn` and renders as before.
- **Theme script, no nonce in React.** The CSP allows the inline theme script by its sha256 (`THEME_SCRIPT_HASH`, computed from `THEME_INIT_SCRIPT`), so the layout needs no nonce for it on any page (public cached HTML or private). The nonce server still stamps every `<script>`/`<style>` of public HTML; the policy keeps `'nonce-…' 'strict-dynamic'`, no `'unsafe-inline'`, no `'unsafe-eval'`.
- **A public page with a session cookie** takes the same stamping path (it is the same cached HTML; a per-request nonce in the header would match none of its scripts) and is answered `no-store`. Private pages are untouched.
- **Search and page number.** `searchParams` makes a page dynamic, so each list (`c`, doctors, articles) is one view with two routes: the static page (no `searchParams`) and a dynamic twin under `/q/...`, reached by a **config rewrite** (`next.config.ts`, `beforeFiles`, `has` on a non-empty `page`/`q`/`specialty`/`sort`/`category`); `utm_*` and the like never leave the static page. It is a config rewrite and not a rewrite made in `proxy.ts` because Next takes an absolute middleware rewrite for an external one and proxies it whenever the server is bound to an IP address (`HOSTNAME=127.0.0.1`, as behind the nonce server, or `0.0.0.0`, the standalone default): found on the first build, the self-proxy even looped on the header rewrite. The twins are noindex, canonical to the static page.
- **Outage (#302).** A failed read (no answer, 5xx) **throws** (`PublicDataUnavailableError`) instead of rendering an empty list, a not-found or an error page, so Next keeps the last good copy and never caches the failure. With no copy at all Next answers 5xx; the nonce server then asks for the same URL again with `x-nabd-unavailable: 1`, a config rewrite serves the translated unavailable page, and it is sent as **503, `Retry-After: 30`, `no-store`, noindex**, with its own nonce, at the address that was asked for (a reload retries the real page). Verified on a cold server, see below.
- **`StaleWhileRevalidate`.** `Date.now()` on a static page is the generation time of the cached copy. It now takes the page's `revalidate` window (`maxAgeSeconds`): a copy younger than the window stays, an older one (served stale, or held by the router cache) is revalidated once. Pages rendered per request keep the 5 s default.
- **Per-route client messages.** `lib/i18n/client-messages.ts` has `ROUTE_GROUP_NAMESPACES` (empty) and `pickRouteMessages`, and `components-next/route-messages.tsx` wraps a group's layout in a provider with the base namespaces plus the group's. A test fails if a client component outside the group's folders reads a group-only namespace. Batch 1's pharmacy namespaces (~36 KB) can be registered with one entry.
- **Nonce server** (`server/nonce-server.mjs`, the reviewer's file): the 503 fallback above; keeps a `no-store` set by the proxy; stamps the script preload of a build-time prerendered page; **edge mode** (off unless `NABD_EDGE_STAMP_TOKEN` is set): a request with `x-nabd-edge-stamp: <token>` comes from an edge worker that stamps the nonce itself, so the page is sent unstamped with the placeholder policy and Next's `s-maxage` + `stale-while-revalidate` plus `stale-if-error`; everyone else is stamped here and is `private, no-cache`. And the compression fix (below).

## Origin headers (what an edge can honour)

Observed on the production build, from Next on its internal port:

| Page | `Cache-Control` from Next |
|---|---|
| `/ar` | `s-maxage=60, stale-while-revalidate=31535940` |
| `/ar/c`, `/ar/p/x` | `s-maxage=3600, stale-while-revalidate=31532400` |
| `/ar/consultations/doctors` | `s-maxage=60, ...`; articles `s-maxage=600, ...` |
| `/ar/unavailable` (direct) | `private, no-cache, no-store` |

Through the nonce server (the default): `private, no-cache` (the HTML holds a nonce, so **no shared cache may keep it as it stands**, #301). So the origin headers are right for an edge only in edge mode, which needs the edge worker that stamps the nonce (the reviewer's F82-3 ops; not written here). Cloudflare rules, the worker and the cache keys are not part of this PR. Things the rules must know: sessions (`nabd_access`/`nabd_refresh`) bypass the cache (the proxy sends `no-store` for them); the HTML carries `Vary: rsc, ...` and the RSC payload is requested with `?_rsc=`, so the query string must stay in the cache key; every page response carries `Set-Cookie: NEXT_LOCALE=<locale>` from next-intl (not user data; strip it on cached pages or set `localeCookie: false`, a routing decision I did not make).

## Measured (production build, webpack, local; Lighthouse 12 mobile, simulated 4G, CPU x4)

Machine shared with other builds, so the noise is large: **A-B-A-B**, 3 runs per block, **median of 6** (A = main `f203a333`, B = this branch), spread = min to max of the 6. Seeded backend through the fault proxy (`pass`), 60 s Home window; `/ar/pharmacy` redirects to `/ar/c` (the seeded catalogue is empty, so it is the empty category page). `/ar/p/test-product` reads a stand-in product from a stub that I wrote for this check (**test data**: the seeded catalogue has no products); it is on both sides.

### Behind a compressing proxy (what a visitor behind Nginx sees; comparable to the F82-1/F82-2 numbers)

A small gzip front stands in for Nginx. TTFB is Lighthouse's `server-response-time` of the cached page.

| Route | | LCP | TBT | CLS | Script (gz) | TTFB |
|---|---|---|---|---|---|---|
| `/ar` | main | 3794 ms (3722-3855) | 238 ms | 0.000 | 260.2 KB | 36 ms |
| | branch | 3809 ms (3713-4088) | 213 ms | 0.000 | 259.4 KB | **12 ms** |
| `/ar/pharmacy` (to `/ar/c`) | main | 5180 ms (5045-5386) | 246 ms | 0.083 | 265.5 KB | 93 ms |
| | branch | 4976 ms (4963-4986) | 146 ms | 0.083 | 266.4 KB | **39 ms** |
| `/ar/consultations/doctors` | main | 2740 ms (2201-4026) | 165 ms | 0.000 | 263.6 KB | 33 ms |
| | branch | 3186 ms (2007-3824) | 206 ms | 0.000 | 263.1 KB | **14 ms** |
| `/ar/c` | main | 3913 ms (2758-4009) | 193 ms | 0.000 | 265.3 KB | 34 ms |
| | branch | 3740 ms (2759-3897) | 196 ms | 0.000 | 266.5 KB | **13 ms** |
| `/ar/articles` | main | 2939 ms (2163-3897) | 136 ms | 0.000 | 262.8 KB | 29 ms |
| | branch | 2685 ms (2276-3731) | 198 ms | 0.000 | 261.7 KB | **11 ms** |
| `/ar/p/test-product` | main | 3895 ms (3260-4434) | 151 ms | 0.000 | 267.4 KB | 37 ms |
| | branch | 3762 ms (3739-4139) | 218 ms | 0.000 | 266.9 KB | **12 ms** |

**LCP did not move** (differences inside the spread; the bimodal 2.0-2.8 s / 3.7-4.0 s runs on doctors, categories and articles are the same on both sides). That is what `audit/f82-1-web.md` said it would be: in the simulation LCP is bound by the JavaScript the page fetches (React DOM, the Next client, ~260 KB script here with headers), not by the server. What static/ISR changes is the server side: TTFB of the cached document 2.5 to 3 times lower on this machine (a local backend; against `api.nabd.plus` the render it removes is longer), and the HTML can be cached at the edge. TBT differences are noise (146 to 246 ms on both sides). The LCP element is the sign-in link on `/ar` on both sides (the stand-in is hidden, then the real link paints at the same moment as before). **The CI gate was not ratcheted** (see below).

### Straight through `server/nonce-server.mjs` (what the CI Lighthouse job sees) and a finding

`server/nonce-server.mjs` deleted `Accept-Encoding` on every upstream request, so **everything behind it, the HTML and every `/_next/static` asset, went out uncompressed**. Lighthouse straight through it (main and branch alike):

| Route | main LCP | branch LCP (before the fix) | script (both) |
|---|---|---|---|
| `/ar` | 7498 ms | 7607 ms | 794 KB |
| `/ar/pharmacy` | 9051 ms | 8971 ms | 804 KB |
| `/ar/consultations/doctors` | 6780 ms (4254-7572) | 4853 ms (4841-7364) | 800 KB |
| `/ar/c` | 7641 ms | 7666 ms | 804 KB |
| `/ar/articles` | 7017 ms (4112-7351) | 7325 ms (4835-7357) | 797 KB |
| `/ar/p/test-product` | 7628 ms | 7635 ms | 809 KB |

(median of 6, A-B-A-B). So the CI `lighthouse` job fails its 2500 ms LCP assertion on every route whatever this PR does, and has since #301. Production is not affected only because Nginx compresses on the way out. **Small fix, its own commit (the file is the reviewer's):** pages (stamped or not) are gzipped on the way out, streaming and flushed per chunk; hashed assets and images keep their `Accept-Encoding`, so Next's compression passes through untouched; tested (`tests/nonce-server.test.ts`). With it, straight through the nonce server, branch build, median of 6 (F1/F2): `/ar` 3823 ms, `/ar/pharmacy` 4939 ms, doctors 2798 ms, `/ar/c` 3676 ms, `/ar/articles` 2746 ms, `/ar/p/test-product` 3747 ms, script 252-259 KB: the same as behind the gzip front.

### `.lighthouserc.json`

LCP 2500 ms **not changed** (and not ratcheted to 1800): even with the compression fix only doctors (2.8 s) and articles (2.7 s) come near 2.5 s, `/ar` is 3.8 s, `/ar/pharmacy` 4.9 s. No budget raised, no route removed.

## Failure behaviour (observed on the production build, cold copy, backend through the fault proxy)

| Step | Result |
|---|---|
| cold server, backend `error`, `/ar` | **503**, translated unavailable page (`ar`; `/ur/c` in Urdu; `/en` in English), `Retry-After: 30`, `no-store`, noindex, own nonce, gzip |
| backend back, `/ar` | 200, `x-nextjs-cache: MISS`, then cached |
| backend `error` again, 70 s later (window expired) | first request `STALE` (the good page), background regeneration throws (15 logged errors), then `HIT`: **the last good copy is kept** |
| another cold path while down (`/ar/p/other`) | 503 (no copy) |

## CSP and cache checks in a browser (production build, nonce server, Playwright, 390 px)

- `/ar`, `/en`: 0 `style=` attributes in the HTML, 0 inline scripts without a nonce, 0 console errors, 0 CSP violations, theme applied, **one** `/api/auth/session` request. Signed in (cookies from a real login): the same cached HTML, `sign in` link gone, dashboard and profile links present, **one** heartbeat, `no-store` on the response. HTML with and without the cookie is byte-identical except for the nonce (compared).
- Private pages (`/ar/login`, `/ar/cart`, `/ar/dashboard`): their own per-request nonce, `no-store`, noindex, 0 console errors; the only script without a nonce is the theme script (allowed by hash).
- Category, product, doctors, articles: 21, 26, 22 and 18 refused inline `style=` attributes (legacy markup). **Identical on main** (21, 22, 18 measured there): Batch 1 and 2 own them.
- `/ar/unavailable` first showed one refused `<link rel=preload as=script>` (prerendered at build, no policy to read); fixed in the nonce server, 0 errors after.
- CLS in a real browser: 0.079 once in a few loads of `/ar` from the footer (t ≈ 80 ms), **also on main** (same run, same value); 0.000 on most loads. Lighthouse reports 0.000 (0.083 on `/ar/c`, the Batch 1 streaming issue noted in F82-1).

Runtime check against the seeded backend (`audit/runtime-f82-3-static.md`): 15 Batch 0 routes x normal/empty/error = **45 runs, 0 issues**, 0 console errors. Note the Home "error" scenario now shows the cached page (stale-if-error) and not the ErrorState; the ErrorState (as the 503 page) shows only with no copy, as tested above.

## Identity check

Identity check: no new colours/logo/patterns. `git diff origin/main -- packages/design-tokens/tokens.json` is empty; the only CSS added is `.identityPending { visibility: hidden }`. `client-token-sync` 918 (baseline 918), `no-raw-color` 8738 (8738), `no-literal-ui-string` 6460 (6460; no UI text added: the unavailable page uses the existing `HomeWeb` keys, translated in all six languages), `no-left-right` 526, `no-px-font-size` 256, `no-emoji-in-ui` 47, `no-large-raster` 0, `locale-parity` no new problem. Baselines only had three paths renamed (page.tsx moved to `*-view.tsx`).

## Needs review (found here, not fixed here)

1. **CI Lighthouse path** (above): the nonce server compressed nothing; the fix is in this PR as a separate commit for the reviewer to accept or replace (e.g. a compressing front in the job).
2. **Edge caching needs an edge worker that stamps the nonce.** The nonce server's edge mode is the origin half; the worker, the shared secret, the Cloudflare rules (bypass on the session cookies, `?_rsc=` and query in the cache key, strip `Set-Cookie: NEXT_LOCALE`) are F82-3 ops.
3. **Plain `next start` is no longer usable in production** for the static pages (they carry no nonce; the browser refuses their scripts). Production (Docker `CMD`) and the Lighthouse job already start through the nonce server; `instrumentation.ts` now warns when a production server does not. `patient-production-ci.yml` runs plain `next start` for `runtime-contrast.mjs` (computed styles, not scripts, so it should be unaffected, not run here).
4. **`/doctor/[slug]/[city]`** is not classified public by `proxy.ts` (`doctor\/[^/]+` has one segment), so it is served `noindex` while its metadata says `index: true`; I left it dynamic and unclassified. Widening the regexp is a one-line SEO decision for the owner.
5. **Unbounded ISR keys.** `/p/<any slug>` and `/c/<any path>` each create a cache entry, 404s included. Next answers HTTP 200 with a noindex meta for a not-found page (the same on main: `loading.tsx` streams after the headers), so a not-found is a cacheable 200. Limit at the edge (cache only 2xx, rate-limit) or by an allow-list of slugs from the sitemap.
6. **Product, category, doctors and articles pages still use inline `style=`** that the CSP refuses (21 to 26 per page, same on main), and the category page still has literal Arabic/English text (Batch 1, 2 and the translation rule).
7. **Freshness.** Product and category data are cached 1 h (the existing read window), so a price or availability change shows up to an hour late at the origin; on-demand revalidation by tag when the admin changes data is not wired.
8. **Register screen** still makes its own `/api/auth/session` request (it needs the `user`), so it makes two on that page.
9. **`/` and `/dashboard` ErrorState (#292):** the public Home no longer renders it (it throws; the 503 page carries the same text and retry). The dashboard keeps its own, per request.

## What could not be measured

Edge TTFB (no edge here), INP, a real Android over 4G, repeat visits and the service worker, TTFB against `api.nabd.plus` (local backend), `/p/[slug]` with real catalogue data (a stub with one invented product was used, labelled test data), cold-start (first request) latency under load, and the CI job itself (its numbers were reproduced locally by serving the same build straight through the nonce server).

## Gates

`cd patient-web && npx tsc --noEmit`: exit 0; `npx vitest run`: 197 files / 753 tests passed (14 files / 23 tests skipped as before); F68 acceptance (`vitest.acceptance.config.ts acceptance/f68`): 41/41, untouched; `cd packages/design-tokens && npm test`: exit 0; `node tools/design/sync-ui-components.mjs --check`: 34 mirrored files up to date; production build (`NODE_ENV=production npx next build --webpack`): exit 0, route table above; `screen-inventory.mjs --check`: current (regenerated; unresolved calls 0/0).
