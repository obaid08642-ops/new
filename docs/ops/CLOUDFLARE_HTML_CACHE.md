# Cloudflare cache rule for the public HTML (issue 1548)

Production served every page `cache-control: private, no-cache` with `cf-cache-status: DYNAMIC`: Cloudflare kept nothing, so
every first visit to a product page waited for a render at the origin (TTFB 3.0 s). Since issue 1548 the origin
(`patient-web/server/nonce-server.mjs`) answers a **guest's** request for a public static/ISR page with

```
cache-control: public, max-age=0, s-maxage=<Next's revalidate>, stale-while-revalidate=<…>, stale-if-error=31536000
```

and no `Set-Cookie`. This file is the edge side. The build session applies it.

> **Status 2026-10-27 (owner: cache everything public).** The rule below is applied by `tools/ops/cf/46-public-html-cache-{check,apply}.sh`
> (one named rule, respect origin, anonymous GET only; the apply task proves MISS then HIT with the same bytes and CSP, every inline script of
> the cached copy matching a CSP hash, no Set-Cookie, no HIT for a session/theme cookie, Authorization, RSC or private page, and puts the old
> rules back on any failure). Decision: the hash-based copy (this file, "No nonce in the cached copy"), not the Worker of `docs/ops/edge-html.md`:
> the origin already sends it, nothing runs at the edge, no per-request compute, no shared nonce. The Worker (edge mode) stays available and unused.
> Shared pages carry `Cache-Tag: html, medicines|doctors|articles` (`htmlCacheTags` in `patient-web/server/nonce-server.mjs`), so the purge bus
> (`medicines` on catalogue/price/stock edits, `doctors` on availability edits) empties the edge copy as well as the API answers.
> Images and the wider public read API: `tools/ops/cf/47-public-assets-api-cache-*.sh`. Measure with `tools/perf/edge-cache-timing.sh`.

## Which pages the origin marks shareable

Only when **all** of these hold (anything else is `private, no-cache` or `no-store`):

- the path is a public page that Next renders static/ISR: `/{locale}`, `/{locale}/c/...` (no `?q=`/`?page=`; those go to
  the dynamic `/q/` twin and stay uncached), `/{locale}/p/{slug}`, `/{locale}/doctor/{slug}`, `/{locale}/doctors/...`,
  `/{locale}/consultations/doctors` (unfiltered), `/{locale}/articles`, `/{locale}/articles/{slug}`;
- `GET`, status 200;
- no session cookie (`nabd_access`, `nabd_refresh`): the proxy answers a session `no-store`;
- no theme cookie (`nabd.theme`): a page that carries the visitor's chosen theme on `<html>` is that visitor's.

Pages that act (cart, checkout, sign-in, OTP, orders, payments, booking, prescriptions, every signed-in screen) are
`no-store` and never cached. The live journey `tools/live/j_web_public_cache.py` checks all of this.

## The rule

Cloudflare dashboard, zone `nabd.plus`, **Caching > Cache Rules > Create rule**, name `Public HTML (issue 1548)`, placed
**first**:

When incoming requests match (expression editor):

```
(http.host eq "nabd.plus" or http.host eq "www.nabd.plus")
and http.request.method eq "GET"
and (
  http.request.uri.path matches "^/(ar|en|ur|hi|bn|fil)/?$"
  or http.request.uri.path matches "^/(ar|en|ur|hi|bn|fil)/(c|p|doctor|doctors|articles)(/.*)?$"
  or http.request.uri.path matches "^/(ar|en|ur|hi|bn|fil)/consultations/doctors/?$"
)
and not http.cookie contains "nabd_access="
and not http.cookie contains "nabd_refresh="
and not http.cookie contains "nabd.theme="
and not http.request.uri.query contains "_rsc="
and not any(http.request.headers["rsc"][*] eq "1")
```

(`matches` needs a Business plan or above; on Pro use `starts_with` per prefix plus `eq` for the home paths.)

Then:

