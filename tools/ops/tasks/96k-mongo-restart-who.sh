#!/bin/bash
# WHO restarts mongod? READ-ONLY, one run, `status:` lines only; nothing is written, stopped, restarted or changed. Follow-up to run 109 (96j): restarts 359, cgroup events oom_kill 0, kernel kills 0,
# mongod log 32 starts in 48 h with no signal or shutdown before them. Docker restarts a container that EXITS (restart: unless-stopped); it never restarts one that is only unhealthy.
# So something makes mongod exit without SIGTERM. Candidates this task looks at, each with evidence and no guessing:
#   1 state       the container's own record: RestartCount, StartedAt, FinishedAt, ExitCode, OOMKilled, Error, restart policy, health (docker inspect)
#   2 histogram   starts per hour (mongod log id 4615611, 48 h): are the restarts still happening, or did they stop after the cache/limit change?
#   3 before      for the last SHOW starts: the 3 log lines before it (id, severity, component, first 100 chars of msg): a fatal assertion, a WiredTiger panic, "Out of memory" or nothing at all
#   4 host        who could kill from outside: host uptime and last boots, the docker daemon's journal lines about mongodb (kill / die / OOM / restart), kernel journal OOM lines for mongod,
#                 earlyoom / systemd-oomd units, and the cron/systemd files whose text mentions both mongo and restart/stop/kill (file names only)
set -u
SINCE_H=${SINCE_H:-48}
SHOW=${SHOW:-5}
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
say() { echo "status: mongo-restart-who: $*"; }
echo "## mongo-restart-who (read-only)"

# 1 state
say "state: $($DK inspect -f 'restarts={{.RestartCount}} policy={{.HostConfig.RestartPolicy.Name}} started={{.State.StartedAt}} last_finished={{.State.FinishedAt}} exit_code={{.State.ExitCode}} oom_killed={{.State.OOMKilled}} error={{.State.Error}} health={{.State.Health.Status}}' "$CT" 2>/dev/null | cut -c1-300)"

# 2 histogram, from the log's own timestamps
LOG=$($DK logs --timestamps --since "${SINCE_H}h" "$CT" 2>&1)
say "histogram: starts per hour (UTC) in the last ${SINCE_H} h: $(printf '%s\n' "$LOG" | grep '"id":4615611' | cut -c1-13 | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}' | cut -c1-900)"
say "histogram: total starts=$(printf '%s\n' "$LOG" | grep -c '"id":4615611'); last start line time: $(printf '%s\n' "$LOG" | grep '"id":4615611' | tail -1 | cut -c1-30)"

# 3 what the log says right before the last starts
printf '%s\n' "$LOG" | awk -v n="$SHOW" '
  { buf[NR] = $0 }
  /"id":4615611/ { starts[++k] = NR }
  END { for (i = (k > n ? k - n + 1 : 1); i <= k; i++) { print "START " substr(buf[starts[i]], 1, 30); for (j = starts[i] - 3; j < starts[i]; j++) if (j > 0) print "  " buf[j] } }' \
  | while IFS= read -r l; do
      case "$l" in
        START*) say "before: $l";;
        *) id=$(printf '%s' "$l" | sed -nE 's/.*"id":([0-9]+).*/\1/p'); sev=$(printf '%s' "$l" | sed -nE 's/.*"s":"([A-Z])".*/\1/p'); c=$(printf '%s' "$l" | sed -nE 's/.*"c":"([A-Z]+)".*/\1/p')
           m=$(printf '%s' "$l" | sed -nE 's/.*"msg":"([^"]*)".*/\1/p' | cut -c1-100); say "before:   id=${id:-?} s=${sev:-?} c=${c:-?} msg=${m:-(not a json line)}";;
      esac
    done
say "log markers: fatal_assertions=$(printf '%s\n' "$LOG" | grep -ci 'fatal assertion\|invariant failure') wiredtiger_panics=$(printf '%s\n' "$LOG" | grep -ci 'WT_PANIC\|wiredtiger error') out_of_memory=$(printf '%s\n' "$LOG" | grep -ci 'out of memory\|std::bad_alloc')"

# 4 host
say "host: uptime $(awk '{printf "%d h", $1/3600}' /proc/uptime); boots: $(last -x reboot 2>/dev/null | head -4 | awk 'NF {printf "%s %s %s %s; ", $5, $6, $7, $8}' | cut -c1-200)"
JD=$(sudo -n journalctl -u docker --since "${SINCE_H} hours ago" --no-pager 2>/dev/null | grep -i 'mongodb' | grep -i 'kill\|die\|oom\|restart\|exit' | tail -8 | cut -c1-200)
say "host: docker daemon journal lines about mongodb (last 8): $( [ -n "$JD" ] && echo "$(printf '%s\n' "$JD" | wc -l) shown below" || echo none)"
printf '%s\n' "$JD" | while IFS= read -r l; do [ -n "$l" ] && say "  docker: $l"; done
JK=$(sudo -n journalctl -k --since "${SINCE_H} hours ago" --no-pager 2>/dev/null | grep -i 'out of memory\|killed process' | grep -i 'mongod' | tail -5 | cut -c1-200)
say "host: kernel journal OOM lines for mongod in the window: $(printf '%s\n' "$JK" | grep -c .)"
printf '%s\n' "$JK" | while IFS= read -r l; do [ -n "$l" ] && say "  kernel: $l"; done
for u in earlyoom systemd-oomd; do say "host: unit $u: $(systemctl is-active "$u" 2>/dev/null || echo not-found) / $(systemctl is-enabled "$u" 2>/dev/null || echo not-found)"; done
say "host: earlyoom journal lines in the window: $(sudo -n journalctl -u earlyoom --since "${SINCE_H} hours ago" --no-pager 2>/dev/null | grep -ci 'sending\|killing')"
say "host: files that mention mongo AND restart/stop/kill (names only): $(grep -rlsiE 'mongo' /etc/cron.d /etc/cron.hourly /etc/cron.daily /etc/systemd/system 2>/dev/null | xargs -r grep -lsiE 'restart|stop|kill' 2>/dev/null | tr '\n' ' ' | cut -c1-400)"
say "done (read-only)"
