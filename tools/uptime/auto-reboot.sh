#!/bin/bash
# R15c: an outside watchdog that hard-reboots the production host through the provider's API when the host itself is hung (2026-11-02: no SSH, Cloudflare 522 for hours, nothing on the
# host could restart itself). Runs in the same GitHub Actions job as external-uptime.sh, right after it, and reads the same state ($STATE_DIR/fails = consecutive failed 5-minute checks).
#
# It acts only when ALL of these hold (each is printed, so the log says why it did or did not act):
#   1. AUTO_REBOOT=1 (a repository VARIABLE, default off: without it this is a dry run that only says what it would do)
#   2. the host has been failing for REBOOT_AFTER_FAILS checks in a row (default 3 = 15 minutes)
#   3. a fresh probe of the page AND the API fails the way a hung HOST fails (no answer, or Cloudflare 522/523/524), not the way a crashed APP fails (500/502/503/404 mean nginx or Docker still run:
#      the backend watchdog on the host handles those, and a reboot would only make it worse)
#   4. fewer than MAX_PER_DAY reboots in 24 h and none in the last COOLDOWN_H hours (default 2 and 6): a host that keeps hanging needs a human, not a loop
# Providers (PROVIDER=hetzner | ovh), secrets by NAME as repository secrets:
#   hetzner: HETZNER_API_TOKEN, HETZNER_SERVER_ID            POST https://api.hetzner.cloud/v1/servers/<id>/actions/reset   (hard reset, like the reset button)
#   ovh:     OVH_APP_KEY, OVH_APP_SECRET, OVH_CONSUMER_KEY, OVH_SERVICE_NAME, optional OVH_API (default https://eu.api.ovh.com/1.0)
#            POST <OVH_API>/vps/<service>/reboot, signed X-Ovh-Signature = "$1$" + sha1(secret+"+"+consumerKey+"+"+METHOD+"+"+URL+"+"+BODY+"+"+timestamp), timestamp from <OVH_API>/auth/time.
#            The endpoint path is from memory of OVH's API listing and NOT verified here: check it in the OVH API console with the consumer key before AUTO_REBOOT=1.
# After a reboot the owner gets a mail (same providers as external-uptime.sh); the log never prints a token, key or signature.
# Test hooks: AUTO_NOW_EPOCH, UPTIME_MAIL_CMD, REBOOT_API_BASE (replaces the Hetzner base URL), OVH_API, PROBE_PAGE_URL/PROBE_API_URL.
set -uo pipefail
SITE=${SITE_URL:-https://nabd.plus}
API_URL=${API_URL:-https://api.nabd.plus}
STATE_DIR=${STATE_DIR:-${RUNNER_TEMP:-/tmp}/uptime-state}
AFTER=${REBOOT_AFTER_FAILS:-3}
COOL_H=${COOLDOWN_H:-6}
MAX_DAY=${MAX_PER_DAY:-2}
NOW=${AUTO_NOW_EPOCH:-$(date +%s)}
say() { echo "auto-reboot: $*"; }
. "$(dirname "${BASH_SOURCE[0]}")/_mail.sh"
mkdir -p "$STATE_DIR"
FAILS=$(cat "$STATE_DIR/fails" 2>/dev/null || echo 0)
[ "$FAILS" -ge "$AFTER" ] 2>/dev/null || { say "not acting: $FAILS consecutive failed check(s), needs $AFTER"; exit 0; }

probe() { curl -s -o /dev/null -L --max-redirs 3 --max-time 20 -w '%{http_code}' "$1" 2>/dev/null || true; }
PAGE=$(probe "${PROBE_PAGE_URL:-$SITE/ar}"); API=$(probe "${PROBE_API_URL:-$API_URL/api/v1/health/liveness}")
PAGE=${PAGE:-000}; API=${API:-000}
hung() { case "$1" in 000|522|523|524) return 0 ;; *) return 1 ;; esac; }
say "fresh probe: page=$PAGE api=$API"
if ! { hung "$PAGE" && hung "$API"; }; then say "not acting: the answers (page=$PAGE api=$API) are not those of a hung host; the host answers, the app is the problem"; exit 0; fi

