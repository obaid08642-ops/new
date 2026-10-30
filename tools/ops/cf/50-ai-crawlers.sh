#!/bin/bash
# AI crawlers allowed (owner, 2026-10-29: "all allowed"). Cloudflare's managed robots.txt prepends groups that Disallow GPTBot, ClaudeBot,
# Google-Extended, Applebot-Extended, Amazonbot, CCBot, meta-externalagent... with `Content-Signal: ai-train=no`, and "Block AI bots" (AI Crawl
# Control) refuses those bots at the edge. This turns both off for the zone, so /robots.txt is the one patient-web serves
# (patient-web/app/robots.txt/route.ts: AI bots allowed on public pages, signed-in areas and /api disallowed, Content-Signal yes/yes/yes).
#   50-ai-crawlers-check.sh   reads only: the zone's bot settings and /robots.txt now (which bots are blocked), what would change
#   50-ai-crawlers-apply.sh   APPLY=1: sets is_robots_txt_managed=false and ai_bots_protection=disabled (the other bot settings are not sent, so
#                             they are not touched); proves with /robots.txt before/after and a request as GPTBot/ClaudeBot; any failure puts the
#                             old values back.
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, SITE_URL (https://nabd.plus).
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=ai-crawlers
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
APPLY=${APPLY:-0}
SITE=${SITE_URL:-https://nabd.plus}
say() { echo "cf: $TAG $*"; }
BOTS="GPTBot ClaudeBot Google-Extended Applebot-Extended Amazonbot CCBot meta-externalagent Bytespider PerplexityBot"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

robots() { curl -s --max-time 25 -H 'Cache-Control: no-cache' "$SITE/robots.txt?cfcheck=$(date +%s%N)" > "$1"; }
# blocked <file>: bots whose group is "Disallow: /" (a blanket block), one per line
blocked() {
  awk 'BEGIN{n=0} /^User-agent:/{ if(seen_rule){n=0;seen_rule=0} ua[n++]=$2; next } /^(Disallow|Allow):/{ seen_rule=1; if($0=="Disallow: /"){for(i=0;i<n;i++)print ua[i]} }' "$1" | sort -u
}
summary() {   # summary <label> <file>
  local b; b=$(blocked "$2" | tr '\n' ' ')
  say "$1: managed block $(grep -c 'BEGIN Cloudflare Managed content' "$2"), content-signal lines: $(grep -c '^Content-Signal:' "$2"), $(grep -c 'ai-train=no' "$2") with ai-train=no, bots with Disallow /: ${b:-none}"
}

# ---------------------------------------------------------------- 1. now
cf_verify | sed 's/^/cf: '"$TAG"' credential: /'
CUR=$(cf_curl "$CF_API/zones/$Z/bot_management")
[ "$(echo "$CUR" | jq -r .success)" = true ] || { say "BLOCKED cannot read bot_management: $(echo "$CUR" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }
OLD_MANAGED=$(echo "$CUR" | jq -c '.result.is_robots_txt_managed')
OLD_AI=$(echo "$CUR" | jq -c '.result.ai_bots_protection')
say "settings now: is_robots_txt_managed=$OLD_MANAGED ai_bots_protection=$OLD_AI crawler_protection=$(echo "$CUR" | jq -c '.result.crawler_protection') cf_robots_variant=$(echo "$CUR" | jq -c '.result.cf_robots_variant')"
robots "$TMP/before"; summary "robots.txt BEFORE" "$TMP/before"
for ua in GPTBot ClaudeBot; do
  say "GET / as $ua BEFORE: HTTP $(curl -s -o /dev/null -w '%{http_code}' --max-time 25 -A "Mozilla/5.0 (compatible; $ua/1.0)" "$SITE/ar")"
done
if [ "$OLD_MANAGED" = false ] && [ "$OLD_AI" = '"disabled"' ]; then
  say "already off: nothing to change"
  exit 0
fi
[ "$APPLY" = 1 ] || { say "would set is_robots_txt_managed=false and ai_bots_protection=disabled; run the -apply task to change it"; exit 0; }

# ---------------------------------------------------------------- 2. change, with a way back
put() {   # put <managed-json> <ai-json>
  cf_curl -X PUT -H 'Content-Type: application/json' "$CF_API/zones/$Z/bot_management" \
    --data "$(jq -nc --argjson m "$1" --argjson a "$2" '{is_robots_txt_managed: $m, ai_bots_protection: $a}')"
}
rollback() {
  say "CHECK FAILED ($1): putting the previous values back"
  local r; r=$(put "$OLD_MANAGED" "$OLD_AI"); say "rollback success=$(echo "$r" | jq -r .success) $(echo "$r" | jq -c '[.errors[]?.message]')"
  exit 1
}
R=$(put false '"disabled"')
[ "$(echo "$R" | jq -r .success)" = true ] || { say "FAILED to change the settings: $(echo "$R" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }
say "set: is_robots_txt_managed=$(echo "$R" | jq -c .result.is_robots_txt_managed) ai_bots_protection=$(echo "$R" | jq -c .result.ai_bots_protection)"

# ---------------------------------------------------------------- 3. proof
OK=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 10; robots "$TMP/after"
  grep -q 'BEGIN Cloudflare Managed content' "$TMP/after" || { OK=1; break; }
done
summary "robots.txt AFTER" "$TMP/after"
[ "$OK" = 1 ] || rollback "robots.txt still carries the Cloudflare managed block after 2 minutes"
if [ -n "$(blocked "$TMP/after")" ]; then rollback "robots.txt still blocks: $(blocked "$TMP/after" | tr '\n' ' ')"; fi
grep -q 'ai-train=no' "$TMP/after" && rollback "robots.txt still says ai-train=no"
grep -q '^Disallow: /api/' "$TMP/after" || say "NOTE robots.txt has no 'Disallow: /api/' yet: the patient-web release with the new robots.txt is not deployed (the managed block is gone, the origin file applies)"
grep -q 'ai-train=yes' "$TMP/after" && say "robots.txt carries Content-Signal search=yes, ai-input=yes, ai-train=yes" || say "NOTE no Content-Signal yet: deploy patient-web with app/robots.txt/route.ts"
for ua in $BOTS; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 -A "Mozilla/5.0 (compatible; $ua/1.0)" "$SITE/ar")
  say "GET /ar as $ua AFTER: HTTP $code"
  case "$code" in 2*|3*) ;; *) rollback "$ua gets HTTP $code on a public page" ;; esac
done
say "OK Cloudflare no longer blocks AI crawlers or writes robots.txt for nabd.plus"