- **Cache eligibility:** Eligible for cache.
- **Edge TTL:** *Use cache-control header if present, bypass cache if not* (the origin's `s-maxage` is the TTL: 60 s for
  Home and the doctors list, 600 s articles, 3600 s catalogue, product and doctor pages).
- **Browser TTL:** *Respect origin* (`max-age=0`: the browser always revalidates with the edge).
- **Serve stale content while revalidating:** on (honours `stale-while-revalidate`).
- **Cache key:** keep the **query string** (`?q=` lists are other pages); do not add cookies or headers to the key. The RSC
  payload of a client navigation (`?_rsc=…`, header `RSC: 1`) is excluded above: Next varies it on router-state headers
  that a cache key on the URL cannot see, so it stays with Next's own cache.
- **Origin error page pass-thru / Always Online:** leave Cloudflare's default; `stale-if-error` in the origin header makes
  the edge keep serving the last good copy when the origin answers 5xx or is unreachable (owner decision #302, public
  pages only).

A second rule, **after** it, name `No cache for everything else`, matching `http.host eq "nabd.plus"` with *Bypass cache*,
makes sure no other HTML is ever kept even if a header were wrong.

## No nonce in the cached copy (owner decision 2026-10-16: never a shared nonce)

A guest's shareable copy carries **no nonce**. Its CSP is hash-based: `script-src 'self' 'strict-dynamic' 'sha256-…'…`, one
hash per inline `<script>` of that exact copy, and no `'unsafe-inline'`. The hashes are computed by the nonce server from the
bytes it sends (`hashedPage` / `policyWithHashes` in `patient-web/server/nonce-transform.mjs`), not at build time: Next's
inline flight scripts carry the page's data and change on every ISR revalidation, so build-time hashes would not match the
served copy. Each `<script src>` tag is replaced, in the same place, by an inline loader that inserts the same script (trusted
through `'strict-dynamic'`); all loaders have the same text, so they share one hash. They stay in place because Next 16.4's
bootstrap breaks (`Invalid URL`, the page never hydrates) when the runtime chunk is started before the inline
`TURBOPACK.push(...)` script that follows it. `<link rel=preload as=script>` hints are dropped, and `<link rel=preload as=script>` hints are dropped. Signed-in and action pages (cart,
checkout, sign-in, booking, orders, payments, any request with a session) keep a fresh per-request nonce and `no-store`.

Stricter alternative already supported: **edge mode**. Set `NABD_EDGE_STAMP_TOKEN` on the origin and run a Worker on these
paths that sends `x-nabd-edge-stamp: <token>`, caches the unstamped answer (placeholder nonce) and replaces
`nabdCspNoncePlaceholder0000` in the CSP header and the HTML with a fresh nonce on every response. When the token is set
the origin stops sending the shareable header to anyone else.

## Purging

A price or text change shows after at most the `s-maxage` of the page (product 1 h). For an urgent change purge by URL
(`/{locale}/p/{slug}` for each locale) or by prefix in **Caching > Configuration > Purge cache**.

## Warming the origin (first visit to a product)

Most of the 21k product pages are rendered on their first request. The origin can render the most-visited ones into
its ISR cache when it starts: set on the patient-web container

```
NABD_WARM_TOP_PRODUCTS=300     # how many (the public search with no term is ordered by usage_count), max 1000
NABD_WARM_LOCALES=ar,en        # which locales
```

The nonce server asks Next for `/{locale}`, `/{locale}/c` and those product pages, two at a time, after it starts
(`patient-web/server/warm-public.mjs`); the log line `nonce-server: warmed N public pages` reports the result.

## Check after applying

```
curl -sI -H 'accept: text/html' https://nabd.plus/ar/c | grep -iE 'cache-control|cf-cache-status'
# twice: the second shows cf-cache-status: HIT
curl -sI -H 'accept: text/html' -H 'cookie: nabd_access=x' https://nabd.plus/ar/c | grep -iE 'cache-control|cf-cache-status'
# no-store, cf-cache-status: BYPASS or DYNAMIC
curl -sI https://nabd.plus/ar/cart | grep -iE 'cache-control|cf-cache-status'   # no-store, DYNAMIC
```
