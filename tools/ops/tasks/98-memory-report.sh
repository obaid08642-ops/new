#!/bin/bash
# Host memory report (run 69: nabdah-mongodb restarted at 06:00:13 UTC although its own cgroup memory.events are all 0: the HOST is out of memory, the kernel killed
# "mongod" 15 times and "meilisearch" 11 times in 3 hours, MemAvailable 535 MB). READ-ONLY, one run. Prints `status:` lines only: names, numbers, never an environment or a log text.
#   1. host: MemTotal, MemAvailable, swap (total, free, swappiness), the sums of the containers' limits, reservations and current use
#   2. per container (running and stopped): limit, reservation, swap allowance, current use and peak, configured oom_score_adj AND the value the container's main process really has
#      (/proc/<pid>/oom_score_adj, /proc/<pid>/oom_score), OOMKilled, restarts, and its cgroup's memory.events (max, oom, oom_kill)
#   3. the kernel's OOM kills in the last HOURS hours (journalctl -k; dmesg when there is no journal): by command AND oom_score_adj the victim had, by constraint (CONSTRAINT_NONE = the
#      whole host was out of memory, CONSTRAINT_MEMCG = one container hit its own limit), by the container the victim ran in, and the last kills with time and size
#   4. why the kernel picks what it picks: the processes with the highest oom_score now, and a verdict about mongod (did -900 reach the killed process, and was it nabdah-mongodb at all)
# Nothing is written, nothing is restarted.
set -u
HOURS=${OPS_OOM_HOURS:-3}
PROC=${OPS_PROC:-/proc}
CG=${OPS_CGROUP:-/sys/fs/cgroup}
DK="sudo -n docker"
SUDO="sudo -n"
echo "## memory-report"
say() { echo "status: memory-report: $*"; }
mb() { echo $(( ($1 + 524288) / 1048576 )); }
mi() { awk -v k="$1:" '$1 == k {print $2}' "$PROC/meminfo" 2>/dev/null; }

# ---- 1. host
TOTAL=$(mi MemTotal); AVAIL=$(mi MemAvailable); SWT=$(mi SwapTotal); SWF=$(mi SwapFree)
say "host: MemTotal $(( ${TOTAL:-0} / 1024 )) MB, MemAvailable $(( ${AVAIL:-0} / 1024 )) MB, SwapTotal $(( ${SWT:-0} / 1024 )) MB, SwapFree $(( ${SWF:-0} / 1024 )) MB, vm.swappiness $(cat "$PROC/sys/vm/swappiness" 2>/dev/null || echo ?), vm.overcommit_memory $(cat "$PROC/sys/vm/overcommit_memory" 2>/dev/null || echo ?)"

