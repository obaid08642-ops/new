#!/bin/bash
# External uptime check (owner, 2026-11-02: the site was down for hours and no alert mail came, because monitor.sh and the watchdog run ON the
# host and die with it). Runs from GitHub Actions (.github/workflows/uptime.yml, every 5 minutes), GET only:
#   $SITE_URL/ar            the public page        $SITE_URL/api/v1/health   the API health
# Down = either answers anything but 2xx (or times out) on two runs in a row (FAIL_THRESHOLD). Then ONE mail goes to OPS_ALERT_EMAIL, and one
# more when it is back. The state (consecutive failures, whether the outage mail was sent, since when) lives in $STATE_DIR, which the workflow
# keeps between runs with the Actions cache, so a long outage is one mail, not one every 5 minutes. REMIND_HOURS (default 0 = off) adds a
# reminder mail every N hours while it lasts.
# Mail: the first provider that accepts it, Resend then Brevo then Mailjet (same order as deploy/scripts/monitor.sh). Secrets by NAME, set as
# repository secrets by the owner: OPS_ALERT_EMAIL, MAIL_FROM, RESEND_API_KEY, BREVO_API_KEY, MAILJET_API_KEY, MAILJET_SECRET_KEY (a provider with
# no key is skipped). A mail that cannot be sent makes the run FAIL (exit 1) and is retried on the next run; GitHub also tells the repository
# owner about a failed scheduled run. The log carries status codes and counts only, never a key or the address.
# Test hooks: UPTIME_NOW_EPOCH, UPTIME_MAIL_CMD (gets "SUBJECT: ..." and the body on stdin instead of a provider), the provider URLs below.
set -uo pipefail
SITE=${SITE_URL:-https://nabd.plus}
STATE_DIR=${STATE_DIR:-${RUNNER_TEMP:-/tmp}/uptime-state}
THRESH=${FAIL_THRESHOLD:-2}
REMIND_H=${REMIND_HOURS:-0}
NOW=${UPTIME_NOW_EPOCH:-$(date +%s)}
TS=$(date -u -d "@$NOW" '+%Y-%m-%d %H:%M:%S')
say() { echo "uptime: $*"; }
mkdir -p "$STATE_DIR"
FAILS=$(cat "$STATE_DIR/fails" 2>/dev/null || echo 0)
ALERTED=$(cat "$STATE_DIR/alerted" 2>/dev/null || echo 0)       # epoch of the last outage mail, 0 = none sent for this outage
SINCE=$(cat "$STATE_DIR/since" 2>/dev/null || echo 0)           # epoch of the first failed run of this outage

probe() { # url -> "<code>"; one retry after a failure so one dropped packet is not a failure
  local c i
  for i in 1 2; do
    c=$(curl -s -o /dev/null -L --max-redirs 3 --max-time 20 -w '%{http_code}' "$1" 2>/dev/null); c=${c:-000}
    case "$c" in 2??) break ;; esac
    sleep 3
  done
  echo "$c"
}
PAGE=$(probe "$SITE/ar"); API=$(probe "$SITE/api/v1/health")
case "$PAGE" in 2??) PAGE_OK=1 ;; *) PAGE_OK=0 ;; esac
case "$API" in 2??) API_OK=1 ;; *) API_OK=0 ;; esac
say "$TS UTC page=$PAGE api=$API (consecutive failures before this run: $FAILS)"

