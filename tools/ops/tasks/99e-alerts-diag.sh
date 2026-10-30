#!/bin/bash
# Why the owner gets alert mails (lead reviewer, 2026-10-29), READ-ONLY. Backup and oplog results of the last 48 h from
# /var/log/nabd-backups.log as COUNTS and failure CLASSES only (never the raw error text), MongoDB container health,
# restarts, uptime and memory, and the deploy times of the last 48 h (a deploy restarts services, which is the usual
# cause of an availability or Mongo alert). Public lines start with "status:".
set -u
DK="sudo -n docker"
LOG=/var/log/nabd-backups.log
say() { echo "status: alerts-diag: $*"; }
since=$(date -u -d '48 hours ago' +%s)

if sudo -n test -f "$LOG"; then
  # each run line starts with "[<date(1) output>]"; keep the lines of the last 48 h
  sudo -n tail -n 20000 "$LOG" | while IFS= read -r l; do
    d=$(printf '%s' "$l" | sed -n 's/^\[\([^]]*\)\].*/\1/p'); [ -n "$d" ] || continue
    t=$(date -u -d "$d" +%s 2>/dev/null) || continue
    [ "$t" -ge "$since" ] && printf '%s\n' "$l"
  done > /tmp/alerts-diag.$$ 2>/dev/null
  c() { grep -ciE "$1" /tmp/alerts-diag.$$ 2>/dev/null || true; }
  say "oplog 48h: uploaded=$(c 'oplog slice uploaded') no_new=$(c 'no new entries') skipped=$(c 'oplog slice skipped') retried=$(c 'retrying once') FAILED=$(c 'FAIL oplog slice') chain_restarts=$(c 'oplog chain started')"
  say "nightly 48h: ok=$(c 'backup (ok|complete|uploaded|done)') FAILED=$(c 'FAIL (backup|nightly)|backup failed')"
  for cls in 'mongodump|dump' 'gpg|passphrase|encrypt' 'upload|r2|s3|aws|bucket|403|signature' 'space|disk|ENOSPC' 'timed? ?out|timeout' 'auth|denied|credential' 'gap|rolled over' 'lock|deploy'; do
    n=$(grep -iE 'FAIL|failed' /tmp/alerts-diag.$$ 2>/dev/null | grep -ciE "$cls" || true)
    [ "${n:-0}" -gt 0 ] && say "failure class /$cls/: $n lines"
  done
  last=$(grep -iE 'FAIL|failed' /tmp/alerts-diag.$$ 2>/dev/null | tail -1 | sed -n 's/^\[\([^]]*\)\].*/\1/p')
  say "last failure line at: ${last:-none in 48h}"
  rm -f /tmp/alerts-diag.$$
else
  say "no $LOG on the host"
fi

st=$($DK inspect -f '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} restarts={{.RestartCount}} started={{.State.StartedAt}} oom={{.State.OOMKilled}}' nabdah-mongodb 2>/dev/null)
say "mongodb container: ${st:-missing}"
$DK stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} mem={{.MemUsage}}' nabdah-mongodb nabdah-backend nabdah-redis nabdah-meilisearch 2>/dev/null | sed 's/^/status: alerts-diag: stats /'
say "host memory: $(free -m | awk '/^Mem:/{print "total="$2"MB available="$7"MB"} /^Swap:/{print "swap_used="$3"MB"}' | tr '\n' ' ')"
say "disk /: $(df -h / | awk 'NR==2{print $5" used, "$4" free"}')"
# kernel OOM kills in the last 48 h (counts only)
say "kernel OOM kills 48h: $(sudo -n journalctl -k --since '48 hours ago' 2>/dev/null | grep -ci 'out of memory\|oom-kill' || echo 0)"
# deploys of the last 48 h (the deploy lock file and the rollback tags carry the times)
say "rollback tags (one per deploy): $($DK images --format '{{.Tag}}' 2>/dev/null | grep -c '^rollback-')"
$DK images --format '{{.Tag}}' 2>/dev/null | grep '^rollback-' | sort -u | tail -6 | sed 's/^/status: alerts-diag: deploy at /'
# uploads: the deploy skips ClamAV on low memory; with UPLOAD_SCAN=defer (run 45b) uploads wait in quarantine for the scan window
mode=$(sudo -n grep -E '^UPLOAD_SCAN=' /opt/nabdah/deploy/.env.production 2>/dev/null | cut -d= -f2 | tr -d '"' | grep -xE 'defer|required|off' || echo unknown)
say "uploads: UPLOAD_SCAN=$mode window_cron=$(sudo -n test -f /etc/cron.d/nabd-clamav-window && echo installed || echo missing) uploads_enabled=$(curl -sk -m 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/config 2>/dev/null | grep -oE '"uploads_enabled" ?: ?[a-z]+' | grep -oE '[a-z]+$')"
exit 0
