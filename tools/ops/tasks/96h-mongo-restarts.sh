#!/bin/bash
# Why does nabdah-mongodb restart (ops run 105: restarts=296, started=2026-11-08T13:04:29Z, oom_killed=false, MemAvailable 1259 MB, no kernel kills; the pre-deploy dump of run 104 failed at 13:03)?
# READ-ONLY, one run, `status:` lines only; nothing is written, stopped or restarted. Unlike 96b-mongodb-restarts.sh (fixed to one day in October) it looks at a window you can set (SINCE_H, default 48 h) and adds
# the health history and the log around the last restart. What it prints:
#   1 state       RestartCount, status, ExitCode, Error, StartedAt, FinishedAt, restart policy, health status. NOTE: docker resets State.OOMKilled at every restart, so "oom_killed=false" proves nothing about the
#                 earlier restarts: use the die/oom EVENT counts below
#   2 events      `docker events` for the container over SINCE_H hours: die events counted by exit code (0 = clean stop, 137 = SIGKILL usually the OOM killer, 1/2/14 = mongod crashed or failed an assertion, 143 = SIGTERM),
#                 oom events, and the last 5 die events with time, exit code and signal; the time between the last restarts (a loop of seconds vs a restart every few hours)
#   3 health      the health check's interval/timeout/retries/start_period (NEVER the test command: it carries the password) and the last 5 results (time, exit code, seconds)
#   4 memory      the limit, the use now, the cgroup's memory.events (max = times the limit was hit, oom_kill) and the kernel's kill counts by command name
#   5 log         the last 30 mongod log lines before the last restart (time, severity, component, id, message cut at 90 chars) with IP addresses, user and password masked
# Credentials are read from the container's own environment only to mask them; they are never printed.
set -u
SINCE_H=48
DK="sudo -n docker"
CT=${MONGO_CONTAINER:-nabdah-mongodb}
echo "## mongo-restarts"
say() { echo "status: mongo-restarts: $*"; }
f() { $DK inspect -f "$1" "$CT" 2>/dev/null; }
MU=$($DK exec "$CT" printenv MONGO_INITDB_ROOT_USERNAME 2>/dev/null < /dev/null); MP=$($DK exec "$CT" printenv MONGO_INITDB_ROOT_PASSWORD 2>/dev/null < /dev/null)
mask() { # stdin -> masked
  local l
  while IFS= read -r l || [ -n "$l" ]; do
    [ -n "$MP" ] && l=${l//"$MP"/<hidden>}
    [ -n "$MU" ] && l=${l//"$MU"/<user>}
    printf '%s\n' "$l" | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}(:[0-9]+)?/<ip>/g; s/([0-9a-fA-F]{0,4}:){3,7}[0-9a-fA-F]{0,4}/<ip6>/g; s#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g'
  done
}

# 1 state
say "state: status=$(f '{{.State.Status}}') restarts=$(f '{{.RestartCount}}') exit_code=$(f '{{.State.ExitCode}}') error=$(f '{{.State.Error}}' | cut -c1-80) oom_killed_now=$(f '{{.State.OOMKilled}}') (reset at every restart)"
say "times: started=$(f '{{.State.StartedAt}}') finished=$(f '{{.State.FinishedAt}}') restart_policy=$(f '{{.HostConfig.RestartPolicy.Name}}') health=$(f '{{if .State.Health}}{{.State.Health.Status}}{{end}}') created=$(f '{{.Created}}')"

# 2 events
NOW_E=$(date -u +%s); FROM=$((NOW_E - SINCE_H * 3600))
EV=$(timeout 90 $DK events --since "$FROM" --until "$NOW_E" --filter "container=$CT" --filter event=die --filter event=oom --format '{{.Time}} {{.Action}} exit={{index .Actor.Attributes "exitCode"}} signal={{index .Actor.Attributes "signal"}}' 2>/dev/null)
say "window: last ${SINCE_H} h; die events by exit code: $(echo "$EV" | awk '$2=="die" {c[$3]++} END {for (k in c) printf "[%s]=%d ", k, c[k]}')"
say "oom events in the window: $(echo "$EV" | grep -c ' oom ')"
echo "$EV" | grep ' die ' | tail -5 | while read -r l; do say "last die: $(date -u -d @"${l%% *}" +%FT%TZ 2>/dev/null) ${l#* }"; done
GAPS=$(echo "$EV" | awk '$2=="die" {if (p) g[++n]=$1-p; p=$1} END {for (i=(n>5?n-4:1); i<=n; i++) printf "%ds ", g[i]}')
say "seconds between the last die events: ${GAPS:-none}"

# 3 health
say "health check config: $(f '{{if .Config.Healthcheck}}interval={{.Config.Healthcheck.Interval}} timeout={{.Config.Healthcheck.Timeout}} retries={{.Config.Healthcheck.Retries}} start_period={{.Config.Healthcheck.StartPeriod}}{{else}}none{{end}}') (the test command is not shown: it carries the password)"
if command -v jq >/dev/null 2>&1; then
  say "last 5 health results: $($DK inspect -f '{{json .State.Health.Log}}' "$CT" 2>/dev/null | jq -r '.[-5:][]? | "\(.Start[11:19]) exit=\(.ExitCode)"' 2>/dev/null | tr '\n' ' ') failing_streak=$(f '{{if .State.Health}}{{.State.Health.FailingStreak}}{{end}}')"
else say "last 5 health results: jq is not installed on the host"; fi

# 4 memory
say "memory: limit=$(f '{{.HostConfig.Memory}}') memswap=$(f '{{.HostConfig.MemorySwap}}') use now: $($DK stats --no-stream --format '{{.MemUsage}} ({{.MemPerc}})' "$CT" 2>/dev/null)"
CID=$(f '{{.Id}}')
for p in /sys/fs/cgroup/system.slice/docker-$CID.scope/memory.events /sys/fs/cgroup/memory/docker/$CID/memory.oom_control; do
  sudo -n test -r "$p" && say "cgroup $(basename "$p"): $(sudo -n cat "$p" | tr '\n' ' ' | cut -c1-200)"
done
KILLS=$(sudo -n dmesg -T 2>/dev/null | grep -i 'killed process' | sed -E 's/.*\(([A-Za-z0-9_.:-]+)\).*/\1/' | sort | uniq -c | sort -rn | head -6 | awk '{printf "%s=%s ", $2, $1}')
say "kernel kills by command (whole buffer): ${KILLS:-none visible}; MemAvailable=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo)MB"

# 5 log before the last restart
STARTED=$(f '{{.State.StartedAt}}'); SE=$(date -u -d "$STARTED" +%s 2>/dev/null || echo 0)
if [ "$SE" -gt 0 ]; then
  say "mongod log: the last 30 lines in the 3 minutes before the start at $STARTED (IPs, user and password masked)"
  $DK logs --since "$((SE - 180))" --until "$SE" "$CT" 2>&1 | tail -n 30 | while IFS= read -r line; do
    if command -v jq >/dev/null 2>&1 && printf '%s' "$line" | jq -e . >/dev/null 2>&1; then
      printf '%s' "$line" | jq -r '"\(.t["$date"][11:19]) \(.s) \(.c) id=\(.id) \(.msg[0:90])"' 2>/dev/null
    else printf '%s\n' "${line:0:120}"; fi
  done | mask | while IFS= read -r l; do say "  | ${l:0:200}"; done
else say "mongod log: no StartedAt"; fi
say "done (read-only)"
