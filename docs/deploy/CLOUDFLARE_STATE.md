# Cloudflare state — nabd.plus

Last updated: 2026-10-02. Zone plan: Free. Registrar: Spaceship. Nameservers: pedro/walk.ns.cloudflare.com.
Context: REVIEW_P7R_TO_P12.md (X0), docs/audit/02_AGENT_EXECUTION_PLAN.md (16.13, 7C-C10, 14.9).

## Applied via API

### A. Cache leak (X0) — fixed
Cache Rules (phase `http_request_cache_settings`):

| Rule | Match | State |
|---|---|---|
| Medicines Public Cache | `/api/v1/medicines*` | **disabled** |
| Radiology Services Cache | `/api/v1/radiology*` (incl. `/reports/mine`) | **disabled** |
| Patient Web 6-Langs Cache | `/ar/ /en/ /ur/ /hi/ /bn/ /fil/` | **disabled** |
| Labs Services Cache | `/api/v1/lab-services*` (public catalog) | enabled, 900 s |
| Care Services Cache | `/api/v1/care/services*` (public catalog) | enabled, 900 s |

All three used `edge_ttl.mode = override_origin`, which ignores the origin's `Cache-Control: private`.
Revert: re-enable the rule in Caching → Cache Rules (not recommended).

### B. DNS
| Change | Record |
|---|---|
| added | `A turn` → origin IP, DNS only (coturn) |
| changed | `A live` → DNS only (was proxied) |
| deleted | `TXT xn--_a2a-zk7a._agents` (name contained invisible U+2060) |
| added | `TXT _a2a._agents` = `v=aid1; uri=https://nabd.plus/.well-known/agent-card.json` |
| fixed | `TXT _catalog._agents` = `v=aid1; uri=https://nabd.plus/.well-known/ai-catalog.json` (removed markdown brackets) |
| added | `TXT @` = `v=spf1 include:spf.brevo.com include:amazonses.com ~all` |
| added | `CAA @ 0 issue "letsencrypt.org"`, `CAA @ 0 iodef "mailto:Obaid08642@gmail.com"` |

DMARC left at `p=none`. Other A records (`@ admin api app mcp provider staging`) stay proxied.

### C. SSL/TLS
| Setting | Before | Now |
|---|---|---|
| SSL mode | Full | Full (unchanged — origin cert not verified yet, see pending) |
| Always Use HTTPS | off | **on** |
| Min TLS | 1.0 | **1.2** |
| TLS 1.3 | on | on |
| Automatic HTTPS Rewrites | on | on |
| HSTS | off | off (intentionally) |

### D. Speed
HTTP/3 on, Brotli on, **Early Hints on** (was off), Rocket Loader off, 0-RTT off, **Smart Tiered Cache on** (was off).

### F. DNSSEC
Already `active` (DS present at registrar). No action.

## Pending (not applied — do in dashboard or with a token that has the permission)
1. **Purge Everything** (Caching → Configuration) — token lacked `Cache Purge`.
2. **WAF custom rules** (Security → WAF → Custom rules), action Block:
   - `http.host eq "api.nabd.plus" and starts_with(http.request.uri.path, "/api/v1/docs")`
   - path starts with `/.env`, `/.git`, `/wp-admin`, or equals `/wp-login.php`
   - `/api/v1/admin` on `api.nabd.plus`: **not added**. `admin/next.config.ts` proxies to
     `NEXT_PUBLIC_API_ORIGIN || ADMIN_BACKEND_URL`; confirm that value is an internal URL
     (not `https://api.nabd.plus`) before blocking.
3. **Rate limit**: path starts with `/api/v1/auth/`, 10 req / 10 s per IP → Block (10 s).
4. **Managed rules**: deploy Cloudflare Free Managed Ruleset.
5. **Bot Fight Mode**: keep OFF (breaks mobile API calls on Free plan).
6. **Zero Trust Access** for `admin.nabd.plus` and `staging.nabd.plus`: Allow `Obaid08642@gmail.com`,
   session 15 min (see `ADMIN_NETWORK_GATE.md`). Zero Trust is not enabled on the account yet.
7. **Full (strict)**: switch only after confirming the origin serves a valid public cert for every proxied host.

## Verification
`curl -sI https://api.nabd.plus/api/v1/radiology/reports/mine` must never show `cf-cache-status: HIT`.
