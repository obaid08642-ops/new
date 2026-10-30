#!/bin/bash
# Memory report of the host and its containers, as `status:` lines (names and numbers only; never an environment value).
# Run by deploy.sh after the health check and usable by hand:  bash deploy/scripts/memory-report.sh
# It never fails a deploy: it prints what it sees and WARN lines for the three signs of the memory trouble of 2026-10-30
# (low MemAvailable, swap in use, kernel OOM kills / container restarts). Test hooks: MEMREPORT_MEMINFO, MEMREPORT_DOCKER (a command), MEMREPORT_DMESG.
MEMINFO=${MEMREPORT_MEMINFO:-/proc/meminfo}
DK=${MEMREPORT_DOCKER:-docker}
MIN_AVAILABLE_MB=${MEMREPORT_MIN_AVAILABLE_MB:-700}
MAX_SWAP_MB=${MEMREPORT_MAX_SWAP_MB:-256}
kb() { awk -v k="$1:" '$1==k {print $2}' "$MEMINFO" 2>/dev/null; }
mb() { echo $(( ${1:-0} / 1024 )); }

total=$(mb "$(kb MemTotal)"); avail=$(mb "$(kb MemAvailable)")
swap_total=$(mb "$(kb SwapTotal)"); swap_free=$(mb "$(kb SwapFree)"); swap_used=$(( swap_total - swap_free ))
echo "status: memory host total=${total}MB available=${avail}MB swap_used=${swap_used}MB of ${swap_total}MB"
[ "$avail" -lt "$MIN_AVAILABLE_MB" ] && echo "status: WARN memory available ${avail}MB is under ${MIN_AVAILABLE_MB}MB: the kernel will kill something"
[ "$swap_used" -gt "$MAX_SWAP_MB" ] && echo "status: WARN memory swap in use ${swap_used}MB (over ${MAX_SWAP_MB}MB): a database or cache that is swapped out answers slowly"

oom=$( { ${MEMREPORT_DMESG:-dmesg} 2>/dev/null || journalctl -k --since "48 hours ago" 2>/dev/null; } | grep -ci "out of memory: kill\|oom-kill:" )
echo "status: memory kernel_oom_kills_in_log=${oom:-0}"
[ "${oom:-0}" -gt 0 ] && echo "status: WARN memory the kernel log holds ${oom} OOM kill line(s): see dmesg for which process"

# per container: limit, current use, restarts, OOMKilled, oom_score_adj (docker reports bytes; 0 = no limit)
for c in $($DK ps --format '{{.Names}}' 2>/dev/null | sort); do
  line=$($DK inspect -f '{{.HostConfig.Memory}} {{.HostConfig.MemoryReservation}} {{.RestartCount}} {{.State.OOMKilled}} {{.HostConfig.OomScoreAdj}}' "$c" 2>/dev/null) || continue
  read -r limit reserv restarts oomk adj <<<"$line"
  use=$($DK stats --no-stream --format '{{.MemUsage}}' "$c" 2>/dev/null | awk -F' / ' '{print $1}')
  lim_txt="none"; [ "${limit:-0}" -gt 0 ] && lim_txt="$(( limit / 1048576 ))MB"
  res_txt="none"; [ "${reserv:-0}" -gt 0 ] && res_txt="$(( reserv / 1048576 ))MB"
  echo "status: memory container=$c use=${use:-?} limit=$lim_txt reservation=$res_txt restarts=${restarts:-?} oom_killed=${oomk:-?} oom_score_adj=${adj:-?}"
  [ "$lim_txt" = none ] && echo "status: WARN memory container=$c has no memory limit"
  [ "${oomk:-false}" = true ] && echo "status: WARN memory container=$c was OOM-killed (cgroup limit)"
  [ "${restarts:-0}" -gt 0 ] && echo "status: WARN memory container=$c restarted ${restarts} time(s) since it was created"
done
exit 0
