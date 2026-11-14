#!/bin/bash
# Why does nabdah-mongodb restart (run 58: restarts=32 in about 6 hours since it was recreated with the 1200m cap)? READ-ONLY, one run. Prints `status:` lines only:
#   - the container's state: status, ExitCode, OOMKilled, Error (first 80 characters), StartedAt, FinishedAt, RestartCount, the limits it has now
#   - docker events since SINCE (default: today 13:30 UTC, the recreate of run 56) for this container: counts by action / exit code / signal, and the last 12 die / oom / kill events
#   - the cgroup's memory.events (max = times the limit was hit, oom, oom_kill) and the kernel's "Killed process" counts BY COMMAND NAME with the number of lines since SINCE
#   - mongod's own log since SINCE by MESSAGE ID only (id, component, severity and counts; never the message text or a namespace): the top ids and the last 12 non-informational ones
#   - MemAvailable, swap, and the memory the other containers use now
# Nothing is written, nothing is restarted. Secret values never appear: the container's environment is not read.
set -u
SINCE=""
# optional: an RFC3339 time (e.g. 2026-10-30T13:30:00Z) set in this file by the reviewer; empty = today 13:30 UTC
DK="sudo -n docker"
CT=nabdah-mongodb
echo "## mongodb-restarts"
say() { echo "status: mongodb-restarts: $*"; }
[ -n "$SINCE" ] || SINCE=$(date -u -d 'today 13:30' +%Y-%m-%dT%H:%M:%SZ)
SINCE_EPOCH=$(date -u -d "$SINCE" +%s 2>/dev/null || echo 0)
f() { $DK inspect -f "$1" $CT 2>/dev/null; }

say "state: status=$(f '{{.State.Status}}') exit_code=$(f '{{.State.ExitCode}}') oom_killed=$(f '{{.State.OOMKilled}}') error=$(f '{{.State.Error}}' | cut -c1-80) restarts=$(f '{{.RestartCount}}')"
say "times: started=$(f '{{.State.StartedAt}}') finished=$(f '{{.State.FinishedAt}}') restart_policy=$(f '{{.HostConfig.RestartPolicy.Name}}') health=$(f '{{if .State.Health}}{{.State.Health.Status}}{{end}}')"
say "limits now: memory=$(f '{{.HostConfig.Memory}}') memswap=$(f '{{.HostConfig.MemorySwap}}') reservation=$(f '{{.HostConfig.MemoryReservation}}') oom_score_adj=$(f '{{.HostConfig.OomScoreAdj}}')"
say "use now: $($DK stats --no-stream --format '{{.MemUsage}} ({{.MemPerc}})' $CT 2>/dev/null)"

# docker events: action, exit code and signal only
EV=$(timeout 60 $DK events --since "$SINCE" --until "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --filter "container=$CT" --format '{{.Time}} {{.Action}} exit={{index .Actor.Attributes "exitCode"}} signal={{index .Actor.Attributes "signal"}}' 2>/dev/null)
say "events since $SINCE by kind: $(echo "$EV" | awk 'NF {k=$2" "$3" "$4; c[k]++} END {for (k in c) printf "[%s]=%d ", k, c[k]}')"
echo "$EV" | grep -E ' (die|oom|kill) ' | tail -12 | while read -r l; do say "event: $(date -u -d @"${l%% *}" +%H:%M:%S 2>/dev/null) ${l#* }"; done

CID=$(f '{{.Id}}')
for p in /sys/fs/cgroup/system.slice/docker-$CID.scope/memory.events /sys/fs/cgroup/memory/docker/$CID/memory.oom_control; do
  sudo -n test -r "$p" && say "cgroup $(basename "$p"): $(sudo -n cat "$p" | tr '\n' ' ' | cut -c1-200)"
done
KILLS=$(sudo -n dmesg -T 2>/dev/null | grep -i 'killed process' | sed -E 's/.*\(([A-Za-z0-9_.:-]+)\).*/\1/' | sort | uniq -c | sort -rn | head -8 | awk '{printf "%s=%s ", $2, $1}')
say "kernel OOM kills by command (dmesg, whole buffer): ${KILLS:-none visible}"
say "kernel OOM kills of mongod with the cgroup that was full: $(sudo -n dmesg -T 2>/dev/null | grep -ci 'memory cgroup out of memory') cgroup OOM line(s), $(sudo -n dmesg -T 2>/dev/null | grep -ci 'out of memory: killed') global OOM line(s)"

# mongod log by message id only
LOG=$($DK logs --since "$SINCE" $CT 2>&1 | grep '^{' )
say "mongod log lines since $SINCE: $(echo "$LOG" | grep -c .)"
say "top message ids (id component severity count): $(echo "$LOG" | jq -r '[.id, .c, .s] | @tsv' 2>/dev/null | sort | uniq -c | sort -rn | head -10 | awk '{printf "[%s %s %s]x%s ", $2, $3, $4, $1}')"
say "last non-informational ids: $(echo "$LOG" | jq -r 'select(.s != "I" and .s != "D1") | "\(.t["$date"][11:19]) id=\(.id) \(.c) \(.s)"' 2>/dev/null | tail -12 | tr '\n' ';')"
say "startup/shutdown ids seen (23377 signal received, 4784900 shutdown, 4615611 initializing): $(echo "$LOG" | jq -r '.id' 2>/dev/null | grep -E '^(23377|4784900|4615611)$' | sort | uniq -c | awk '{printf "id%s=%s ", $2, $1}')"

say "MemAvailable=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)MB swap_used_mb=$(awk '/SwapTotal/ {t=$2} /SwapFree/ {f=$2} END {print int((t-f)/1024)}' /proc/meminfo)"
say "others now: $($DK stats --no-stream --format '{{.Name}}={{.MemUsage}}' 2>/dev/null | sed 's/ \/ [0-9.]*[A-Za-z]*//' | tr '\n' ' ' | cut -c1-600)"
say "done (read-only)"
