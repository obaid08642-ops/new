#!/bin/bash
# Rehearsal of tools/ops/cf/32-admin-access-allow-owner.sh against tools/ops/rehearsal/cf-mock.py (no real account).
#   A. production as run 38849057276 read it: reusable "Owner only" policy with the owner's e-mail, every login allowed,
#      only the Cloudflare-account login -> the one-time PIN is added, the policy is not touched
#   B. an app policy naming someone else, the app limited to the Cloudflare login, a Google login on the account
#      -> the owner's e-mail is added; the PIN and Google are added to the app's list; other rules kept
#   C. an Allow policy that requires one login method -> reported BLOCKED, exit 1, nothing guessed
# Each of A and B runs twice: the second run must change nothing. The e-mail must never reach the output.
set -uo pipefail
cd "$(dirname "$0")/../../.."
PORT=18787
python3 tools/ops/rehearsal/cf-mock.py $PORT > /tmp/cf-mock-access.log 2>&1 &
MOCK=$!; trap 'kill $MOCK' EXIT; sleep 1
M=http://127.0.0.1:$PORT
export CF_API=$M/client/v4 CF=rehearsal-global-key CFE=ops@rehearsal.test Z=zone-rehearsal
OWNER=obaid08642@gmail.com
fail=0
seed() { curl -s -X POST -H 'Content-Type: application/json' $M/_access --data "$1" > /dev/null; }
state() { curl -s $M/_access | jq -c ".result | $1"; }
expect() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got $2, want $3"; fail=1; fi; }
run() { bash tools/ops/cf/32-admin-access-allow-owner.sh > /tmp/acc-run.txt 2>&1; rc=$?; sed 's/^/    /' /tmp/acc-run.txt
  grep -qi "$OWNER" /tmp/acc-run.txt && { echo "FAIL the owner's e-mail appeared in the output"; fail=1; }
  grep -vE '^cf: ' /tmp/acc-run.txt | grep -q . && { echo "FAIL a line without the cf: prefix"; fail=1; }
  return $rc; }
changes() { grep -cE 'added|extended' /tmp/acc-run.txt; }

echo "== A: production shape (run 38849057276)"
seed '{"apps":[{"id":"app1","name":"Admin Portal","domain":"admin.nabd.plus","type":"self_hosted","allowed_idps":[],"session_duration":"24h","policies":[{"id":"pol1","precedence":1}]}],
  "policies":[{"id":"pol1","name":"Owner only","decision":"allow","reusable":true,"include":[{"email":{"email":"obaid08642@gmail.com"}}],"exclude":[],"require":[]}],
  "idps":[{"id":"idp-cf","name":"Cloudflare","type":"cloudflare"}]}'
run; expect "A exit" $? 0
expect "A one-time PIN added" "$(state '[.idps[].type]')" '["cloudflare","onetimepin"]'
expect "A policy untouched" "$(state '.policies[0].include')" '[{"email":{"email":"obaid08642@gmail.com"}}]'
grep -q 'cf: before: policy "Owner only" allow reusable=true include=\["email"\] require=\[\] exclude=\[\] owner_email_included=true' /tmp/acc-run.txt; expect "A before line shows rule types" $? 0
run; expect "A second run exit" $? 0; expect "A second run changes nothing" "$(changes)" 0

echo "== B: owner missing, app limited to one login, Google on the account"
seed '{"apps":[{"id":"app2","name":"Admin","domain":"admin.nabd.plus","type":"self_hosted","allowed_idps":["idp-cf"],"policies":[{"id":"pol2","precedence":1},{"id":"pol3","precedence":2}]}],
  "policies":[{"id":"pol2","name":"Staff","decision":"allow","include":[{"email":{"email":"someone@nabd.plus"}},{"email_domain":{"domain":"nabd.plus"}}],"exclude":[{"ip":{"ip":"192.0.2.0/24"}}],"require":[]},
              {"id":"pol3","name":"Block bots","decision":"deny","include":[{"everyone":{}}],"exclude":[],"require":[]}],
  "idps":[{"id":"idp-cf","name":"Cloudflare","type":"cloudflare"},{"id":"idp-g","name":"Google","type":"google"}]}'
run; expect "B exit" $? 0
expect "B owner added, other rules kept" "$(state '[.policies[0].include[] | keys[0]]')" '["email","email_domain","email"]'
expect "B owner e-mail is the added rule" "$(state '.policies[0].include[2].email.email')" '"obaid08642@gmail.com"'
expect "B exclude kept" "$(state '.policies[0].exclude')" '[{"ip":{"ip":"192.0.2.0/24"}}]'
expect "B deny policy untouched" "$(state '.policies[1].include')" '[{"everyone":{}}]'
expect "B app logins: Cloudflare, Google, PIN" "$(state '[.apps[0].allowed_idps[] as $i | .idps[] | select(.id == $i) | .type] | sort')" '["cloudflare","google","onetimepin"]'
expect "B both policies still attached" "$(state '[.apps[0].policies[].id]')" '["pol2","pol3"]'
run; expect "B second run exit" $? 0; expect "B second run changes nothing" "$(changes)" 0

echo "== C: an Allow policy requires one login method"
seed '{"apps":[{"id":"app3","name":"Admin","domain":"admin.nabd.plus","allowed_idps":[],"policies":[{"id":"pol4","precedence":1}]}],
  "policies":[{"id":"pol4","name":"Owner only","decision":"allow","include":[{"email":{"email":"obaid08642@gmail.com"}}],"exclude":[],"require":[{"login_method":{"id":"idp-cf"}}]}],
  "idps":[{"id":"idp-cf","name":"Cloudflare","type":"cloudflare"}]}'
run; rc=$?; expect "C exit 1" $rc 1
grep -q 'cf: BLOCKED an Allow policy requires one login method' /tmp/acc-run.txt; expect "C reported BLOCKED" $? 0
expect "C require untouched" "$(state '.policies[0].require')" '[{"login_method":{"id":"idp-cf"}}]'

[ $fail = 0 ] && echo "access rehearsal: PASS" || { echo "access rehearsal: FAIL"; exit 1; }
