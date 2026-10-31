#!/bin/bash
# Search Console / Bing Webmaster site verification by DNS (nabd.plus). The tokens come from GitHub secrets and are never printed:
#   GSC_VERIFICATION_TOKEN   Google Search Console "Domain" property: the value of the TXT record, with or without the
#                            "google-site-verification=" prefix  -> TXT record on the apex
#   BING_VERIFICATION_CNAME  Bing Webmaster Tools "CNAME" method: the host label Bing shows (32 hex characters)
#                            -> CNAME <label>.nabd.plus -> verify.bing.com (DNS only)
# (Bing can also import the site from Search Console; then only the Google secret is needed.)
#   51-search-verification-check.sh   reads only: which of the two records exist (by name and id, never the value), which secret is set
#   51-search-verification-apply.sh   APPLY=1: adds the missing record(s); confirms them over DNS-over-HTTPS; deletes what it added if it cannot
#                                     confirm them. An existing record with the same name and a different value is never touched: the task stops.
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, DOMAIN (nabd.plus), DOH (https://cloudflare-dns.com/dns-query), GSC_VERIFICATION_TOKEN, BING_VERIFICATION_CNAME.
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=search-verification
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
APPLY=${APPLY:-0}
DOMAIN=${DOMAIN:-nabd.plus}
DOH=${DOH:-https://cloudflare-dns.com/dns-query}
say() { echo "cf: $TAG $*"; }

GSC=${GSC_VERIFICATION_TOKEN:-}
GSC=${GSC#google-site-verification=}
GSC=$(printf %s "$GSC" | tr -d '"[:space:]')
BING=$(printf %s "${BING_VERIFICATION_CNAME:-}" | tr -d '"[:space:]' | tr 'A-F' 'a-f')
say "secrets: GSC_VERIFICATION_TOKEN $([ -n "$GSC" ] && echo set || echo MISSING), BING_VERIFICATION_CNAME $([ -n "$BING" ] && echo set || echo MISSING)"
[ -n "$GSC$BING" ] || { say "BLOCKED neither secret is set: the owner adds GSC_VERIFICATION_TOKEN (and/or BING_VERIFICATION_CNAME) as GitHub secrets: nothing changed"; exit 1; }
if [ -n "$BING" ] && ! printf %s "$BING" | grep -Eq '^[a-z0-9]{16,64}$'; then say "BLOCKED BING_VERIFICATION_CNAME is not a host label (letters and digits, 16-64): nothing changed"; exit 1; fi

list() {   # list <type> <name>  -> JSON array of {id, content}
  cf_curl -G "$CF_API/zones/$Z/dns_records" --data-urlencode "type=$1" --data-urlencode "name=$2" --data-urlencode "per_page=100" \
    | jq -c '[.result[]? | {id, content}]'
}
cur=$(cf_curl "$CF_API/zones/$Z")
[ "$(echo "$cur" | jq -r .success)" = true ] || { say "BLOCKED cannot read the zone: $(echo "$cur" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }

PLAN=()   # entries: "TXT|name|content" or "CNAME|name|content"
if [ -n "$GSC" ]; then
  want="google-site-verification=$GSC"
  rows=$(list TXT "$DOMAIN")
  if echo "$rows" | jq -e --arg w "$want" 'any(.[]; (.content | gsub("\""; "")) == $w)' >/dev/null; then say "Google TXT on $DOMAIN: already there"
  else
    say "Google TXT on $DOMAIN: missing ($(echo "$rows" | jq -r '[.[] | select(.content | contains("google-site-verification"))] | length') other google-site-verification record(s) exist, they stay)"
    PLAN+=("TXT|$DOMAIN|$want")
  fi
fi
if [ -n "$BING" ]; then
  name="$BING.$DOMAIN"
  rows=$(list CNAME "$name")
  if [ "$(echo "$rows" | jq 'length')" = 0 ]; then say "Bing CNAME: missing"; PLAN+=("CNAME|$name|verify.bing.com")
  elif echo "$rows" | jq -e 'any(.[]; .content == "verify.bing.com")' >/dev/null; then say "Bing CNAME: already there"
  else say "BLOCKED a CNAME of that name exists with another target: not touching it"; exit 1
  fi
fi
[ "${#PLAN[@]}" -gt 0 ] || { say "nothing to add"; exit 0; }
[ "$APPLY" = 1 ] || { say "would add ${#PLAN[@]} record(s) (${PLAN[*]%%|*}); run the -apply task to change it"; exit 0; }

# ---------------------------------------------------------------- add, confirm, or take back
ADDED=()
undo() {
  say "CHECK FAILED ($1): deleting what this run added"
  for id in "${ADDED[@]}"; do
    say "delete $id success=$(cf_curl -X DELETE "$CF_API/zones/$Z/dns_records/$id" | jq -r .success)"
  done
  exit 1
}
for e in "${PLAN[@]}"; do
  IFS='|' read -r type name content <<<"$e"
  r=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/zones/$Z/dns_records" \
        --data "$(jq -nc --arg t "$type" --arg n "$name" --arg c "$content" '{type: $t, name: $n, content: $c, ttl: 1, proxied: false, comment: "search engine site verification (tools/ops/cf/51)"}')")
  [ "$(echo "$r" | jq -r .success)" = true ] || undo "adding the $type record: $(echo "$r" | jq -c '[.errors[]?.message]')"
  ADDED+=("$(echo "$r" | jq -r .result.id)")
  say "added $type record, id ${ADDED[-1]}"
done
doh() {   # doh <name> <type> -> answers' data, one per line
  curl -s --max-time 20 -H 'accept: application/dns-json' "$DOH?name=$1&type=$2" | jq -r '.Answer[]?.data' | tr -d '"'
}
for e in "${PLAN[@]}"; do
  IFS='|' read -r type name content <<<"$e"
  ok=0
  for i in 1 2 3 4 5 6; do
    doh "$name" "$type" | grep -Fxq "${content%.}" && { ok=1; break; }
    doh "$name" "$type" | grep -Fxq "$content." && { ok=1; break; }
    sleep 10
  done
  say "$type $name over DNS-over-HTTPS: $([ "$ok" = 1 ] && echo confirmed || echo NOT confirmed)"
  [ "$ok" = 1 ] || undo "$type record not visible over DNS"
done
say "OK records are live: now press Verify in Search Console / Bing Webmaster Tools"