TODAY=0; LAST=0
if [ -f "$STATE_DIR/reboots" ]; then
  while read -r t; do [ -n "$t" ] || continue; [ $((NOW - t)) -lt 86400 ] && TODAY=$((TODAY + 1)); [ "$t" -gt "$LAST" ] && LAST=$t; done < "$STATE_DIR/reboots"
fi
[ "$TODAY" -lt "$MAX_DAY" ] || { say "not acting: already $TODAY reboot(s) in 24 h (limit $MAX_DAY): a human has to look"; exit 0; }
[ $((NOW - LAST)) -ge $((COOL_H * 3600)) ] || { say "not acting: the last reboot was $(( (NOW - LAST) / 60 )) min ago (cooldown ${COOL_H} h)"; exit 0; }

PROVIDER=${PROVIDER:-}
reboot_hetzner() {
  [ -n "${HETZNER_API_TOKEN:-}" ] && [ -n "${HETZNER_SERVER_ID:-}" ] || { say "BLOCKED the secrets HETZNER_API_TOKEN and HETZNER_SERVER_ID are not both set"; return 2; }
  local code; code=$(printf 'header = "Authorization: Bearer %s"\n' "$HETZNER_API_TOKEN" | curl -s -o /dev/null -w '%{http_code}' --max-time 30 --config - -X POST "${REBOOT_API_BASE:-https://api.hetzner.cloud/v1}/servers/$HETZNER_SERVER_ID/actions/reset")
  say "Hetzner reset request answered HTTP $code"; case "$code" in 2??) return 0 ;; *) return 1 ;; esac
}
reboot_ovh() {
  local base=${OVH_API:-https://eu.api.ovh.com/1.0}
  for v in OVH_APP_KEY OVH_APP_SECRET OVH_CONSUMER_KEY OVH_SERVICE_NAME; do [ -n "${!v:-}" ] || { say "BLOCKED the secret $v is not set"; return 2; }; done
  local url="$base/vps/$OVH_SERVICE_NAME/reboot" ts sig code
  ts=$(curl -s --max-time 15 "$base/auth/time" | tr -dc '0-9'); [ -n "$ts" ] || ts=$NOW
  sig='$1$'$(printf '%s+%s+%s+%s+%s+%s' "$OVH_APP_SECRET" "$OVH_CONSUMER_KEY" POST "$url" "" "$ts" | sha1sum | cut -d' ' -f1)
  code=$(printf 'header = "X-Ovh-Application: %s"\nheader = "X-Ovh-Consumer: %s"\nheader = "X-Ovh-Timestamp: %s"\nheader = "X-Ovh-Signature: %s"\n' "$OVH_APP_KEY" "$OVH_CONSUMER_KEY" "$ts" "$sig" \
    | curl -s -o /dev/null -w '%{http_code}' --max-time 30 --config - -X POST -H 'Content-Type: application/json' "$url")
  say "OVH reboot request answered HTTP $code"; case "$code" in 2??) return 0 ;; *) return 1 ;; esac
}

if [ "${AUTO_REBOOT:-0}" != 1 ]; then say "DRY RUN (AUTO_REBOOT is not 1): the host looks hung ($FAILS failed checks, page=$PAGE api=$API); would hard-reboot through PROVIDER=${PROVIDER:-unset}"; exit 0; fi
case "$PROVIDER" in
  hetzner) reboot_hetzner; R=$? ;;
  ovh) reboot_ovh; R=$? ;;
  *) say "BLOCKED PROVIDER must be hetzner or ovh"; exit 1 ;;
esac
if [ "$R" = 0 ]; then
  echo "$NOW" >> "$STATE_DIR/reboots"
  send_mail "[nabd.plus] AUTO-REBOOT: the server was hung and was rebooted through the provider" "$SITE has failed $FAILS checks in a row (page HTTP $PAGE, health HTTP $API: the pattern of a hung host, not of a crashed app).
A hard reboot was requested through the $PROVIDER API at $(date -u -d "@$NOW" '+%Y-%m-%d %H:%M:%S') UTC. It can take a few minutes to come back; the external check mails again when it answers.
Limits: at most $MAX_DAY reboots in 24 h, at least $COOL_H h between two. A second hang inside that window needs a person." || true
  say "reboot requested through $PROVIDER"; exit 0
fi
say "reboot FAILED or was blocked (see above): a person has to restart the server"; exit 1
