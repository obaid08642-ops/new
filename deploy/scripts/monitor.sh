#!/bin/bash
# ═══ Nabdah Plus — production monitoring & alerting (every 15min via cron) ═══
# Alerts are written to /var/log/nabdah-alerts.log and, when OPS_ALERT_EMAIL is set in .env.production, e-mailed
# through Resend (RESEND_API_KEY, MAIL_FROM). A mail goes out when the set of alerts changes, again every
# ALERT_REPEAT_HOURS while it lasts, and once when everything is back to OK. Before 2026-10-15 alerts were only
# logged: the disk reached 2 GB free and nobody was told.
# 2026-10-16 (#1603, after the disk-full outage): two disk levels (warn < 20 % free, critical < 10 % or < 5 GB free), an alert
# when the disk is FILLING (hours left at the recent rate), an alert for any container whose own writable layer passed
# 1 GB or whose logs are not rotated or passed 100 MB, a daily summary mail (also the proof that the monitor and the mail
# path work), and a mail fallback Resend -> Brevo -> Mailjet.
# Test hooks (tools/ops/monitor/test-monitor.sh): MONITOR_DF_OUTPUT, MONITOR_STATE_DIR, MONITOR_LOG_DIR,
# MONITOR_SKIP_SERVICES=1, MONITOR_MAIL_CMD (receives the mail on stdin instead of a provider), MONITOR_NOW_EPOCH,
# MONITOR_CONTAINER_STATS ("name|layer_bytes|log_max_size|log_bytes" lines instead of docker), MONITOR_RESEND_URL,
# MONITOR_BREVO_URL, MONITOR_MAILJET_URL (provider endpoints).
cd "$(dirname "$0")/.." 2>/dev/null || true
set -a; [ -f .env.production ] && source .env.production 2>/dev/null; set +a
TS=$(date '+%Y-%m-%d %H:%M:%S')
LOG_DIR=${MONITOR_LOG_DIR:-/var/log}
STATE_DIR=${MONITOR_STATE_DIR:-/var/lib/nabdah-monitor}
DISK_MIN_FREE_PCT=${DISK_MIN_FREE_PCT:-20}
DISK_CRIT_FREE_PCT=${DISK_CRIT_FREE_PCT:-10}
DISK_CRIT_FREE_GB=${DISK_CRIT_FREE_GB:-5}
DISK_FILL_HOURS=${DISK_FILL_HOURS:-48}        # alert when the recent growth would fill the disk in less than this
DISK_FILL_MIN_MB=${DISK_FILL_MIN_MB:-300}     # ...and the disk lost at least this much over the window (noise guard)
LAYER_MAX_MB=${LAYER_MAX_MB:-1024}            # a container's own writable layer (what it wrote, not its image)
LOG_MAX_MB=${LOG_MAX_MB:-100}                 # one container's json log (the compose cap is 3 x 20 MB)
SUMMARY_HOUR=${MONITOR_SUMMARY_HOUR:-6}       # daily summary mail, first run at or after this UTC hour
ALERT_REPEAT_HOURS=${ALERT_REPEAT_HOURS:-6}
NOW=${MONITOR_NOW_EPOCH:-$(date +%s)}
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
  if docker inspect nabdah-redis-cache >/dev/null 2>&1; then
    st=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' nabdah-redis-cache 2>/dev/null)
    case "$st" in running\ healthy*|"running ") ;; *) alert container-nabdah-redis-cache "container nabdah-redis-cache state=$st" ;; esac
  fi
  docker exec nabdah-mongodb mongosh --quiet -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 || alert mongodb "mongodb ping failed"
  docker exec nabdah-redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG || alert redis "redis ping failed"
  docker exec nabdah-backend wget -qO- http://127.0.0.1:8002/api/v1/health/liveness >/dev/null 2>&1 || alert backend "backend liveness failed"
fi

# disk: alert when less than DISK_MIN_FREE_PCT % of / is available
if [ -n "${MONITOR_DF_OUTPUT:-}" ]; then DF=$MONITOR_DF_OUTPUT; else DF=$(df -Pk /); fi
SIZE_K=$(printf '%s\n' "$DF" | awk 'NR==2{print $2}'); AVAIL_K=$(printf '%s\n' "$DF" | awk 'NR==2{print $4}')
FREE_PCT=$(awk -v a="${AVAIL_K:-0}" -v s="${SIZE_K:-1}" 'BEGIN{printf "%d", (a*100)/s}')
FREE_GB=$(awk -v a="${AVAIL_K:-0}" 'BEGIN{printf "%.1f", a/1048576}')
FREE_GB_X10=$(awk -v a="${AVAIL_K:-0}" 'BEGIN{printf "%d", a*10/1048576}')
if [ "$FREE_PCT" -lt "$DISK_CRIT_FREE_PCT" ] || [ "$FREE_GB_X10" -lt $((DISK_CRIT_FREE_GB * 10)) ]; then
  alert disk-crit "disk / has ${FREE_PCT}% free (${FREE_GB} GB), CRITICAL: below ${DISK_CRIT_FREE_PCT}% or ${DISK_CRIT_FREE_GB} GB"
