#!/bin/bash
# Rehearsal of tools/ops/cf/43-search-suggest-cache-*.sh and 44-email-routing-*.sh against tools/ops/rehearsal/cf-mock.py
# (no real account). The stand-in edge answers MISS/HIT/BYPASS the way Cloudflare does once the rule exists.
#   S1  origin sends the public header: check changes nothing; apply adds one rule at the END, MISS then HIT, BYPASS with
#       Authorization and with the session cookie, purge by tag empties it; a second apply changes nothing
#   S2  origin still sends private, no-store: BLOCKED, no rule added
#   S3  the edge serves a signed-in request from the cache (broken rule): apply rolls the old rules back
#   E1  production shape DNS: check is read only; apply registers the destination and WAITS; after the owner confirms,
#       apply enables routing, creates three rules and ends with SPF still one record and no record lost
#   E2  Email Routing also adds its own SPF record: it is removed again, SPF stays one record
#   E3  an apex MX of another provider exists: BLOCKED, nothing changed
#   E4  SPF already broken (two records): BLOCKED before anything is touched
set -uo pipefail
cd "$(dirname "$0")/../../.."
PORT=18789
W=$(mktemp -d)
python3 tools/ops/rehearsal/cf-mock.py $PORT > $W/mock.log 2>&1 &
MOCK=$!; trap 'kill $MOCK; rm -rf "$W"' EXIT; sleep 1
M=http://127.0.0.1:$PORT
export CF_API=$M/client/v4 CF=rehearsal-global-key CFE=ops@rehearsal.test Z=zone-rehearsal EDGE_URL=$M
export EMAIL_ROUTING_DEST=rehearsal-owner@example.test
fail=0
expect() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2', want '$3'"; fail=1; fi; }
contains() { if grep -q -- "$2" "$3"; then echo "PASS $1"; else echo "FAIL $1: '$2' not in output"; fail=1; sed 's/^/    /' "$3"; fi; }
absent() { if grep -q -- "$2" "$3"; then echo "FAIL $1: '$2' appeared"; fail=1; else echo "PASS $1"; fi; }
post() { curl -s -X POST -H 'Content-Type: application/json' "$M$1" --data "${2:-{\}}" > /dev/null; }
PUBLIC='public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
rules() { curl -s -H 'X-Auth-Email: a' -H 'X-Auth-Key: b' $M/client/v4/zones/z/rulesets/phases/http_request_cache_settings/entrypoint | jq -r '.result.rules | map(.description) | join("|")'; }

echo "== S1 suggest cache"
post /_edge "{\"cache_control\":\"$PUBLIC\"}"
curl -s -H 'X-Auth-Email: a' -H 'X-Auth-Key: b' $M/client/v4/zones/z/rulesets/phases/http_request_cache_settings/entrypoint > /dev/null
# the zone's existing rules (docs/deploy/CLOUDFLARE_STATE.md): the bypass rules come last
python3 - <<PY
import json, urllib.request
req = urllib.request.Request("$M/client/v4/zones/z/rulesets/rs-http_request_cache_settings", method="PUT", headers={"X-Auth-Email": "a", "X-Auth-Key": "b", "Content-Type": "application/json"},
  data=json.dumps({"rules": [
   {"action": "set_cache_settings", "description": "Static: /_next/static long cache", "enabled": True, "expression": "starts_with(http.request.uri.path, \"/_next/static/\")", "action_parameters": {"cache": True}},
   {"action": "set_cache_settings", "description": "Bypass: API + _next/data", "enabled": True, "expression": "http.host eq \"api.nabd.plus\"", "action_parameters": {"cache": False}},
   {"action": "set_cache_settings", "description": "Bypass: logged-in sessions", "enabled": True, "expression": "http.cookie contains \"nabd_access\"", "action_parameters": {"cache": False}}]}).encode())
