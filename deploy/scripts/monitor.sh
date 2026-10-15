#!/bin/bash
# ═══ Nabdah Plus — production monitoring & alerting (every 15min via cron) ═══
# Alerts are written to /var/log/nabdah-alerts.log and, when OPS_ALERT_EMAIL is set in .env.production, e-mailed
# through Resend (RESEND_API_KEY, MAIL_FROM). A mail goes out when the set of alerts changes, again every
# ALERT_REPEAT_HOURS while it lasts, and once when everything is back to OK. Before 2026-10-15 alerts were only
# logged: the disk reached 2 GB free and nobody was told.
# Test hooks (tools/ops/monitor/test-monitor.sh): MONITOR_DF_OUTPUT, MONITOR_STATE_DIR, MONITOR_LOG_DIR,
# MONITOR_SKIP_SERVICES=1, MONITOR_MAIL_CMD (receives the mail on stdin instead of Resend).
cd "$(dirname "$0")/.." 2>/dev/null || true
set -a; [ -f .env.production ] && source .env.production 2>/dev/null; set +a
TS=$(date '+%Y-%m-%d %H:%M:%S')
LOG_DIR=${MONITOR_LOG_DIR:-/var/log}
STATE_DIR=${MONITOR_STATE_DIR:-/var/lib/nabdah-monitor}
DISK_MIN_FREE_PCT=${DISK_MIN_FREE_PCT:-20}
ALERT_REPEAT_HOURS=${ALERT_REPEAT_HOURS:-6}
ALERTS=(); KEYS=()
# alert <stable key> <message>: the key decides whether the alert is new; the message carries the numbers
alert() { KEYS+=("$1"); ALERTS+=("$2"); echo "[$TS] ALERT: $2" >> "$LOG_DIR/nabdah-alerts.log"; }

if [ "${MONITOR_SKIP_SERVICES:-0}" != 1 ]; then
  # the services production runs (fastapi is defined in compose but not run, so it is not checked)
  for c in nabdah-mongodb nabdah-redis nabdah-backend nabdah-worker nabdah-meilisearch nabdah-admin-web nabdah-patient-web nabdah-livekit nabdah-coturn nabdah-nginx; do
    st=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$c" 2>/dev/null || echo "missing")
    case "$st" in
      "running unhealthy") alert "container-$c" "container $c is unhealthy" ;;
      running*) ;;
      *) alert "container-$c" "container $c state=$st" ;;
    esac
  done
  docker exec nabdah-mongodb mongosh --quiet -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 || alert mongodb "mongodb ping failed"
  docker exec nabdah-redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG || alert redis "redis ping failed"
  docker exec nabdah-backend wget -qO- http://127.0.0.1:8002/api/v1/health/liveness >/dev/null 2>&1 || alert backend "backend liveness failed"
fi

# disk: alert when less than DISK_MIN_FREE_PCT % of / is available
if [ -n "${MONITOR_DF_OUTPUT:-}" ]; then DF=$MONITOR_DF_OUTPUT; else DF=$(df -Pk /); fi
SIZE_K=$(printf '%s\n' "$DF" | awk 'NR==2{print $2}'); AVAIL_K=$(printf '%s\n' "$DF" | awk 'NR==2{print $4}')
FREE_PCT=$(awk -v a="${AVAIL_K:-0}" -v s="${SIZE_K:-1}" 'BEGIN{printf "%d", (a*100)/s}')
FREE_GB=$(awk -v a="${AVAIL_K:-0}" 'BEGIN{printf "%.1f", a/1048576}')
[ "$FREE_PCT" -lt "$DISK_MIN_FREE_PCT" ] && alert disk "disk / has ${FREE_PCT}% free (${FREE_GB} GB), below ${DISK_MIN_FREE_PCT}%"