elif [ "$FREE_PCT" -lt "$DISK_MIN_FREE_PCT" ]; then
  alert disk "disk / has ${FREE_PCT}% free (${FREE_GB} GB), below ${DISK_MIN_FREE_PCT}%"
fi

# disk filling: free space is sampled every run; compare with the sample about 6 h ago (at least 2 h old) and say how many
# hours are left at that rate. The 2026-10-16 outage was 5.8 GB in 18 h (~320 MB/h): visible a day before the disk was full.
mkdir -p "$STATE_DIR" 2>/dev/null
SAMPLES="$STATE_DIR/disk-samples"
if [ -n "${AVAIL_K:-}" ] && [ "$AVAIL_K" -eq "$AVAIL_K" ] 2>/dev/null; then
  echo "$NOW $AVAIL_K" >> "$SAMPLES"
  tail -n 700 "$SAMPLES" > "$SAMPLES.tmp" 2>/dev/null && mv "$SAMPLES.tmp" "$SAMPLES"
fi
FILL=$(awk -v now="$NOW" -v avail="${AVAIL_K:-0}" -v hmax="$DISK_FILL_HOURS" -v minmb="$DISK_FILL_MIN_MB" '
  { if ($1 <= now - 7200 && $1 >= now - 86400) { d = now - 21600; diff = ($1 > d) ? $1 - d : d - $1; if (best == "" || diff < bestdiff) { best = $1; bestavail = $2; bestdiff = diff } } }
  END { if (best == "") exit; hours = (now - best) / 3600; drop = bestavail - avail; if (drop <= minmb * 1024) exit;
        rate = drop / hours; left = avail / rate; if (left < hmax) printf "%.0f %.0f", rate / 1024, left }' "$SAMPLES" 2>/dev/null)
if [ -n "$FILL" ]; then
  alert disk-fill "disk / is filling at $(echo $FILL | cut -d' ' -f1) MB/h: full in about $(echo $FILL | cut -d' ' -f2) h at this rate (${FREE_GB} GB free)"
fi
RATE_NOTE=${FILL:+, filling at $(echo $FILL | cut -d' ' -f1) MB/h}

# containers: own writable layer, log rotation, log size (docker ps -s style). Layers: what a container WROTE, not its image.
container_stats() {
  if [ -n "${MONITOR_CONTAINER_STATS:-}" ]; then printf '%s\n' "$MONITOR_CONTAINER_STATS"; return; fi
  local c
  for c in $(docker ps -aq 2>/dev/null); do
    docker inspect --size -f '{{.Name}}|{{.SizeRw}}|{{index .HostConfig.LogConfig.Config "max-size"}}|{{.LogPath}}' "$c" 2>/dev/null \
      | awk -F'|' '{ cmd = "stat -c %s \"" $4 "\" 2>/dev/null"; cmd | getline sz; close(cmd); gsub("^/", "", $1); printf "%s|%s|%s|%s\n", $1, $2, $3, sz + 0 }'
  done
}
STATS=""
if [ "${MONITOR_SKIP_SERVICES:-0}" != 1 ] || [ -n "${MONITOR_CONTAINER_STATS:-}" ]; then
  STATS=$(container_stats)
  while IFS='|' read -r cname layer logmax logbytes; do
    case "$cname" in nabdah-*) ;; *) continue ;; esac
    [ "${layer:-0}" -gt $((LAYER_MAX_MB * 1048576)) ] 2>/dev/null && alert "layer-$cname" "container $cname has written $(awk -v b="$layer" 'BEGIN{printf "%.1f", b/1073741824}') GB into its own layer (limit ${LAYER_MAX_MB} MB): something grows on the root disk"
    [ -z "$logmax" ] && alert "lognocap-$cname" "container $cname has no log rotation (max-size unset): its log grows for ever"
    [ "${logbytes:-0}" -gt $((LOG_MAX_MB * 1048576)) ] 2>/dev/null && alert "logsize-$cname" "container $cname has a $(awk -v b="$logbytes" 'BEGIN{printf "%.0f", b/1048576}') MB log (limit ${LOG_MAX_MB} MB)"
  done <<< "$STATS"
