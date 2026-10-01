#!/usr/bin/env bash
# Disk usage alert (Phase 10 platform): exit 1 and print ALERT to stderr when the
# root volume is at or above DISK_ALERT_THRESHOLD percent (default 80).
#   0 = below the threshold, 1 = alert, 2 = could not check (fails closed).
# Cron on the host, next to deploy/scripts/monitor.sh:
#   */15 * * * * /opt/nabdah/backend/scripts/disk-alert.sh || <notify>
THRESHOLD="${DISK_ALERT_THRESHOLD:-80}"
if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]] || (( THRESHOLD < 1 || THRESHOLD > 100 )); then
  echo "disk-alert: DISK_ALERT_THRESHOLD must be an integer 1-100 (got '$THRESHOLD')" >&2
  exit 2
fi
USAGE=$(df -P / 2>/dev/null | awk 'NR==2 { gsub("%", "", $5); print $5 }')
if ! [[ "$USAGE" =~ ^[0-9]+$ ]]; then
  echo "disk-alert: could not determine disk usage" >&2
  exit 2
fi
if (( USAGE >= THRESHOLD )); then
  echo "ALERT: disk usage ${USAGE}% >= ${THRESHOLD}%" >&2
  exit 1
fi
echo "OK: disk usage ${USAGE}% < ${THRESHOLD}%"
