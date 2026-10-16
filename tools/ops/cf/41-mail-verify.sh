#!/bin/bash
# Mail DNS on nabd.plus (owner, 2026-10-16): SPF, DKIM and DMARC for Resend, Brevo and Mailjet, one SPF record only.
#   1. Cloudflare DNS: the mail records that exist (type and name; never values), how many SPF records the apex has and
#      whether the one SPF record includes all three providers (Resend sends through amazonses.com, its return path
#      send.nabd.plus has its own SPF); DMARC present.
#   2. Brevo and Mailjet: whether each provider sees the domain verified (their APIs, with the GitHub secrets); when one
#      does not, its check is run again once.
# Resend's view is printed by tasks/67-mail-env.sh on the server, where its key is. Reads only, except the two
# "check again" calls. Lines start with "cf: mail" (public log): names and states, never values.
# Env: CF/CFE/Z (tools/ops/cf/_auth.sh), BREVO_API_KEY, MAILJET_API_KEY, MAILJET_SECRET_KEY;
#      CF_API, BREVO_API, MAILJET_API (rehearsal: stand-ins).
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
BREVO_API=${BREVO_API:-https://api.brevo.com/v3}
MAILJET_API=${MAILJET_API:-https://api.mailjet.com/v3/REST}
DOMAIN=nabd.plus
rc=0

# ---------------------------------------------------------------- 1. Cloudflare DNS
RECS=$(cf_curl "$CF_API/zones/$Z/dns_records?per_page=500")
[ "$(echo "$RECS" | jq -r .success)" = true ] || { echo "cf: mail BLOCKED cannot list DNS records: $(echo "$RECS" | jq -c '[.errors[]?.message]')"; exit 1; }
echo "$RECS" | jq -r --arg d "$DOMAIN" '.result[]
  | select((.type == "TXT" and ((.content | test("v=spf1|v=DMARC1|DKIM|k=rsa|p=MI|brevo-code"; "i")) or (.name | test("_domainkey|_dmarc"))))
           or (.type == "CNAME" and (.name | test("_domainkey")))
           or (.type == "MX"))
  | "cf: mail dns \(.type) \(.name)\(if .type == "TXT" and (.content | test("v=spf1")) then " (SPF)" elif .type == "TXT" and (.content | test("brevo-code")) then " (Brevo code)" elif (.name | test("^_dmarc")) then " (DMARC)" elif (.name | test("_domainkey")) then " (DKIM)" else "" end)"' | sort
SPF=$(echo "$RECS" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "TXT" and .name == $d and (.content | test("v=spf1")))] | length')
echo "cf: mail spf records on $DOMAIN: $SPF"
APEX_SPF=$(echo "$RECS" | jq -r --arg d "$DOMAIN" '.result[] | select(.type == "TXT" and .name == $d and (.content | test("v=spf1"))) | .content' | head -1)
for inc in spf.brevo.com spf.mailjet.com amazonses.com; do
  echo "$APEX_SPF" | grep -q "include:$inc" && echo "cf: mail spf includes $inc: yes" || { echo "cf: mail spf includes $inc: NO"; rc=1; }
done
[ "$SPF" = 1 ] || { echo "cf: mail NOT OK: $SPF SPF records on $DOMAIN (one only is valid)"; rc=1; }
for n in "_dmarc.$DOMAIN"; do
  echo "$RECS" | jq -e --arg n "$n" '[.result[] | select(.name == $n and .type == "TXT" and (.content | test("v=DMARC1")))] | length == 1' >/dev/null \
    && echo "cf: mail dmarc: present" || { echo "cf: mail dmarc: MISSING"; rc=1; }
done
has() { echo "$RECS" | jq -e --arg n "$1" --arg t "$2" '[.result[] | select(.name == $n and .type == $t)] | length > 0' >/dev/null; }
has "resend._domainkey.$DOMAIN" TXT && echo "cf: mail dkim resend: present" || { echo "cf: mail dkim resend: MISSING"; rc=1; }
has "send.$DOMAIN" TXT && has "send.$DOMAIN" MX && echo "cf: mail resend return path send.$DOMAIN (SPF + MX): present" || { echo "cf: mail resend return path: MISSING"; rc=1; }
has "brevo1._domainkey.$DOMAIN" CNAME && has "brevo2._domainkey.$DOMAIN" CNAME && echo "cf: mail dkim brevo: present" || { echo "cf: mail dkim brevo: MISSING"; rc=1; }
has "mailjet._domainkey.$DOMAIN" TXT && echo "cf: mail dkim mailjet: present" || { echo "cf: mail dkim mailjet: MISSING"; rc=1; }
N=$(echo "$RECS" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "TXT" and .name == $d and (.content | test("^\"?brevo-code:")))] | length')
echo "cf: mail brevo-code records: $N"

