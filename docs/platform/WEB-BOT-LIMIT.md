# Unknown crawlers on the catalogue pages: the nginx limit (2026-11-14)

## What happened
Sentry (production, 24 h) had one open problem: `PublicDataUnavailableError: public data unavailable: product` on `GET /[locale]/p/[slug]`, 59 occurrences, escalating. The pages are already built to survive an API outage (ISR with stale-if-error: a page that was rendered once keeps its last good copy; a page that was never rendered answers the translated "unavailable" 503, never cached, and is reported to Sentry as one warning per path). What fails is the FIRST render of a slug: it needs one API read, and a crawler asking for thousands of `/p/<slug>` and `/c/<category>` pages multiplies that, exactly while mongod is being killed. Before this change the patient web server block (`deploy/nginx/conf.d/nabd-web.conf`) had no request limit at all.

## The rule (in the repo, applies on the next nginx reload)
`deploy/nginx/nginx.conf` (http level) and `deploy/nginx/conf.d/nabd-web.conf`:
- Only the catalogue pages are limited: `^/(ar|en|ur|hi|bn|fil|tl)/(p|c)/`.
- Only **unknown automated clients** count. A request is "automated" when its User-Agent contains `bot`, `crawl`, `spider`, `scrap`, `python-requests`, `curl/`, `wget/`, `go-http-client`, `okhttp`, `java/`, `axios`, `headlesschrome` and similar. The well-known search and preview bots (Googlebot, Bingbot, DuckDuckBot, Applebot, Yandex, Baidu, Facebook, Twitter, LinkedIn, WhatsApp, Telegram, Slack) are matched first and are **not** limited by this rule. People (browser User-Agents) are never limited by it.
- Limit: **30 requests a minute per client address, burst 10**, then HTTP 429.
- The client address is `CF-Connecting-IP` (Cloudflare is in front, so `$remote_addr` is Cloudflare's own address; using it would put every visitor of one edge server in the same bucket), falling back to `$remote_addr` when the header is absent.
- Nothing is paid for and nothing is added to the server.

## Apply it
On the server, with the deploy scripts as usual: `docker exec nabdah-nginx nginx -t` and, if it says ok, `docker exec nabdah-nginx nginx -s reload`. To roll back, revert the two files and reload.

## Known limits (honest)
- A bot can lie about its User-Agent (a fake "Googlebot" is not limited, a bot that sends a browser User-Agent looks like a person). This rule stops the lazy crawlers that identify themselves, which is what the logs of an outage usually show; it is not a replacement for Cloudflare's own bot handling.
- To find who is asking, count the `429` answers per client address on these paths in the nginx log after the reload (names and counts only).
- A second layer can be added in Cloudflare (a rate-limiting rule on the same path pattern); check what the current Cloudflare plan allows before relying on it.
