#!/bin/bash
# READ-ONLY: nabdah-mongodb state after run 68 ("connection to :27017 closed" during the translations apply). Names and counts only.
set -u
DK="sudo -n docker"; CT=nabdah-mongodb
f() { $DK inspect -f "$1" $CT 2>/dev/null; }
echo "status: mongo-state: status=$(f '{{.State.Status}}') started_at=$(f '{{.State.StartedAt}}') restarts=$(f '{{.RestartCount}}') oom_killed=$(f '{{.State.OOMKilled}}') exit_code=$(f '{{.State.ExitCode}}') health=$(f '{{.State.Health.Status}}')"
echo "status: mongo-state: limit_bytes=$(f '{{.HostConfig.Memory}}') use=$($DK stats --no-stream --format '{{.MemUsage}} ({{.MemPerc}})' $CT 2>/dev/null)"
echo "status: mongo-state: memory.events: $($DK exec $CT sh -c 'cat /sys/fs/cgroup/memory.events 2>/dev/null' | tr '\n' ' ')"
echo "status: mongo-state: kernel OOM kills in the last 3 h (process names): $(sudo -n journalctl -k --since '-3h' 2>/dev/null | grep -o 'Killed process [0-9]* ([^)]*)' | sed 's/Killed process [0-9]* //' | sort | uniq -c | tr '\n' ' ')"
echo "status: mongo-state: worker restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-worker 2>/dev/null) oom_killed=$($DK inspect -f '{{.State.OOMKilled}}' nabdah-worker 2>/dev/null)"
echo "status: mongo-state: MemAvailable=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo)MB"
