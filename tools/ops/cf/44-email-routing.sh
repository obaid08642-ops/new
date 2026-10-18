#!/bin/bash
# Cloudflare Email Routing on nabd.plus (reviewer/owner, 2026-10-18): security@, support@ and customer@ nabd.plus are
# forwarded to the owner's mailbox (EMAIL_ROUTING_DEST, a GitHub secret; the address is never printed).
# What must not break: outgoing mail through Resend, Brevo, Mailjet and SES. Outgoing mail is judged by the apex SPF
# (ONE record: brevo, mailjet, amazonses), the DKIM records and DMARC. Email Routing's one-click enable adds its own apex
# SPF record, which would make two (invalid, SPF fails for every provider). This task therefore:
#   - refuses to start if an apex MX of another provider exists (a mailbox would stop receiving);
#   - after enabling, removes a second SPF record if Cloudflare added one (inbound forwarding does not need it);
#   - ends by checking that SPF is still ONE record with the three includes, DKIM/DMARC/return-path records are all still
#     there, and the only DNS difference is the Cloudflare MX records.
#   44-email-routing-check.sh   reads only: state, destination status, DNS facts
#   44-email-routing-apply.sh   APPLY=1: adds the destination (Cloudflare mails the owner a link to confirm it), then, once it is
#                               confirmed, enables routing and creates the three rules. Safe to run again.
# Lines start with "cf: email" (public log). Env: CF/CFE/Z (_auth.sh), EMAIL_ROUTING_DEST, APPLY, CF_API.
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
APPLY=${APPLY:-0}
DOMAIN=nabd.plus
ALIASES="security support customer"
say() { echo "cf: email $*"; }
api() { cf_curl -H 'Content-Type: application/json' "$@"; }
[ -n "${EMAIL_ROUTING_DEST:-}" ] || { say "BLOCKED secret OPS_FORWARD_EMAIL (EMAIL_ROUTING_DEST) is not passed to this step"; exit 1; }

dnsrecs() { api "$CF_API/zones/$Z/dns_records?per_page=500"; }
D0=$(dnsrecs); [ "$(echo "$D0" | jq -r .success)" = true ] || { say "BLOCKED cannot list DNS records: $(echo "$D0" | jq -c '[.errors[]?.message]')"; exit 1; }
spfcount() { echo "$1" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "TXT" and .name == $d and (.content | test("v=spf1")))] | length'; }
spftext() { echo "$1" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "TXT" and .name == $d and (.content | test("v=spf1"))) | .content] | join(" ")'; }
spf_ok() { local t; t=$(spftext "$1"); [ "$(spfcount "$1")" = 1 ] && for i in spf.brevo.com spf.mailjet.com amazonses.com; do echo "$t" | grep -q "include:$i" || return 1; done; }
names() { echo "$1" | jq -r '.result[] | "\(.type) \(.name)"' | sort; }

# ---------------------------------------------------------------- 1. before
spf_ok "$D0" && say "SPF before: one record with brevo, mailjet and amazonses" || { say "BLOCKED SPF is not in the expected shape before the change ($(spfcount "$D0") record(s)); fix SPF first (cf:41-mail-verify)"; exit 1; }
FOREIGN=$(echo "$D0" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "MX" and .name == $d and (.content | test("mx.cloudflare.net$") | not))] | length')
[ "$FOREIGN" = 0 ] || { say "BLOCKED $FOREIGN apex MX record(s) of another mail provider exist on $DOMAIN: routing would take over the mailbox. Nothing changed"; exit 1; }
CFMX=$(echo "$D0" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "MX" and .name == $d)] | length')
say "apex MX records now: $CFMX (Cloudflare's)"

ZI=$(api "$CF_API/zones/$Z"); ACC=$(echo "$ZI" | jq -r '.result.account.id // empty')
[ -n "$ACC" ] || { say "BLOCKED cannot read the account id of the zone"; exit 1; }
ST=$(api "$CF_API/zones/$Z/email/routing")
[ "$(echo "$ST" | jq -r .success)" = true ] || { say "BLOCKED cannot read Email Routing: $(echo "$ST" | jq -c '[.errors[]?.message]') (the credential needs Email Routing permissions)"; exit 1; }
ENABLED=$(echo "$ST" | jq -r '.result.enabled // false')
say "routing enabled: $ENABLED"
ADDR=$(api "$CF_API/accounts/$ACC/email/routing/addresses?per_page=50")
DEST=$(echo "$ADDR" | jq -c --arg e "$EMAIL_ROUTING_DEST" '[.result[]? | select((.email | ascii_downcase) == ($e | ascii_downcase))][0] // empty')
if [ -z "$DEST" ]; then say "destination: not registered yet"; DV=none
else DV=$(echo "$DEST" | jq -r 'if .verified then "verified" else "pending" end'); say "destination: registered, $DV"; fi
RULES=$(api "$CF_API/zones/$Z/email/routing/rules?per_page=50")
for a in $ALIASES; do
  echo "$RULES" | jq -e --arg v "$a@$DOMAIN" '[.result[]? | select(any(.matchers[]?; .value == $v))] | length > 0' >/dev/null \
    && say "rule $a@: exists" || say "rule $a@: missing"
