#!/bin/bash
# Mailjet answered 401 to the app's own send (mail test of 2026-10-17: "mailjet_http_401"). Read-only: finds out WHY, from the
# server, with the keys that are in .env.production, and prints no value, only shapes and the provider's answer.
#   1. the two env values: set or not, length, shape (32 hex like a Mailjet key, other), whitespace / quote / CR inside,
#      key == secret, a sign of "key and secret swapped" (only by shape)
#   2. Mailjet's own answer to GET /v3/REST/apikey with those two values: HTTP status and its error text (no key in it)
#   3. when that is 401: the same call with key and secret swapped (a swap is the common cause), and with the values
#      trimmed of whitespace / quotes; only the status codes
#   4. when it is 200: the key's state (active or not) and whether the sender for MAIL_FROM is known to Mailjet
# Writes nothing, changes nothing. Public lines start with "mail:".
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
API=${MAILJET_API:-https://api.mailjet.com/v3/REST}
envget() { sudo -n grep -E "^$1=" "$ENVF" 2>/dev/null | tail -1 | cut -d= -f2-; }
KEY=$(envget MAILJET_API_KEY); SEC=$(envget MAILJET_SECRET_KEY); FROM=$(envget MAIL_FROM)
echo "## mailjet-diagnose"
shape() {  # name value -> a line with no value in it
  local n=$1 v=$2 len=${#2} cls=other flags=""
  [ -z "$v" ] && { echo "mail: mailjet: $n: NOT SET in .env.production"; return; }
  printf '%s' "$v" | grep -qE '^[0-9a-f]{32}$' && cls="32 hex characters (Mailjet-like)"
  printf '%s' "$v" | grep -qE '^[A-Za-z0-9]{32}$' && [ "$cls" = other ] && cls="32 letters/digits (Mailjet-like)"
  printf '%s' "$v" | grep -q '[[:space:]]' && flags="$flags whitespace-inside"
  printf '%s' "$v" | grep -q $'\r' && flags="$flags carriage-return"
  printf '%s' "$v" | grep -qE "^[\"']|[\"']$" && flags="$flags quote-at-an-end"
  printf '%s' "$v" | grep -qE '^(re_|xkeysib-)' && flags="$flags looks-like-another-provider"
  echo "mail: mailjet: $n: set, length $len, shape: $cls${flags:+, flags:$flags}"
}
shape MAILJET_API_KEY "$KEY"; shape MAILJET_SECRET_KEY "$SEC"
[ -n "$KEY" ] && [ "$KEY" = "$SEC" ] && echo "mail: mailjet: key and secret are the SAME value"
[ -n "$KEY" ] && [ -n "$SEC" ] || { echo "mail: mailjet: NOT OK a value is missing, nothing to test"; exit 1; }
mj() {  # user pass path -> "<http status>|<body>" (credentials via curl --config on stdin, never on a command line)
  printf 'user = "%s:%s"\n' "$1" "$2" | curl -s --max-time 20 --config - -w '|%{http_code}' "$API/$3"
}
R=$(mj "$KEY" "$SEC" apikey); CODE=${R##*|}; BODY=${R%|*}
echo "mail: mailjet: GET apikey with the env values: HTTP $CODE"
if [ "$CODE" = 200 ]; then
  echo "mail: mailjet: key is $(echo "$BODY" | jq -r '.Data[0] | if .IsActive then "active" else "NOT active" end'), usage $(echo "$BODY" | jq -r '.Data[0].Usage // "n/a"')"
  FADDR=$(printf '%s' "$FROM" | sed -E 's/.*<([^>]+)>.*/\1/; s/^[[:space:]]+|[[:space:]]+$//g')
  S=$(mj "$KEY" "$SEC" sender); SC=${S##*|}
  if [ "$SC" = 200 ]; then
    echo "mail: mailjet: senders known to Mailjet: $(echo "${S%|*}" | jq -r '[.Data[] | "\(.Status)"] | group_by(.) | map("\(.[0])=\(length)") | join(" ")')"
    echo "${S%|*}" | jq -e --arg a "$FADDR" '[.Data[] | select((.Email | ascii_downcase) == ($a | ascii_downcase) or (.Email | startswith("*@")))] | length > 0' >/dev/null \
      && echo "mail: mailjet: the From address is allowed (an exact sender or a domain sender)" \
      || echo "mail: mailjet: the From address is NOT a known sender: a send would be refused (create or validate the sender in Mailjet)"
  else echo "mail: mailjet: GET sender: HTTP $SC"; fi
  echo "mail: mailjet: OK the credentials in .env.production are accepted; if the app still gets 401, the container runs an older env (recreate backend)"
  exit 0
fi
echo "mail: mailjet: Mailjet says: $(echo "$BODY" | jq -r '.ErrorMessage // "no message"' 2>/dev/null | cut -c1-140)"
SW=$(mj "$SEC" "$KEY" apikey); echo "mail: mailjet: key and secret SWAPPED: HTTP ${SW##*|}"
STRIP="s/[[:space:]\"']//g"
TK=$(printf '%s' "$KEY" | sed -E "$STRIP"); TS=$(printf '%s' "$SEC" | sed -E "$STRIP")
if [ "$TK" != "$KEY" ] || [ "$TS" != "$SEC" ]; then TR=$(mj "$TK" "$TS" apikey); echo "mail: mailjet: values trimmed of whitespace/quotes: HTTP ${TR##*|}"; fi
if [ "${SW##*|}" = 200 ]; then echo "mail: mailjet: NOT OK key and secret are in each other's place in .env.production: swap the two values"
else echo "mail: mailjet: NOT OK Mailjet does not accept these values: the pair is wrong, revoked or from another account (create a new pair in Mailjet > API keys and put it in the GitHub secrets, then run tasks 70 and 73)"; fi
exit 1
