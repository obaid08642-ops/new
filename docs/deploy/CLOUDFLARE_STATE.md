# Cloudflare state — nabd.plus

Last updated: 2026-10-03. Zone plan: Free. Registrar: Spaceship. Nameservers: pedro/walk.ns.cloudflare.com.
Context: REVIEW_P7R_TO_P12.md (X0), docs/audit/02_AGENT_EXECUTION_PLAN.md (16.13, 7C-C10, 14.9).
No secrets, tokens or personal emails belong in this file (public repo).

## Applied via API (verified)

### A. Cache (X0 fix) — phase `http_request_cache_settings`
Order matters: later matching rules override earlier ones, so bypass rules are last.

| Rule | Expression | Action | State |
|---|---|---|---|
| Medicines Public Cache | `GET` and path starts `/api/v1/medicines` | cache 300 s (override origin) | disabled |
| Labs Services Cache | `GET` and path starts `/api/v1/lab-services` | cache 900 s (override origin) | **disabled** (2026-10-03) |
| Radiology Services Cache | `GET` and path starts `/api/v1/radiology` | cache 900 s (override origin) | disabled |
| Care Services Cache | `GET` and path starts `/api/v1/care/services` | cache 900 s (override origin) | **disabled** (2026-10-03) |
| Patient Web 6-Langs Cache | `GET` and path starts `/ar/ /en/ /ur/ /hi/ /bn/ /fil/` | cache 600 s | disabled |
| Static: /_next/static long cache | path starts `/_next/static/` | cache, edge 1 year, browser = origin | enabled |
| Bypass: API + _next/data | host `api.nabd.plus` or path starts `/api/` or `/_next/data/` | bypass cache | enabled |
| Bypass: logged-in sessions | cookie contains `nabd_access`/`nabd_refresh`/`admin_access` (not `/_next/static/`) | bypass cache | enabled |

Public API catalog caching will return later via backend `@PublicCache` headers, not edge overrides.
Purge Everything was run once (2026-10-02). Do not purge routinely.

### B. DNS
| Change | Record |
|---|---|
| added | `A turn` → origin IP, DNS only (coturn) |
| changed | `A live` → DNS only (was proxied) |
| deleted | `TXT xn--_a2a-zk7a._agents` (name contained invisible U+2060) |
| added | `TXT _a2a._agents` = `v=aid1; uri=https://nabd.plus/.well-known/agent-card.json` |
| fixed | `TXT _catalog._agents` = `v=aid1; uri=https://nabd.plus/.well-known/ai-catalog.json` |
| added | `TXT @` = `v=spf1 include:spf.brevo.com include:amazonses.com ~all` |
| added | `CAA @ 0 issue "letsencrypt.org"`, `CAA @ 0 iodef` (owner mailbox) |

Proxied: `@ www admin api app mcp provider staging cdn`. DNS only: `live turn` + Brevo mail records.
Note: `live`/`turn` being DNS only exposes the origin IP publicly.

### C. SSL/TLS
| Setting | Value |
|---|---|
| SSL mode | **Full** (strict blocked — see Pending 2) |
| Min TLS | 1.2 |
| TLS 1.3 | on |
| Always Use HTTPS / Automatic HTTPS Rewrites | on / on |
| HSTS at edge | off (origin already sends HSTS; preload not now) |
| Authenticated Origin Pulls (zone) | **on** at Cloudflare; origin does not enforce yet (Pending 1) |

### D. Speed
HTTP/3 on, Brotli on, Early Hints on, Rocket Loader off, 0-RTT off, Smart Tiered Cache on.

### E. WAF custom rules — phase `http_request_firewall_custom`
| # | Name | Expression | Action |
|---|---|---|---|
| 1 | API: no challenge | `http.host eq "api.nabd.plus" or starts_with(path, "/api/")` | skip products `bic`, `securityLevel` |
| 2 | Block API docs | path starts `/api/v1/docs`, `/api/docs`, `/api/v1/openapi` | block |
| 3 | Block dotfiles | path starts `/.env` or `/.git`, or contains `/.env` or `/.git/` | block |
| 4 | Block WordPress probes | path contains `/wp-admin`, `/wp-login.php`, `/xmlrpc.php` | block |
| 5 | Block monitoring endpoints | path `= /metrics`, starts `/metrics/`, `= /api/v1/metrics`, starts `/actuator`, `= /api/metrics` | block |

Bot Fight Mode: off. JS detections: off. Security level: medium (skipped for the API by rule 1). Browser Integrity Check: on (skipped for the API by rule 1).
`/healthz` on `app`/`mcp` stays public (returns `{"status":"ok"}` only).

