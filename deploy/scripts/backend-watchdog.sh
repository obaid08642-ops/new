#!/bin/bash
# Host watchdog, the second net after the in-process self-heal (2026-11-01: mongod restarted, nabdah-backend stayed "unhealthy" for about two hours and nobody restarted it:
# Docker never restarts a container that is only unhealthy). Run every minute by /etc/cron.d/nabd-backend-watchdog (installed by ops task 98k).
#   For each watched container (default nabdah-backend nabdah-patient-web): count consecutive minutes with Health.Status=unhealthy. At WATCHDOG_MINUTES (3) in a row, restart it,
#   at most once per WATCHDOG_COOLDOWN_MIN (15). Any other state (healthy, starting, not unhealthy, missing) resets the count. A restart is logged and sent to the alert mail
#   (the same OPS_ALERT_EMAIL / Resend path as monitor.sh, via MONITOR-style env; a failed mail never stops the restart).
#   Owner, 2026-11-09 (alert-mail flood): the RESTART still happens at the cooldown above, but the MAIL is limited to one per container per WATCHDOG_MAIL_HOURS (6), and it says how many
#   restarts (and failed restarts) there were since the last mail. The first restart after a quiet period is mailed at once.
#   WATCHDOG_APPLY=yes   really restart. Without it the script only logs what it WOULD do (dry run), so installing it changes nothing until the ops task sets it.
# Test hooks: WATCHDOG_STATE_DIR, WATCHDOG_DOCKER (default "docker"), WATCHDOG_NOW (epoch), WATCHDOG_MAIL_CMD (receives the mail on stdin instead of a provider).
set -u
cd "$(dirname "$0")/.." 2>/dev/null || true
set -a; [ -f .env.production ] && source .env.production 2>/dev/null; set +a
STATE=${WATCHDOG_STATE_DIR:-/var/lib/nabd-watchdog}
DK=${WATCHDOG_DOCKER:-docker}
NOW=${WATCHDOG_NOW:-$(date +%s)}
MINUTES=${WATCHDOG_MINUTES:-3}
COOLDOWN=$(( ${WATCHDOG_COOLDOWN_MIN:-15} * 60 ))
MAILGAP=$(( ${WATCHDOG_MAIL_HOURS:-6} * 3600 ))
WATCH=${WATCHDOG_CONTAINERS:-"nabdah-backend nabdah-patient-web"}
APPLY=${WATCHDOG_APPLY:-no}
mkdir -p "$STATE" 2>/dev/null
log() { echo "[$(date -u -d "@$NOW" +%FT%TZ 2>/dev/null || date -u +%FT%TZ)] backend-watchdog: $*"; }

send_mail() {   # send_mail <subject> <body>
  local subject=$1 body=$2 to=${OPS_ALERT_EMAIL:-${OWNER_ALERT_EMAIL:-}}
  if [ -n "${WATCHDOG_MAIL_CMD:-}" ]; then printf 'Subject: %s\n\n%s\n' "$subject" "$body" | $WATCHDOG_MAIL_CMD; return; fi
  [ -n "$to" ] && [ -n "${RESEND_API_KEY:-}" ] || { log "no alert mail sent (OPS_ALERT_EMAIL or RESEND_API_KEY not set)"; return; }
  curl -fsS --max-time 15 -X POST https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' \
    -d "$(printf '{"from":"%s","to":["%s"],"subject":"%s","text":"%s"}' "${MAIL_FROM:-alerts@nabd.plus}" "$to" "$subject" "$body")" >/dev/null 2>&1 || log "alert mail failed"
}

for c in $WATCH; do
  h=$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$c" 2>/dev/null)
  f="$STATE/$c.unhealthy"; last="$STATE/$c.restarted"
  if [ "$h" != unhealthy ]; then rm -f "$f"; continue; fi
  n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$f"
  [ "$n" -ge "$MINUTES" ] || { log "$c unhealthy for $n minute(s) (restart at $MINUTES)"; continue; }
  prev=$(cat "$last" 2>/dev/null || echo 0)
  if [ $((NOW - prev)) -lt "$COOLDOWN" ]; then log "$c still unhealthy after $n minute(s); last restart $(( (NOW - prev) / 60 )) min ago, cooldown $((COOLDOWN / 60)) min: not restarting"; continue; fi
  if [ "$APPLY" != yes ]; then log "DRY RUN: $c unhealthy for $n minutes: would restart it (WATCHDOG_APPLY=yes to do it)"; continue; fi
  log "$c unhealthy for $n minutes: restarting"
  # mail gate: one mail per container per MAILGAP; the counters since the last mail go into it
  bump() { echo $(( $(cat "$STATE/$c.$1" 2>/dev/null || echo 0) + 1 )) > "$STATE/$c.$1"; }
  gate_mail() { # subject-prefix body-first-line : sends only when MAILGAP has passed since this container's last mail, then resets the counters
    local lastmail restarts fails
    lastmail=$(cat "$STATE/$c.lastmail" 2>/dev/null || echo 0)
    if [ $((NOW - lastmail)) -lt "$MAILGAP" ]; then log "$c: mail held back (last mail $(( (NOW - lastmail) / 60 )) min ago, one per $((MAILGAP / 3600)) h); counted"; return; fi
    restarts=$(cat "$STATE/$c.restarts-since-mail" 2>/dev/null || echo 0); fails=$(cat "$STATE/$c.fails-since-mail" 2>/dev/null || echo 0)
    send_mail "$1" "$2 Since the last mail about $c: $restarts restart(s) by the watchdog, $fails failed restart attempt(s) (including this one). Next mail about it in at least $((MAILGAP / 3600)) h."
    echo "$NOW" > "$STATE/$c.lastmail"; echo 0 > "$STATE/$c.restarts-since-mail"; echo 0 > "$STATE/$c.fails-since-mail"
  }
  if $DK restart "$c" >/dev/null 2>&1; then
    echo "$NOW" > "$last"; rm -f "$f"; bump restarts-since-mail
    log "$c restarted"
    gate_mail "[nabd] $c was unhealthy for $n minutes and was restarted" "The host watchdog restarted $c at $(date -u -d "@$NOW" +%FT%TZ 2>/dev/null) after $n consecutive unhealthy minutes."
  else
    log "$c restart FAILED"; bump fails-since-mail
    gate_mail "[nabd] $c is unhealthy and the watchdog could not restart it" "docker restart $c failed after $n unhealthy minutes."
  fi
done
exit 0