# ---- 2. containers
cgfile() {   # cgfile <container id> <file>: the cgroup v2 (systemd or cgroupfs driver) or v1 path of one memory file
  local id=$1 f=$2 p
  for p in "$CG/system.slice/docker-$id.scope/$f" "$CG/docker/$id/$f" "$CG/memory/docker/$id/memory.${f#memory.}"; do
    $SUDO test -r "$p" && { $SUDO cat "$p" 2>/dev/null; return 0; }
  done
  return 1
}
evk() { echo "$1" | awk -v k="$2" '$1 == k {print $2}'; }
declare -A NAME_OF   # container id (12) -> name
SUM_LIMIT=0; SUM_RES=0; SUM_USE=0; N_RUN=0
IDS=$($DK ps -aq --no-trunc 2>/dev/null)
for id in $IDS; do
  line=$($DK inspect -f '{{.Name}}|{{.State.Status}}|{{.State.Pid}}|{{.HostConfig.Memory}}|{{.HostConfig.MemoryReservation}}|{{.HostConfig.MemorySwap}}|{{.HostConfig.OomScoreAdj}}|{{.State.OOMKilled}}|{{.RestartCount}}' "$id" 2>/dev/null) || continue
  IFS='|' read -r name state pid lim res swp adj oomk restarts <<< "$line"
  name=${name#/}; NAME_OF[${id:0:12}]=$name
  [ "$lim" -gt 0 ] 2>/dev/null && limmb=$(mb "$lim") || limmb=none
  [ "${res:-0}" -gt 0 ] 2>/dev/null && resmb=$(mb "$res") || resmb=none
  if [ "${swp:-0}" = -1 ]; then swap="unlimited"; elif [ "${swp:-0}" = 0 ]; then swap="default(2x limit if the host has swap)"; elif [ "${swp:-0}" = "${lim:-x}" ]; then swap="0 (off swap)"; else swap="$(mb $(( swp - lim ))) MB"; fi
  cur=$(cgfile "$id" memory.current); peak=$(cgfile "$id" memory.peak); ev=$(cgfile "$id" memory.events)
  [ -n "$cur" ] && curmb=$(mb "$cur") || curmb="?"
  [ -n "$peak" ] && peakmb=$(mb "$peak") || peakmb="n/a"
  eff="-"; score="-"
  if [ "$state" = running ] && [ "${pid:-0}" -gt 0 ]; then
    eff=$($SUDO cat "$PROC/$pid/oom_score_adj" 2>/dev/null || echo ?); score=$($SUDO cat "$PROC/$pid/oom_score" 2>/dev/null || echo ?)
    N_RUN=$((N_RUN+1)); [ "$limmb" != none ] && SUM_LIMIT=$((SUM_LIMIT+limmb)); [ "$resmb" != none ] && SUM_RES=$((SUM_RES+resmb)); [ "$curmb" != "?" ] && SUM_USE=$((SUM_USE+curmb))
  fi
  flag=""; [ "$state" = running ] && [ "$eff" != "$adj" ] && flag=" ADJ-MISMATCH(configured $adj, process has $eff)"
  say "container $name: state=$state limit=${limmb}MB reservation=${resmb}MB swap_allowance=$swap use_now=${curmb}MB peak=${peakmb}MB oom_score_adj configured=$adj process=$eff oom_score=$score oom_killed=$oomk restarts=$restarts cgroup_events[max=$(evk "$ev" max) oom=$(evk "$ev" oom) oom_kill=$(evk "$ev" oom_kill)]$flag"
done
say "containers running: $N_RUN; sum of limits ${SUM_LIMIT} MB, sum of reservations ${SUM_RES} MB, sum of current use ${SUM_USE} MB (host MemTotal $(( ${TOTAL:-0} / 1024 )) MB)"

# ---- 3. the kernel's OOM kills
KLOG=$($SUDO journalctl -k --since "-${HOURS}h" --no-pager 2>/dev/null)
SRC="journalctl -k, last ${HOURS}h"
if ! printf '%s' "$KLOG" | grep -qi 'killed process\|oom-kill'; then KLOG=$($SUDO dmesg -T 2>/dev/null); SRC="dmesg, the whole buffer (no journal)"; fi
KILLED=$(printf '%s\n' "$KLOG" | grep -i 'Killed process')
say "kernel OOM kills ($SRC): $(printf '%s\n' "$KILLED" | grep -c .)"
[ -n "$KILLED" ] && printf '%s\n' "$KILLED" | sed -E 's/.*Killed process [0-9]+ \(([^)]*)\).*oom_score_adj:(-?[0-9]+).*/\1 adj=\2/; t; s/.*Killed process [0-9]+ \(([^)]*)\).*/\1 adj=?/' | sort | uniq -c | sort -rn | head -8 \
  | while read -r n what; do say "kills by command and the oom_score_adj the victim had: $what x$n"; done
CONS=$(printf '%s\n' "$KLOG" | grep -o 'oom-kill:constraint=[A-Z_]*' | sed 's/.*=//' | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}')
say "kills by constraint: ${CONS:-none visible} (CONSTRAINT_NONE = the host ran out, CONSTRAINT_MEMCG = a container hit its own limit)"
printf '%s\n' "$KLOG" | grep -o 'task_memcg=[^,]*,task=[A-Za-z0-9_.:-]*' | while IFS= read -r l; do
  cg=${l#task_memcg=}; cg=${cg%%,*}; t=${l##*task=}; cid=$(printf '%s' "$cg" | grep -oE '[0-9a-f]{64}' | head -1)
  echo "${NAME_OF[${cid:0:12}]:-unknown(${cid:0:12})} $t"
done | sort | uniq -c | sort -rn | head -8 | while read -r n c t; do say "kills by the container the victim ran in: $t in $c x$n"; done
[ -n "$KILLED" ] && printf '%s\n' "$KILLED" | tail -6 | while IFS= read -r l; do
  ts=$(printf '%s' "$l" | grep -oE '^\[[^]]*\]|^[A-Z][a-z]{2} [0-9 ]{2} [0-9:]{8}' | head -1)
  say "kill: ${ts} $(printf '%s' "$l" | sed -E 's/.*Killed process ([0-9]+) \(([^)]*)\) total-vm:([0-9]+)kB, anon-rss:([0-9]+)kB.*oom_score_adj:(-?[0-9]+).*/\2 pid=\1 anon_rss=\4kB oom_score_adj=\5/' | cut -c1-120)"
done

# ---- 4. why this victim
say "highest oom_score now (the kernel kills the highest first; score = share of RAM in 1/1000 + oom_score_adj, never below 1):"
for d in "$PROC"/[0-9]*; do
  p=${d##*/}; s=$($SUDO cat "$d/oom_score" 2>/dev/null) || continue
  echo "$s $p"
done | sort -rn | head -6 | while read -r s p; do
  say "  pid $p $(cat "$PROC/$p/comm" 2>/dev/null) oom_score=$s oom_score_adj=$($SUDO cat "$PROC/$p/oom_score_adj" 2>/dev/null) rss=$(awk '/^VmRSS:/ {print int($2/1024)}' "$PROC/$p/status" 2>/dev/null)MB"
done
MONGO_KILLS=$(printf '%s\n' "$KILLED" | grep -c '(mongod)')
if [ "$MONGO_KILLS" -gt 0 ]; then
  BAD=$(printf '%s\n' "$KILLED" | grep '(mongod)' | grep -v 'oom_score_adj:-900' | grep -c .)
  if [ "$BAD" -gt 0 ]; then
    say "VERDICT: $BAD of $MONGO_KILLS killed mongod processes did NOT have oom_score_adj -900 (see the adj above): either the compose value never reached that process, or it was not nabdah-mongodb (see the container line above: a temporary mongod of a restore drill or a recreate starts with adj 0)"
  else
    say "VERDICT: the $MONGO_KILLS killed mongod processes had oom_score_adj -900 and were still chosen: with -900 its score is 1, so the kernel only picks it when nothing else is left to kill; look at the other kills and at MemAvailable above (the host is simply too small for the sum of the containers)"
  fi
else
  say "VERDICT: no mongod kill in the window"
fi
