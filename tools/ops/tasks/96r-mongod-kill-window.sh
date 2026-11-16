#!/bin/bash
# WHAT ran in the minutes before mongod was killed, and did the nightly backup leave a file? READ-ONLY, `status:` lines only; nothing is written, stopped, restarted or changed. Names, counts, sizes, times:
# no document content, no query values, no credentials (the slow-query lines are cut to ns / command name / plan / counters, never the filter).
# Follow-up to run 130 (mongod killed at its 1.6 GB cgroup limit 6 times 03:46:40-03:47:36 UTC on 2026-11-16, "last nightly 0 MB"). 96k says WHO restarts mongod; this says WHAT it was doing just before.
#   1 kills      kernel journal: every OOM kill of mongod in the window (time, anon-rss) and the cgroup's memory events
#   2 window     for the last SHOW mongod starts: per minute in the WINDOW_MIN minutes before the start: connections accepted / closed, slow operations (id 51803), and the slowest 5 of them
#                (duration, ns, command, plan, docs examined, sort stage, spilled to disk, appName) so a heavy aggregation, a COLLSCAN or a reconnect storm shows with numbers
#   3 clients    errors per minute in the backend and the worker logs in the same window (is it a restart storm: every client reconnecting and retrying?)
#   4 backup     the newest nightly files (names, bytes, mtime: encrypted .gz.gpg included), the backup log lines of the last runs, one-off containers that exist now
set -u
SINCE_H=${SINCE_H:-48}
SHOW=${SHOW:-3}
WINDOW_MIN=${WINDOW_MIN:-6}
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
BLOG=${OPS_BACKUP_LOG:-/var/log/nabd-backups.log}
say() { echo "status: mongod-kill-window: $*"; }
echo "## mongod-kill-window (read-only)"

# 1 kernel kills
JK=$(sudo -n journalctl -k --since "${SINCE_H} hours ago" --no-pager 2>/dev/null | grep -iE 'Killed process .*mongod|Memory cgroup out of memory.*mongod|oom-kill:.*mongod' | cut -c1-260)
say "kills: kernel OOM lines for mongod in the last ${SINCE_H} h: $(printf '%s\n' "$JK" | grep -c .)"
printf '%s\n' "$JK" | grep -i 'killed process' | tail -8 | while IFS= read -r l; do say "  kill: $l"; done
say "cgroup: $(sudo -n sh -c "cat /sys/fs/cgroup/system.slice/docker-\$(docker inspect -f '{{.Id}}' $CT 2>/dev/null).scope/memory.events 2>/dev/null" | tr '\n' ' ' | cut -c1-200)"

# 2 the minutes before the last starts
LOG=$($DK logs --timestamps --since "${SINCE_H}h" "$CT" 2>&1)
STARTS=$(printf '%s\n' "$LOG" | grep '"id":4615611' | cut -c1-19 | tail -n "$SHOW")
say "starts: last $SHOW mongod starts (UTC): $(printf '%s\n' "$STARTS" | tr '\n' ' ')"
for T in $STARTS; do
  HI=$(date -u -d "${T/T/ } UTC" +%Y-%m-%dT%H:%M 2>/dev/null) || continue
  LO=$(date -u -d "${T/T/ } UTC - ${WINDOW_MIN} minutes" +%Y-%m-%dT%H:%M 2>/dev/null) || continue
  say "window: ${LO} .. ${HI} (before the start at $T)"
  W=$(printf '%s\n' "$LOG" | awk -v lo="$LO" -v hi="$HI" '{ k = substr($1, 1, 16); if (k >= lo && k <= hi) print }')
  printf '%s\n' "$W" | awk '
    { k = substr($1, 1, 16) }
    /"id":22943/ { acc[k]++ } /"id":22944/ { cl[k]++ } /"id":51803/ { slow[k]++ } { seen[k] = 1 }
    END { for (k in seen) printf "%s accepted=%d closed=%d slow_ops=%d\n", k, acc[k], cl[k], slow[k] }' | sort | while IFS= read -r l; do say "  minute: $l"; done
  printf '%s\n' "$W" | grep '"id":51803' | while IFS= read -r l; do
    d=$(printf '%s' "$l" | sed -nE 's/.*"durationMillis":([0-9]+).*/\1/p' | head -1)
    ns=$(printf '%s' "$l" | sed -nE 's/.*"ns":"([^"]*)".*/\1/p' | head -1)
    ty=$(printf '%s' "$l" | sed -nE 's/.*"type":"([^"]*)".*/\1/p' | head -1)
    pl=$(printf '%s' "$l" | sed -nE 's/.*"planSummary":"([^"]*)".*/\1/p' | head -1)
    de=$(printf '%s' "$l" | sed -nE 's/.*"docsExamined":([0-9]+).*/\1/p' | head -1)
    so=$(printf '%s' "$l" | grep -c '"hasSortStage":true')
    ud=$(printf '%s' "$l" | grep -c '"usedDisk":true')
    an=$(printf '%s' "$l" | sed -nE 's/.*"appName":"([^"]*)".*/\1/p' | head -1)
    echo "${d:-0} ns=${ns:-?} type=${ty:-?} plan=${pl:-?} docs=${de:-?} sort=${so} disk=${ud} app=${an:-?}"
  done | sort -rn | head -5 | while IFS= read -r l; do say "  slow: ${l}ms"; done
  say "  app connections in the window: $(printf '%s\n' "$W" | grep '"id":51800' | sed -nE 's/.*"appName":"([^"]*)".*/\1/p' | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}' | cut -c1-300)"
  for C in nabdah-backend nabdah-worker; do
    n=$($DK logs --timestamps --since "${SINCE_H}h" "$C" 2>&1 | awk -v lo="$LO" -v hi="$HI" '{ k = substr($1, 1, 16); if (k >= lo && k <= hi && /ERROR|MongoNotConnected|MongoServerSelection|MongoNetwork/) c[k]++ } END { for (k in c) printf "%s=%d ", substr(k, 12), c[k] }')
    say "  clients: ${C} error lines per minute: ${n:-none}"
  done
done

# 4 the backup
say "backup: newest nightly files in $B (encrypted .gz.gpg and plain .gz; .oplogts and .suspect shown separately)"
sudo -n sh -c "ls -lt --time-style=long-iso $B 2>/dev/null | grep -E 'nabd_' | head -6" | awk '{printf "%s %s %s bytes %s\n", $6, $7, $5, $8}' | while IFS= read -r l; do say "  file: $l"; done
say "backup: backup log $BLOG: $(sudo -n sh -c "test -r $BLOG && wc -l < $BLOG || echo unreadable")"
sudo -n sh -c "grep -E 'mongodump|local backup|off-server|FAIL|WARN|done\\.' $BLOG 2>/dev/null | tail -12" | cut -c1-200 | while IFS= read -r l; do say "  log: $l"; done
say "backup: one-off or dump containers now: $($DK ps -a --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -iE 'dump|oneoff|one-off|clamav' | tr '\n' ';' | cut -c1-300)"
say "done (read-only)"
