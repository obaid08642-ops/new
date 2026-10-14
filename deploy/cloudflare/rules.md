# Cloudflare rules (P14.1, P14.6, P14.9, P14.19)

These rules mirror what nginx already enforces at the origin (`deploy/nginx`), so the edge stops abuse before it
reaches the server. **Not applied yet: BLOCKED**, because there is no Cloudflare API token in the repo or CI. The owner
applies them in the dashboard (Security → WAF; Caching → Cache Rules), or adds a token scoped to *Zone WAF Edit* and
*Cache Rules Edit* as a CI secret, so they can be applied and diffed from here.

Expressions use the Cloudflare Rules language. The cookie names are the web session cookies
(`patient-web/lib/security/csp.ts`: `nabd_access`, `nabd_refresh`).

## Cache rules: anonymous HTML at the edge (P14.1, P14.9)

| # | Name | When | Then |
|---|---|---|---|
| C1 | Never cache signed-in visitors | `http.cookie contains "nabd_access=" or http.cookie contains "nabd_refresh=" or any(http.request.headers["authorization"][*] ne "")` | Bypass cache |
| C2 | Never cache actions | `starts_with(http.request.uri.path, "/api/") and http.request.method ne "GET"` | Bypass cache |
| C3 | Never cache private pages | `http.request.uri.path matches "^/(ar\|en\|ur\|hi\|bn\|fil)/(cart\|orders\|payments\|appointments\|consultations\|dashboard\|profile\|settings\|notifications\|prescriptions\|reports\|insurance\|family\|wishlist\|loyalty\|returns\|chat\|room\|login\|register\|otp\|oauth\|password-reset\|forgot-password\|onboarding)"` | Bypass cache |
| C4 | Public pages and public API | everything else on `nabd.plus`, `www.nabd.plus`, `api.nabd.plus` | Eligible for cache; **respect origin Cache-Control** (`@PublicCache` sends `public, s-maxage=300, stale-while-revalidate=60, stale-if-error=86400`; everything else is `private, no-store`). Serve stale while the origin is down: on. |

The origin decides what is cacheable (default `private, no-store`, P14.7). These rules only add a second lock for
signed-in traffic. Purge by `Cache-Tag` comes from the purge bus (P14.8) once the token exists.

## Rate limiting (P14.6)

Same numbers as the nginx zones (`deploy/nginx/nginx.conf`), counted per IP at the edge:

| # | Name | When | Rate | Action |
|---|---|---|---|---|
| R1 | Auth and OTP | `http.request.uri.path matches "^/api/v1/auth/(login\|register\|send-otp\|verify-otp\|social-login)"` | 10 per minute | Block 10 min |
| R2 | Search | `http.request.uri.path matches "^/api/v1/(search\|medicines/autocomplete)"` | 20 per second | Managed challenge |
| R3 | Checkout and payment writes | `http.request.uri.path matches "^/api/v1/(payments/(intent\|verify\|retry)\|patient/pharmacy/orders/[^/]+/(submit\|offers/[^/]+/select)\|cart/checkout)"` | 2 per second | Block 1 min |
| R4 | Everything else on the API | `http.host eq "api.nabd.plus"` | 500 per second | Block 1 min |

## WAF and bots (P14.6)

| # | Name | When | Action |
|---|---|---|---|
| W1 | Managed rules | Cloudflare Managed Ruleset + OWASP Core Ruleset (paranoia 1) | Default |
| W2 | Bots on sign-in and OTP | `cf.bot_management.score lt 30 and http.request.uri.path matches "^/api/v1/auth/"` (Bot Management plan), or Bot Fight Mode on the free plan | Managed challenge |
| W3 | Payment webhooks pass | `http.request.uri.path matches "^/api/v1/(webhooks\|payments/webhook)"` | Skip W1, W2 and R4: the gateway's servers must not be challenged; the backend checks the signature and fails closed |

## Waiting room (P14.19)

Decision (SCALING.md): none until a campaign needs one. When needed, either a Waiting Room on `/(ar|en|…)/checkout*`
(Business plan, an owner decision) or a Worker that issues a queue token in front of checkout only. Load shedding
(P14.17) already keeps checkout up when the API is busy.

## Alerting

Notifications → *HTTP DDoS Attack Alert* and *Security Events Alert* (spike on R1–R3) to the ops e-mail.