# ---------------------------------------------------------------- 2. the providers' view
brevo() { printf 'header = "api-key: %s"\nheader = "accept: application/json"\n' "${BREVO_API_KEY:-}" | curl -s --max-time 20 --config - "$@"; }
if [ -z "${BREVO_API_KEY:-}" ]; then
  echo "cf: mail brevo: BLOCKED secret BREVO_API_KEY not passed to this step"; rc=1
else
  B=$(brevo "$BREVO_API/senders/domains/$DOMAIN")
  if [ "$(echo "$B" | jq -r '.authenticated // false')" != true ]; then
    brevo -X PUT "$BREVO_API/senders/domains/$DOMAIN/authenticate" >/dev/null
    echo "cf: mail brevo: authentication asked again"
    B=$(brevo "$BREVO_API/senders/domains/$DOMAIN")
  fi
  if echo "$B" | jq -e '.domain_name' >/dev/null 2>&1; then
    echo "cf: mail brevo: domain verified=$(echo "$B" | jq -r .verified) authenticated=$(echo "$B" | jq -r .authenticated)"
    echo "$B" | jq -r '.dns_records // {} | to_entries[] | "cf: mail brevo:   \(.key) \(.value.type // "-") \(.value.host_name // "-") status=\(.value.status)"'
    [ "$(echo "$B" | jq -r .authenticated)" = true ] || rc=1
  else
    echo "cf: mail brevo: domain not readable: $(echo "$B" | jq -r '.code // "no answer"')"; rc=1
  fi
fi
mailjet() { printf 'user = "%s:%s"\n' "${MAILJET_API_KEY:-}" "${MAILJET_SECRET_KEY:-}" | curl -s --max-time 20 --config - "$@"; }
if [ -z "${MAILJET_API_KEY:-}" ] || [ -z "${MAILJET_SECRET_KEY:-}" ]; then
  echo "cf: mail mailjet: BLOCKED secrets MAILJET_API_KEY/MAILJET_SECRET_KEY not passed to this step"; rc=1
else
  M=$(mailjet "$MAILJET_API/dns/$DOMAIN")
  MID=$(echo "$M" | jq -r '.Data[0].ID // empty')
  if [ -n "$MID" ] && { [ "$(echo "$M" | jq -r .Data[0].DKIMStatus)" != OK ] || [ "$(echo "$M" | jq -r .Data[0].SPFStatus)" != OK ]; }; then
    mailjet -X POST "$MAILJET_API/dns/$MID/check" >/dev/null
    echo "cf: mail mailjet: check run again"
    M=$(mailjet "$MAILJET_API/dns/$DOMAIN")
  fi
  if [ -n "$MID" ]; then
    echo "cf: mail mailjet: domain dkim=$(echo "$M" | jq -r .Data[0].DKIMStatus) spf=$(echo "$M" | jq -r .Data[0].SPFStatus)"
    [ "$(echo "$M" | jq -r .Data[0].DKIMStatus)" = OK ] && [ "$(echo "$M" | jq -r .Data[0].SPFStatus)" = OK ] || rc=1
  else
    echo "cf: mail mailjet: domain not readable: $(echo "$M" | jq -r '.ErrorMessage // "no answer"' | cut -c1-80)"; rc=1
  fi
fi
[ $rc = 0 ] && echo "cf: mail OK: one SPF with the three providers, DKIM for each, DMARC, Brevo and Mailjet verified" || echo "cf: mail NOT OK (see the lines above)"
exit $rc