mail_json() { # provider subject body
  python3 - "$1" "${MAIL_FROM:-}" "${OPS_ALERT_EMAIL:-}" "$2" "$3" <<'PY'
import json, sys
from email.utils import parseaddr
provider, sender, to, subject, text = sys.argv[1:6]
name, addr = parseaddr(sender)
if provider == "resend":
    print(json.dumps({"from": sender, "to": [to], "subject": subject, "text": text}))
elif provider == "brevo":
    print(json.dumps({"sender": {"email": addr, **({"name": name} if name else {})}, "to": [{"email": to}], "subject": subject, "textContent": text}))
else:
    print(json.dumps({"Messages": [{"From": {"Email": addr, **({"Name": name} if name else {})}, "To": [{"Email": to}], "Subject": subject, "TextPart": text}]}))
PY
}
mail_via() { # provider subject body -> 0 sent, 1 failed, 2 not configured
  local code url
  case "$1" in
    resend) [ -n "${RESEND_API_KEY:-}" ] || return 2; url=${UPTIME_RESEND_URL:-https://api.resend.com/emails}
      code=$(mail_json resend "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$url" -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' --data @-) ;;
    brevo) [ -n "${BREVO_API_KEY:-}" ] || return 2; url=${UPTIME_BREVO_URL:-https://api.brevo.com/v3/smtp/email}
      code=$(mail_json brevo "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$url" -H "api-key: $BREVO_API_KEY" -H 'Content-Type: application/json' --data @-) ;;
    mailjet) { [ -n "${MAILJET_API_KEY:-}" ] && [ -n "${MAILJET_SECRET_KEY:-}" ]; } || return 2; url=${UPTIME_MAILJET_URL:-https://api.mailjet.com/v3.1/send}
      code=$(mail_json mailjet "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$url" -u "$MAILJET_API_KEY:$MAILJET_SECRET_KEY" -H 'Content-Type: application/json' --data @-) ;;
  esac
  case "$code" in 20?) return 0 ;; *) say "mail via $1 failed (HTTP ${code:-none})"; return 1 ;; esac
}
send_mail() { # subject body
  if [ -n "${UPTIME_MAIL_CMD:-}" ]; then printf 'SUBJECT: %s\n%s\n' "$1" "$2" | $UPTIME_MAIL_CMD; return 0; fi
  [ -n "${OPS_ALERT_EMAIL:-}" ] && [ -n "${MAIL_FROM:-}" ] || { say "MAIL NOT SENT: the repository secrets OPS_ALERT_EMAIL and MAIL_FROM are not both set"; return 1; }
  local p r any=0
  for p in resend brevo mailjet; do
    mail_via "$p" "$1" "$2"; r=$?
    [ $r = 0 ] && { say "mail sent via $p"; return 0; }
    [ $r = 1 ] && any=1
  done
  [ $any = 0 ] && say "MAIL NOT SENT: no provider key is set (RESEND_API_KEY, BREVO_API_KEY, MAILJET_API_KEY + MAILJET_SECRET_KEY)"
  return 1
}
dur() { local s=$1; [ "$s" -lt 120 ] && echo "${s}s" || { [ "$s" -lt 7200 ] && echo "$((s/60)) min" || echo "$((s/3600)) h $((s%3600/60)) min"; }; }
RUN_URL=${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}

RC=0
if [ "$PAGE_OK" = 1 ] && [ "$API_OK" = 1 ]; then
  if [ "$ALERTED" != 0 ]; then
    if send_mail "[nabd.plus] BACK UP: $SITE answers again" "$SITE is answering again at $TS UTC (page HTTP $PAGE, health HTTP $API).
It was down for about $(dur $((NOW - SINCE))) (first failed check $(date -u -d "@$SINCE" '+%Y-%m-%d %H:%M:%S') UTC).
Sent by the external uptime check ($RUN_URL)."; then ALERTED=0; else RC=1; fi
  fi
  [ "$ALERTED" = 0 ] && { echo 0 > "$STATE_DIR/fails"; echo 0 > "$STATE_DIR/alerted"; echo 0 > "$STATE_DIR/since"; } || echo "$ALERTED" > "$STATE_DIR/alerted"
  [ "$RC" = 0 ] && say "OK"
  exit $RC
fi

FAILS=$((FAILS + 1)); echo "$FAILS" > "$STATE_DIR/fails"
[ "$SINCE" = 0 ] && { SINCE=$NOW; echo "$SINCE" > "$STATE_DIR/since"; }
say "FAILED (page=$PAGE api=$API), $FAILS in a row"
SEND=0
[ "$FAILS" -ge "$THRESH" ] && [ "$ALERTED" = 0 ] && SEND=1
[ "$FAILS" -ge "$THRESH" ] && [ "$ALERTED" != 0 ] && [ "$REMIND_H" -gt 0 ] && [ $((NOW - ALERTED)) -ge $((REMIND_H * 3600)) ] && SEND=2
if [ "$SEND" != 0 ]; then
  WHAT="$([ "$SEND" = 2 ] && echo 'STILL DOWN' || echo 'DOWN')"
  if send_mail "[nabd.plus] $WHAT: $SITE is not answering" "$SITE has failed $FAILS checks in a row (every 5 minutes), since $(date -u -d "@$SINCE" '+%Y-%m-%d %H:%M:%S') UTC.
- $SITE/ar: HTTP $PAGE
- $SITE/api/v1/health: HTTP $API
(000 = no answer / timeout; 5xx or 522 = the origin or the server behind it is down)
This check runs outside the server (GitHub Actions), so it still reaches you when the server and its own monitor are down.
You get one mail for the outage and one when it is back. Run: $RUN_URL"; then
    echo "$NOW" > "$STATE_DIR/alerted"
  else RC=1; fi
fi
exit $RC