fi

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
# One mail through the first provider that accepts it: Resend, then Brevo, then Mailjet (the order of the app, PR #1583).
# A provider without its key in .env.production is skipped. Every failure is logged with the provider and the HTTP code.
mail_json() { # provider subject body -> JSON on stdout
  python3 - "$1" "$MAIL_FROM" "$OPS_ALERT_EMAIL" "$2" "$3" <<'PY'
import json, sys
from email.utils import parseaddr
provider, sender, to, subject, text = sys.argv[1:6]
name, addr = parseaddr(sender)
addr = addr or sender
if provider == "resend":
    print(json.dumps({"from": sender, "to": [to], "subject": subject, "text": text}))
elif provider == "brevo":
    print(json.dumps({"sender": {"email": addr, **({"name": name} if name else {})}, "to": [{"email": to}], "subject": subject, "textContent": text}))
else:  # mailjet v3.1
    print(json.dumps({"Messages": [{"From": {"Email": addr, **({"Name": name} if name else {})}, "To": [{"Email": to}], "Subject": subject, "TextPart": text}]}))
PY
}
mail_via() { # provider subject body -> 0 sent, 1 failed, 2 not configured
  local p=$1 code url
  case "$p" in
    resend)  [ -n "${RESEND_API_KEY:-}" ] || return 2; url=${MONITOR_RESEND_URL:-https://api.resend.com/emails}
      code=$(mail_json resend "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$url" \
               -H 'Content-Type: application/json' -H @<(printf 'Authorization: Bearer %s\n' "$RESEND_API_KEY") --data-binary @-) ;;
    brevo)   [ -n "${BREVO_API_KEY:-}" ] || return 2; url=${MONITOR_BREVO_URL:-https://api.brevo.com/v3/smtp/email}
      code=$(mail_json brevo "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$url" \
               -H 'Content-Type: application/json' -H @<(printf 'api-key: %s\n' "$BREVO_API_KEY") --data-binary @-) ;;
    mailjet) { [ -n "${MAILJET_API_KEY:-}" ] && [ -n "${MAILJET_SECRET_KEY:-}" ]; } || return 2; url=${MONITOR_MAILJET_URL:-https://api.mailjet.com/v3.1/send}
      code=$(mail_json mailjet "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$url" \
               -H 'Content-Type: application/json' -K <(printf 'user = "%s:%s"\n' "$MAILJET_API_KEY" "$MAILJET_SECRET_KEY") --data-binary @-) ;;
  esac
  case "$code" in 20?) return 0 ;; *) echo "[$TS] alert mail failed via $p (HTTP ${code:-none})" >> "$LOG_DIR/nabdah-alerts.log"; return 1 ;; esac
}
send_mail() { # subject body
  if [ -n "${MONITOR_MAIL_CMD:-}" ]; then printf 'SUBJECT: %s\n%s\n' "$1" "$2" | $MONITOR_MAIL_CMD; return; fi
  if [ -z "${MAIL_FROM:-}" ]; then echo "[$TS] alert mail not sent: MAIL_FROM unset" >> "$LOG_DIR/nabdah-alerts.log"; return 1; fi
  local p r any=0
  for p in resend brevo mailjet; do
    mail_via "$p" "$1" "$2"; r=$?
    [ $r = 0 ] && return 0
    [ $r = 1 ] && any=1
  done
  [ $any = 0 ] && echo "[$TS] alert mail not sent: no provider key set (RESEND_API_KEY, BREVO_API_KEY, MAILJET_API_KEY/MAILJET_SECRET_KEY)" >> "$LOG_DIR/nabdah-alerts.log"
  return 1
}
if [ -n "${OPS_ALERT_EMAIL:-}" ]; then
  mkdir -p "$STATE_DIR" 2>/dev/null
  SIG=$(printf '%s\n' "${KEYS[@]}" | sort -u | tr '\n' ' ' | sed 's/ *$//')
  LAST_SIG=$(cat "$STATE_DIR/last-signature" 2>/dev/null)
  LAST_SENT=$(cat "$STATE_DIR/last-sent" 2>/dev/null || echo 0)
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

# ── daily summary: one mail a day (first run at or after SUMMARY_HOUR UTC), alerts or not. It is also the heartbeat: a day
# without it means the monitor, cron or the mail path is broken. ──
if [ -n "${OPS_ALERT_EMAIL:-}" ]; then
  TODAY=$(date -u -d "@$NOW" +%F); HOUR=$(date -u -d "@$NOW" +%H)
  if [ "$(cat "$STATE_DIR/last-summary" 2>/dev/null)" != "$TODAY" ] && [ $((10#$HOUR)) -ge "$SUMMARY_HOUR" ]; then
    TOP=$(printf '%s\n' "$STATS" | awk -F'|' 'NF>=2 && $2+0>0 {printf "%d %s\n", $2/1048576, $1}' | sort -rn | head -3 | awk '{printf "  %s: %s MB written to its layer\n", $2, $1}')
    BODY="$(hostname) daily summary, $TODAY UTC:"$'\n'"- disk /: ${FREE_PCT}% free (${FREE_GB} GB)${RATE_NOTE:-}"$'\n'
    BODY+="- open alerts: ${#ALERTS[@]}"$'\n'
    [ ${#ALERTS[@]} -gt 0 ] && BODY+="$(printf '  - %s\n' "${ALERTS[@]}")"$'\n'
    [ -n "$TOP" ] && BODY+="- biggest container layers:"$'\n'"$TOP"$'\n'
    [ -n "${AGE:-}" ] && BODY+="- last backup: ${AGE} h old"$'\n'
    BODY+="This mail comes once a day. If it stops, the monitor (cron) or the mail providers are broken."
    send_mail "[nabd.plus] daily summary: disk ${FREE_PCT}% free, ${#ALERTS[@]} alert(s)" "$BODY" && echo "$TODAY" > "$STATE_DIR/last-summary"
  fi
fi
exit 0