done
[ "$APPLY" = 1 ] || { say "read only. Next: run the -apply task (it registers the destination if needed)"; exit 0; }

# ---------------------------------------------------------------- 2. destination
if [ "$DV" = none ]; then
  R=$(api -X POST "$CF_API/accounts/$ACC/email/routing/addresses" --data "$(jq -nc --arg e "$EMAIL_ROUTING_DEST" '{email: $e}')")
  [ "$(echo "$R" | jq -r .success)" = true ] || { say "FAILED to register the destination: $(echo "$R" | jq -c '[.errors[]?.message]')"; exit 1; }
  say "destination registered: Cloudflare sent the owner a confirmation e-mail. WAITING: the owner clicks the link, then run the -apply task again"
  exit 0
fi
[ "$DV" = verified ] || { say "WAITING the owner has not clicked the confirmation link yet (check the inbox and spam); run -apply again after"; exit 0; }

# ---------------------------------------------------------------- 3. enable (MX) and keep SPF to one record
if [ "$ENABLED" != true ]; then
  E=$(api -X POST "$CF_API/zones/$Z/email/routing/dns" --data '{}')
  [ "$(echo "$E" | jq -r .success)" = true ] || { say "FAILED to enable routing: $(echo "$E" | jq -c '[.errors[]?.message]'): nothing else changed"; exit 1; }
  say "routing enabled (MX records added)"
fi
D1=$(dnsrecs)
if [ "$(spfcount "$D1")" != 1 ]; then
  EXTRA=$(echo "$D1" | jq -r --arg d "$DOMAIN" '.result[] | select(.type == "TXT" and .name == $d and (.content | test("v=spf1")) and (.content | test("spf.brevo.com") | not)) | .id')
  for id in $EXTRA; do
    X=$(api -X DELETE "$CF_API/zones/$Z/dns_records/$id")
    say "second SPF record added by Email Routing removed: success=$(echo "$X" | jq -r .success) $(echo "$X" | jq -c '[.errors[]?.message]')"
  done
  D1=$(dnsrecs)
fi

# ---------------------------------------------------------------- 4. rules
for a in $ALIASES; do
  echo "$RULES" | jq -e --arg v "$a@$DOMAIN" '[.result[]? | select(any(.matchers[]?; .value == $v))] | length > 0' >/dev/null && continue
  R=$(api -X POST "$CF_API/zones/$Z/email/routing/rules" --data "$(jq -nc --arg a "$a@$DOMAIN" --arg e "$EMAIL_ROUTING_DEST" \
      '{name: ("forward " + $a), enabled: true, matchers: [{type: "literal", field: "to", value: $a}], actions: [{type: "forward", value: [$e]}]}')")
  say "rule $a@ created: success=$(echo "$R" | jq -r .success) $(echo "$R" | jq -c '[.errors[]?.message]')"
done

# ---------------------------------------------------------------- 5. outgoing mail is untouched
rc=0
D2=$(dnsrecs)
spf_ok "$D2" && say "SPF after: still ONE record with brevo, mailjet and amazonses" || { say "SPF PROBLEM after the change: $(spfcount "$D2") record(s)"; rc=1; }
LOST=$(comm -23 <(names "$D0") <(names "$D2"))
[ -z "$LOST" ] && say "no DNS record of the mail providers (DKIM, DMARC, return path) was removed" || { say "RECORDS LOST: $(echo "$LOST" | tr '\n' ';')"; rc=1; }
ADDED=$(comm -13 <(names "$D0") <(names "$D2") | tr '\n' ';')
say "DNS added: ${ADDED:-nothing}"
APEXMX=$(echo "$D2" | jq -r --arg d "$DOMAIN" '[.result[] | select(.type == "MX" and .name == $d)] | length')
say "apex MX records: $APEXMX"
exit $rc