### F. Managed rules
Cloudflare Managed Free Ruleset deployed (phase `http_request_firewall_managed`).

### G. Rate limiting — phase `http_ratelimit` (Free: 1 rule, 10 s window, path-only)
| Name | Expression | Limit | Action |
|---|---|---|---|
| RL: auth credential endpoints only | path in {`/api/v1/auth/login`, `/login/verify`, `/login/verify-2fa`, `/register`, `/otp/request`, `/otp/verify`, `/send-otp`, `/verify-otp`, `/password/forgot`, `/password/reset`, `/reset-password`, `/social-login`} (all under `/api/v1/auth`) or path starts `/api/v1/auth/admin-recovery/` | 10 req / 10 s per IP+colo | block 10 s |

Path-only, so it applies on every host serving `/api/v1`. `heartbeat`, `me`, `refresh`, `sessions/online` are not matched (Saudi mobile CGNAT safe).

### H. Zero Trust Access
| App | Policies |
|---|---|
| `admin.nabd.plus` | Allow: owner email only |
| `staging.nabd.plus` | Allow: owner email only; Service Auth: any valid service token (for CI) |

No other Access policies (the earlier "gmail.com"/"company.com" policies were deleted).
Login method: Cloudflare one-time PIN. Session 24 h.

### I. DNSSEC
Active; DS record present at the registrar (DoH `AD=true`). No action needed.

## Pending (not doable from Cloudflare API with the current token)

1. **Origin lockdown (server, OVH).** Run `deploy/scripts/origin-lockdown.sh` on the server. It limits TCP 80/443 to
   Cloudflare IPs through the `DOCKER-USER` chain (Docker bypasses ufw). **First proxy `live.nabd.plus`.** LiveKit
   signalling (wss on 443) currently connects directly to the origin and would break. Media ports 7881/tcp, 7882/udp,
   50000-50100/udp and coturn are not affected.
   Then enforce Authenticated Origin Pulls in nginx (`ssl_client_certificate` = Cloudflare origin-pull CA,
   `ssl_verify_client on;`) on proxied server blocks only (not `live`/`turn` if they stay DNS only).
2. **Full (strict).** `deploy/scripts/issue-certs.sh` issues Let's Encrypt certificates only for
   `api admin provider live turn`. nginx also references certs for `nabd.plus`, `staging`, `mcp`, which this script
   does not issue, and `www`/`app` are not covered. Install a Cloudflare Origin CA certificate for
   `nabd.plus, *.nabd.plus` (generate the key on the server) in every proxied server block. Keep Let's Encrypt for
   `live`/`turn` while they are DNS only (Origin CA is not browser-trusted). Then switch the zone to Full (strict) and
   verify that every hostname returns 200/30x and never 526.
3. **`/api/v1/admin` IP restriction.** The admin UI calls `/api/admin/*` on the admin host, and the Next.js BFF calls
   `${ADMIN_BACKEND_URL}/api/v1/admin/*`. If `ADMIN_BACKEND_URL` is internal (for example `http://backend:3000`), the
   request never passes Cloudflare. In that case block `/api/v1/admin` at the edge entirely. If it is
   `https://api.nabd.plus`, add: path starts `/api/v1/admin` and `not ip.src in {<server egress IPv4/IPv6>}` → block.
   Value and egress IP are not confirmed yet.
4. **Notifications** (DDoS, certificate expiry, origin errors). The token lacks `Notifications`; add these in the
   dashboard (Notifications → Add). Origin-health/5xx alerts need Pro or above; on Free, use an external uptime check.
5. **Staging CI service token.** Create it in Zero Trust → Access → Service credentials, and store the ID and secret
   only as CI environment secrets. Send the headers `CF-Access-Client-Id` and `CF-Access-Client-Secret`.

## Verification (2026-10-03)
```
/.env 403  /.env.local 403  /.git/config 403  api /api/v1/docs 403  /wp-login.php 403
api /metrics 403  provider /metrics 403  api /actuator/health 403
auth/heartbeat x15: 404 (never 429)  auth/me x15: 401 (never 429)
auth/login burst x30 in 1.4 s: 28x400, 2x429 (sandbox egress rotates IPs)
/_next/static/*.js: MISS then HIT
api lab-services / care/services / radiology/reports/mine: DYNAMIC (not cached)
nabd.plus/ar with session cookie: DYNAMIC
nabd.plus 307→/ar  www 307  api 404(root)  app 200  provider 200  mcp 200  cdn 404(root)
admin 302→Access  staging 302→Access  staging + bogus service token 302
```
`curl -sI https://api.nabd.plus/api/v1/radiology/reports/mine` must never show `cf-cache-status: HIT`.