if [ "${MONITOR_SKIP_SERVICES:-0}" != 1 ]; then
  RAM=$(free | awk '/Mem:/{printf "%.0f", $3/$2*100}')
  [ "${RAM:-0}" -gt 90 ] && alert ram "ram usage ${RAM}% > 90%"
  LOAD=$(awk '{print $1}' /proc/loadavg)
  [ "$(awk -v l="$LOAD" 'BEGIN{print (l>4)?1:0}')" = "1" ] && alert load "cpu load ${LOAD} > 4"
  for pem in certs/live/live/*/fullchain.pem certs/live/*/fullchain.pem; do
    [ -f "$pem" ] || continue
    name=$(basename "$(dirname "$pem")")
    DAYS=$(( ( $(date -d "$(openssl x509 -enddate -noout -in "$pem" | cut -d= -f2)" +%s) - $(date +%s) ) / 86400 ))
    [ "$DAYS" -lt 14 ] && alert "cert-$name" "ssl cert $name expires in ${DAYS}d"
  done
  LAST=$(ls -t /opt/nabdah/backups/nabd_*.gz 2>/dev/null | head -1)
  if [ -z "$LAST" ]; then
    alert backup "no backups found"
  else
    AGE=$(( ( $(date +%s) - $(stat -c %Y "$LAST") ) / 3600 ))
    [ "$AGE" -gt 26 ] && alert backup "last backup is ${AGE}h old"
  fi
fi

if [ ${#ALERTS[@]} -eq 0 ]; then
  echo "[$TS] OK — all checks passed (disk ${FREE_PCT}% free, ram ${RAM:-?}%, load ${LOAD:-?})" >> "$LOG_DIR/nabdah-monitor.log"
else
  echo "[$TS] ${#ALERTS[@]} alerts: $(printf '%s; ' "${ALERTS[@]}")" >> "$LOG_DIR/nabdah-monitor.log"
fi

# ── e-mail: on a new set of alerts, every ALERT_REPEAT_HOURS while it lasts, and once on recovery ──
send_mail() { # subject body
  if [ -n "${MONITOR_MAIL_CMD:-}" ]; then printf 'SUBJECT: %s\n%s\n' "$1" "$2" | $MONITOR_MAIL_CMD; return; fi
  if [ -z "${RESEND_API_KEY:-}" ] || [ -z "${MAIL_FROM:-}" ]; then
    echo "[$TS] alert mail not sent: RESEND_API_KEY or MAIL_FROM unset" >> "$LOG_DIR/nabdah-alerts.log"; return 1
  fi
  local code
  code=$(python3 -c 'import json,sys; print(json.dumps({"from": sys.argv[1], "to": [sys.argv[2]], "subject": sys.argv[3], "text": sys.argv[4]}))' \
           "$MAIL_FROM" "$OPS_ALERT_EMAIL" "$1" "$2" \
         | curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST https://api.resend.com/emails \
             -H 'Content-Type: application/json' -H @<(printf 'Authorization: Bearer %s\n' "$RESEND_API_KEY") --data-binary @-)
  case "$code" in 20?) return 0 ;; *) echo "[$TS] alert mail failed (HTTP $code)" >> "$LOG_DIR/nabdah-alerts.log"; return 1 ;; esac
}
if [ -n "${OPS_ALERT_EMAIL:-}" ]; then
  mkdir -p "$STATE_DIR" 2>/dev/null
  SIG=$(printf '%s\n' "${KEYS[@]}" | sort -u | tr '\n' ' ' | sed 's/ *$//')
  LAST_SIG=$(cat "$STATE_DIR/last-signature" 2>/dev/null)
  LAST_SENT=$(cat "$STATE_DIR/last-sent" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  if [ ${#ALERTS[@]} -gt 0 ]; then
    if [ "$SIG" != "$LAST_SIG" ] || [ $(( NOW - LAST_SENT )) -ge $(( ALERT_REPEAT_HOURS * 3600 )) ]; then
      BODY="$(hostname) at $TS UTC:"$'\n'"$(printf -- '- %s\n' "${ALERTS[@]}")"
      send_mail "[nabd.plus] ${#ALERTS[@]} alert(s): ${ALERTS[0]:0:80}" "$BODY" \
        && { printf '%s' "$SIG" > "$STATE_DIR/last-signature"; echo "$NOW" > "$STATE_DIR/last-sent"; }
    fi
  elif [ -n "$LAST_SIG" ]; then
    send_mail "[nabd.plus] all checks OK again" "$(hostname) at $TS UTC: all checks passed (disk ${FREE_PCT}% free)." \
      && { : > "$STATE_DIR/last-signature"; echo "$NOW" > "$STATE_DIR/last-sent"; }
  fi
fi
exit 0