urllib.request.urlopen(req)
PY
bash tools/ops/cf/43-search-suggest-cache-check.sh > $W/s1c.txt 2>&1; rc=$?; sed 's/^/    /' $W/s1c.txt
expect "S1 check exits 0" $rc 0; contains "S1 check says what it would do" "would add one rule" $W/s1c.txt
expect "S1 check changed nothing" "$(rules)" "Static: /_next/static long cache|Bypass: API + _next/data|Bypass: logged-in sessions"
bash tools/ops/cf/43-search-suggest-cache-apply.sh > $W/s1a.txt 2>&1; rc=$?; sed 's/^/    /' $W/s1a.txt
expect "S1 apply exits 0" $rc 0
contains "S1 anonymous MISS then HIT" "anonymous: first MISS, then HIT" $W/s1a.txt
contains "S1 signed-in is never a HIT" "with Authorization: BYPASS; with a session cookie: BYPASS" $W/s1a.txt
contains "S1 purge by tag asked" "purge by tag search: success=true" $W/s1a.txt
contains "S1 ends OK" "OK suggest is cached at the edge" $W/s1a.txt
expect "S1 the new rule is last" "$(rules | awk -F'|' '{print $NF}')" "Search suggest: respect origin Cache-Control (5 min browser, 1 h edge)"
expect "S1 four rules" "$(rules | tr '|' '\n' | wc -l | tr -d ' ')" 4
bash tools/ops/cf/43-search-suggest-cache-apply.sh > $W/s1b.txt 2>&1; contains "S1 second apply: already there" "the rule is already there and correct" $W/s1b.txt
expect "S1 still four rules" "$(rules | tr '|' '\n' | wc -l | tr -d ' ')" 4

echo "== S2 origin still private"
post /_edge '{"cache_control":"private, no-store"}'
curl -s -X PUT -H 'X-Auth-Email: a' -H 'X-Auth-Key: b' -H 'Content-Type: application/json' $M/client/v4/zones/z/rulesets/rs-http_request_cache_settings --data '{"rules":[]}' >/dev/null
bash tools/ops/cf/43-search-suggest-cache-apply.sh > $W/s2.txt 2>&1; rc=$?; sed 's/^/    /' $W/s2.txt
expect "S2 apply refuses" $rc 1; contains "S2 BLOCKED" "BLOCKED the origin does not send" $W/s2.txt; expect "S2 no rule added" "$(rules)" ""

echo "== S3 a signed-in request would be cached: rolled back"
post /_edge "{\"cache_control\":\"$PUBLIC\",\"signed_hit\":true}"
bash tools/ops/cf/43-search-suggest-cache-apply.sh > $W/s3.txt 2>&1; rc=$?; sed 's/^/    /' $W/s3.txt
expect "S3 apply fails" $rc 1; contains "S3 rolled back" "putting the previous rules back" $W/s3.txt
expect "S3 rules back to none" "$(rules)" ""

echo "== S4 the origin sends no Cache-Tag yet: the purge does not empty the entry, the task says so and keeps the rule"
post /_edge "{\"cache_control\":\"$PUBLIC\",\"no_purge_effect\":true}"
bash tools/ops/cf/43-search-suggest-cache-apply.sh > $W/s4.txt 2>&1; rc=$?; sed 's/^/    /' $W/s4.txt
expect "S4 apply exits 0" $rc 0; contains "S4 says the TTL applies" "the TTL of 1 h applies" $W/s4.txt
expect "S4 rule kept" "$(rules | tr '|' '\n' | wc -l | tr -d ' ')" 1

# ------------------------------------------------------------------ email routing
DNS_OK='[
 {"type":"TXT","name":"nabd.plus","content":"\"v=spf1 include:spf.brevo.com include:amazonses.com include:spf.mailjet.com ~all\""},
 {"type":"TXT","name":"_dmarc.nabd.plus","content":"\"v=DMARC1; p=none\""},
 {"type":"TXT","name":"resend._domainkey.nabd.plus","content":"\"p=MIGfMA0rehearsal\""},
 {"type":"TXT","name":"send.nabd.plus","content":"\"v=spf1 include:amazonses.com ~all\""},
 {"type":"MX","name":"send.nabd.plus","content":"feedback-smtp.eu-west-1.amazonses.com"},
 {"type":"CNAME","name":"brevo1._domainkey.nabd.plus","content":"b1.nabd-plus.dkim.brevo.com"},
 {"type":"TXT","name":"mailjet._domainkey.nabd.plus","content":"\"k=rsa; p=MIIBrehearsal\""}]'
