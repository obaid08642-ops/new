#!/bin/bash
# Anonymous public HTML at the Cloudflare edge (owner, 2026-10-27: "cache everything public"). Option chosen: the origin's HASH-BASED policy,
# not a Worker that re-stamps a nonce. Since the owner decision of 2026-10-16 the nonce server (patient-web/server/nonce-server.mjs) sends a
# guest's copy of a public static/ISR page with NO nonce: `script-src 'self' 'strict-dynamic' 'sha256-...'` (one hash per inline script of that
# exact copy, computed from the bytes it sends), `public, max-age=0, s-maxage=<Next's revalidate>, stale-while-revalidate, stale-if-error`, no
# Set-Cookie, and `Cache-Tag` (html + medicines/doctors/articles). So the copy is the same for everybody and can be shared as it is: no code at
# the edge, no per-request compute, no shared nonce. The zone just never stored it (cf-cache-status DYNAMIC) because no cache rule allowed HTML.
# This adds ONE cache rule after the bypass rules (the last match wins): eligible, edge and browser TTL = respect origin, only for anonymous GETs
# of the listed public pages (no session, theme or admin cookie, no Authorization, no RSC/prefetch request). Respect origin means a page the
# origin sends private/no-store (every signed-in or action page, cart, checkout, orders, payments, booking, admin) is never stored, whatever
# its path. The check proves it. Entries leave with a purge by tag (html, medicines, doctors, articles; the purge bus).
#   46-public-html-cache-check.sh   reads only: origin headers, CSP integrity of the origin copy, the rules (ids), what would change
#   46-public-html-cache-apply.sh   APPLY=1: adds the rule; checks MISS then HIT with the same bytes and the same CSP, every inline script of the
#                                   HIT copy matches a CSP hash (Cloudflare does not rewrite the page), no Set-Cookie, no HIT for sessions,
#                                   theme, Authorization, RSC, private pages; hit ratio; TTFB before/after; any failure puts the old rules back.
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, SITE_URL (https://nabd.plus), TAG.
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=public-html
. "$HERE/_rules.sh"
SITE=${SITE_URL:-https://nabd.plus}
PAGES=("/ar" "/ar/c" "/ar/consultations/doctors")
LOCALES="ar en ur hi bn fil"
PREFIXES="c p doctor doctors articles"                    # /{locale}/<prefix>/...
EXACT="" ; PFX=""
for l in $LOCALES; do
  EXACT="$EXACT \"/$l\" \"/$l/\" \"/$l/c\" \"/$l/doctors\" \"/$l/articles\" \"/$l/consultations/doctors\" \"/$l/consultations/doctors/\""
  for p in $PREFIXES; do PFX="$PFX or starts_with(http.request.uri.path, \"/$l/$p/\")"; done
done
EXPR="(http.host in {\"nabd.plus\" \"www.nabd.plus\"} and http.request.method eq \"GET\" and (http.request.uri.path in {${EXACT# }}${PFX})"
EXPR="$EXPR and not http.cookie contains \"nabd_access=\" and not http.cookie contains \"nabd_refresh=\" and not http.cookie contains \"admin_access=\" and not http.cookie contains \"nabd.theme=\""
EXPR="$EXPR and not http.request.uri.query contains \"_rsc=\""
for hd in authorization rsc next-router-prefetch next-router-state-tree next-router-segment-prefetch; do EXPR="$EXPR and not any(http.request.headers[\"$hd\"][*] ne \"\")"; done
EXPR="$EXPR)"
DESC="Public HTML: respect origin Cache-Control (anonymous GET of public pages, hash-based CSP copy)"
PARAMS='{"cache":true,"edge_ttl":{"mode":"respect_origin"},"browser_ttl":{"mode":"respect_origin"}}'
say() { rsay "$@"; }
[ "${PRINT_EXPRESSION:-0}" = 1 ] && { echo "$EXPR"; exit 0; }

# the page must be what the hash policy promises: no nonce, a sha256 for every inline script (python3 is on the runner)
integrity() {   # integrity <headers-file> <body-file>
  python3 - "$1" "$2" <<'PY'
import base64, hashlib, re, sys
hdrs = open(sys.argv[1], encoding="utf8", errors="replace").read()
body = open(sys.argv[2], encoding="utf8", errors="replace").read()
m = re.search(r"(?im)^content-security-policy:\s*(.*)$", hdrs)
if not m: print("no CSP header"); sys.exit(1)
csp = m.group(1)
sd = [d.strip() for d in csp.split(";") if d.strip().startswith("script-src ")]
if not sd: print("no script-src"); sys.exit(1)
ss = sd[0]
if "'nonce-" in ss or "'unsafe-inline'" in ss: print("script-src carries a nonce or unsafe-inline"); sys.exit(1)
if "'strict-dynamic'" not in ss: print("script-src has no strict-dynamic"); sys.exit(1)
if re.search(r'\snonce="', body): print("the body still carries a nonce attribute"); sys.exit(1)
hashes = set(re.findall(r"'sha256-([A-Za-z0-9+/=]+)'", ss))
bad = 0; n = 0
for mm in re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", body, re.S):
    n += 1
    if base64.b64encode(hashlib.sha256(mm.group(1).encode("utf8")).digest()).decode() not in hashes: bad += 1
if bad: print(f"{bad} of {n} inline scripts match no CSP hash"); sys.exit(1)
print(f"{n} inline scripts, all hashed")
PY
}
fetch() {   # fetch <url> <hdr-file> <body-file> [curl args...]
  local u=$1 hf=$2 bf=$3; shift 3
  curl -s -D "$hf" -o "$bf" --max-time 30 -H 'accept: text/html' "$@" "$u"; sed -i 's/\r$//' "$hf"
}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------- 1. the origin copy
P0=${PAGES[1]}
fetch "$SITE$P0" "$TMP/h0" "$TMP/b0"
CC=$(h cache-control < "$TMP/h0")
say "origin copy of one page: HTTP $(head -1 "$TMP/h0" | awk '{print $2}'), cache-control: ${CC:-none}, cf-cache-status: $(h cf-cache-status < "$TMP/h0"), set-cookie: $(h set-cookie < "$TMP/h0" | cut -c1-12)"
echo "$CC" | grep -q 'public' && echo "$CC" | grep -q 's-maxage=' || { say "BLOCKED the origin does not send 'public, s-maxage' for a guest (nonce server in hash mode?): nothing changed"; exit 1; }
[ -z "$(h set-cookie < "$TMP/h0")" ] || { say "BLOCKED the shared copy sets a cookie: nothing changed"; exit 1; }
R=$(integrity "$TMP/h0" "$TMP/b0") || { say "BLOCKED origin copy fails the hash-policy check ($R): nothing changed"; exit 1; }
say "origin copy: $R, no nonce"
fetch "$SITE/ar/cart" "$TMP/hc" "$TMP/bc"
CCC=$(h cache-control < "$TMP/hc"); echo "$CCC" | grep -qi 'public' && { say "BLOCKED /ar/cart is marked public by the origin ($CCC): nothing changed"; exit 1; }
fetch "$SITE$P0" "$TMP/hs" "$TMP/bs" -H 'Cookie: nabd_access=cache-test'
CCS=$(h cache-control < "$TMP/hs"); echo "$CCS" | grep -qi 'public' && { say "BLOCKED a request with a session is answered public ($CCS): nothing changed"; exit 1; }
say "private pages stay private at the origin (cart, session)"
BEFORE=$(for i in 1 2 3; do curl -s -o /dev/null -w '%{time_starttransfer}\n' -H 'accept: text/html' "$SITE$P0"; done | awk '{printf "%.0f ", $1*1000}')
say "TTFB before (ms, 3 GETs of $P0): $BEFORE"

# ---------------------------------------------------------------- 2. rules
rules_load
rules_want "$DESC" "$EXPR" "$PARAMS"
rules_commit
[ "$APPLY" = 1 ] || { say "expression length $(printf %s "$EXPR" | wc -c) of 4096"; exit 0; }

# ---------------------------------------------------------------- 3. the edge behaves
sleep 5
for P in "${PAGES[@]}"; do
  fetch "$SITE$P" "$TMP/m1" "$TMP/mb1"; S1=$(h cf-cache-status < "$TMP/m1")
  S2=""; for i in 1 2 3; do fetch "$SITE$P" "$TMP/m2" "$TMP/mb2"; S2=$(h cf-cache-status < "$TMP/m2"); [ "$S2" = HIT ] && break; sleep 2; done
  say "$P anonymous: first $S1, then $S2"
  [ "$S2" = HIT ] || rules_rollback "$P is not served from the cache"
  cmp -s "$TMP/mb1" "$TMP/mb2" || rules_rollback "$P: the cached bytes differ from the first answer"
  [ "$(h content-security-policy < "$TMP/m1")" = "$(h content-security-policy < "$TMP/m2")" ] || rules_rollback "$P: the CSP of the cached copy differs"
  R=$(integrity "$TMP/m2" "$TMP/mb2") || rules_rollback "$P: the cached copy fails the hash check ($R): the edge rewrote the page"
  [ -z "$(h set-cookie < "$TMP/m2")" ] || rules_rollback "$P: the cached copy sets a cookie"
  say "$P cached copy: $R, same bytes and CSP as the first answer, no cookie"
done
say "hit ratio of 10 repeated GETs of $P0: $(hit_ratio 10 -H 'accept: text/html' "$SITE$P0")"
AFTER=$(for i in 1 2 3; do curl -s -o /dev/null -w '%{time_starttransfer}\n' -H 'accept: text/html' "$SITE$P0"; done | awk '{printf "%.0f ", $1*1000}')
say "TTFB after (ms, 3 GETs of $P0): $AFTER"

# never from the cache
nohit() {   # nohit <label> <url> <curl args...>
  local label=$1 url=$2; shift 2
  local s; s=$(hdr -H 'accept: text/html' "$@" "$url" | h cf-cache-status)
  say "$label: ${s:-none}"
  [ "$s" != HIT ] || rules_rollback "$label was served from the cache"
}
nohit "with a session cookie" "$SITE$P0" -H 'Cookie: nabd_access=cache-test'
nohit "with a refresh cookie" "$SITE$P0" -H 'Cookie: nabd_refresh=cache-test'
nohit "with a theme cookie" "$SITE$P0" -H 'Cookie: nabd.theme=dark'
nohit "with Authorization" "$SITE$P0" -H 'Authorization: Bearer cache-test-not-a-token'
nohit "RSC request (query)" "$SITE$P0?_rsc=abc12"
nohit "RSC request (header)" "$SITE$P0" -H 'RSC: 1'
nohit "prefetch request" "$SITE$P0" -H 'Next-Router-Prefetch: 1'
for priv in /ar/cart /ar/checkout /ar/login /ar/orders /ar/payments /ar/profile /ar/appointments; do
  nohit "private page $priv" "$SITE$priv"
done
# a stored copy must not be served for the cart when asked twice
S=$(hdr "$SITE/ar/cart" | h cf-cache-status); S=$(hdr "$SITE/ar/cart" | h cf-cache-status)
[ "$S" != HIT ] || rules_rollback "/ar/cart answered HIT on the second request"

# purge by tag: the page must leave the cache
PR=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/zones/$Z/purge_cache" --data '{"tags":["html"]}')
say "purge by tag html: success=$(echo "$PR" | jq -r .success) $(echo "$PR" | jq -c '[.errors[]?.message]')"
if [ "$(echo "$PR" | jq -r .success)" = true ]; then
  sleep 4; S4=$(hdr -H 'accept: text/html' "$SITE$P0" | h cf-cache-status); say "right after the purge: $S4"
  [ "$S4" != HIT ] || say "NOTE the entry was still served after the purge (Cache-Tag not on the origin copy yet, release without htmlCacheTags?): the TTL of the page applies until it leaves"
else
  say "NOTE purge by tag is not available with this credential or plan: the TTL of the page applies"
fi
say "OK anonymous public HTML is cached at the edge"
