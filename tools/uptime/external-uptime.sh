#!/bin/bash
# External uptime check (owner, 2026-11-02: the site was down for hours and no alert mail came, because monitor.sh and the watchdog run ON the
# host and die with it). Runs from GitHub Actions (.github/workflows/uptime-alert.yml, every 5 minutes), GET only:
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

. "$(dirname "${BASH_SOURCE[0]}")/_mail.sh"
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