echo "== E1 production shape"
post /_edge '{}'
post /_mail "{\"dns\":$DNS_OK}"
bash tools/ops/cf/44-email-routing-check.sh > $W/e1c.txt 2>&1; rc=$?; sed 's/^/    /' $W/e1c.txt
expect "E1 check exits 0" $rc 0; contains "E1 destination not registered" "destination: not registered yet" $W/e1c.txt; absent "E1 no address printed" "rehearsal-owner" $W/e1c.txt
bash tools/ops/cf/44-email-routing-apply.sh > $W/e1a.txt 2>&1; rc=$?; sed 's/^/    /' $W/e1a.txt
expect "E1 apply (1) exits 0" $rc 0; contains "E1 waits for the owner" "WAITING" $W/e1a.txt; absent "E1 no address printed (apply)" "rehearsal-owner" $W/e1a.txt
expect "E1 nothing enabled yet" "$(curl -s $M/_er | jq -r .result.enabled)" false
bash tools/ops/cf/44-email-routing-apply.sh > $W/e1w.txt 2>&1; contains "E1 still pending" "has not clicked" $W/e1w.txt
post /_verify_dest
bash tools/ops/cf/44-email-routing-apply.sh > $W/e1b.txt 2>&1; rc=$?; sed 's/^/    /' $W/e1b.txt
expect "E1 apply (2) exits 0" $rc 0
contains "E1 SPF still one" "SPF after: still ONE record" $W/e1b.txt; contains "E1 no provider record lost" "no DNS record of the mail providers" $W/e1b.txt
contains "E1 three apex MX" "apex MX records: 3" $W/e1b.txt
expect "E1 three rules" "$(curl -s $M/_er | jq -r '.result.rules | sort | join(",")')" "customer@nabd.plus,security@nabd.plus,support@nabd.plus"
absent "E1 no address printed (apply 2)" "rehearsal-owner" $W/e1b.txt
bash tools/ops/cf/44-email-routing-apply.sh > $W/e1d.txt 2>&1; contains "E1 second run: rules exist, nothing new" "rule security@: exists" $W/e1d.txt
expect "E1 still three rules" "$(curl -s $M/_er | jq -r '.result.rules | length')" 3


echo "== E2 Email Routing adds its own SPF record"
post /_reset; post /_edge '{"er_adds_spf":true}'; post /_mail "{\"dns\":$DNS_OK}"
bash tools/ops/cf/44-email-routing-apply.sh > /dev/null 2>&1; post /_verify_dest
bash tools/ops/cf/44-email-routing-apply.sh > $W/e2.txt 2>&1; rc=$?; sed 's/^/    /' $W/e2.txt
expect "E2 apply exits 0" $rc 0; contains "E2 the second SPF was removed" "second SPF record added by Email Routing removed: success=true" $W/e2.txt
contains "E2 SPF ends as one record" "SPF after: still ONE record" $W/e2.txt

echo "== E3 another provider already receives mail on the apex"
post /_reset; post /_mail "{\"dns\":$(echo "$DNS_OK" | jq -c '. + [{"type":"MX","name":"nabd.plus","content":"mx1.other-mail.example"}]')}"
bash tools/ops/cf/44-email-routing-apply.sh > $W/e3.txt 2>&1; rc=$?; sed 's/^/    /' $W/e3.txt
expect "E3 apply refuses" $rc 1; contains "E3 BLOCKED" "apex MX record(s) of another mail provider" $W/e3.txt
expect "E3 nothing registered" "$(curl -s $M/_er | jq -r '.result.addresses | length')" 0

echo "== E4 SPF already broken"
post /_reset; post /_mail "{\"dns\":$(echo "$DNS_OK" | jq -c '. + [{"type":"TXT","name":"nabd.plus","content":"\"v=spf1 include:other.example ~all\""}]')}"
bash tools/ops/cf/44-email-routing-apply.sh > $W/e4.txt 2>&1; rc=$?; sed 's/^/    /' $W/e4.txt
expect "E4 apply refuses" $rc 1; contains "E4 BLOCKED" "SPF is not in the expected shape" $W/e4.txt
expect "E4 nothing registered" "$(curl -s $M/_er | jq -r '.result.addresses | length')" 0

echo "== no credential value in any output"
cat $W/*.txt | grep -q "rehearsal-global-key" && { echo "FAIL the key appeared"; fail=1; } || echo "PASS no key in the outputs"
echo; [ "$fail" = 0 ] && echo "ALL SCENARIOS PASS" || echo "SOME SCENARIOS FAILED"
exit $fail
