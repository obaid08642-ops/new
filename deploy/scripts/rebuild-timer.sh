#!/bin/bash
# R15b: time every phase of rebuilding production on a NEW server, against the budget in docs/runbooks/rebuild-from-repo.md (30 minutes in total).
# Source it from the shell you rebuild in, then wrap each step:
#   source deploy/scripts/rebuild-timer.sh
#   phase provision-and-ssh   true        # (the time you spend in the provider console: wrap with `phase_manual NAME SECONDS`)
#   phase setup-server        bash deploy/setup-server.sh
#   ...
#   rebuild_report            # prints the table, the verdict against the budget, and writes /var/log/nabdah-rebuild-<UTC>.json (REBUILD_REPORT_DIR to change)
# A phase that fails stops the clock for that phase, is marked FAILED and rebuild_report says the rebuild did not complete. Names and seconds only; commands are not logged.
REBUILD_BUDGET_FILE=${REBUILD_BUDGET_FILE:-$(dirname "${BASH_SOURCE[0]}")/rebuild-budget.tsv}
REBUILD_NOW() { if [ -n "${REBUILD_FAKE_CLOCK:-}" ]; then cat "$REBUILD_FAKE_CLOCK"; else date +%s; fi; }
declare -a _RB_NAMES=() _RB_SECS=() _RB_OK=()

phase() { # phase <name> <command...>
  local name=$1; shift
  local t0 t1 rc
  t0=$(REBUILD_NOW); echo "[rebuild] > $name"
  "$@"; rc=$?
  t1=$(REBUILD_NOW)
  _RB_NAMES+=("$name"); _RB_SECS+=($((t1 - t0))); _RB_OK+=($([ $rc = 0 ] && echo ok || echo FAILED))
  echo "[rebuild] < $name $((t1 - t0))s $([ $rc = 0 ] && echo ok || echo "FAILED (exit $rc)")"
  return $rc
}
phase_manual() { # phase_manual <name> <seconds>: a step done by hand (provider console, DNS) whose time you took from a clock
  _RB_NAMES+=("$1"); _RB_SECS+=("$2"); _RB_OK+=(ok); echo "[rebuild] = $1 ${2}s (manual)"
}
rebuild_report() {
  local total=0 budget_total=0 failed=0 i name secs ok b over
  echo; printf '%-28s %8s %8s  %s\n' phase seconds budget status
  for i in "${!_RB_NAMES[@]}"; do
    name=${_RB_NAMES[$i]}; secs=${_RB_SECS[$i]}; ok=${_RB_OK[$i]}
    b=$(awk -F'\t' -v n="$name" '$1==n {print $2}' "$REBUILD_BUDGET_FILE" 2>/dev/null); b=${b:-?}
    over=""; [ "$b" != "?" ] && [ "$secs" -gt "$b" ] && over="OVER BUDGET by $((secs - b))s"
    printf '%-28s %8s %8s  %s %s\n' "$name" "$secs" "$b" "$ok" "$over"
    total=$((total + secs)); [ "$b" != "?" ] && budget_total=$((budget_total + b)); [ "$ok" = ok ] || failed=1
  done
  local target=${REBUILD_TARGET_SEC:-1800} verdict
  if [ $failed = 1 ]; then verdict="DID NOT COMPLETE (a phase failed)"; elif [ "$total" -le "$target" ]; then verdict="WITHIN TARGET"; else verdict="OVER TARGET by $((total - target))s"; fi
  printf '%-28s %8s %8s\n' TOTAL "$total" "$budget_total"; echo "target ${target}s: $verdict"
  local dir=${REBUILD_REPORT_DIR:-/var/log}; mkdir -p "$dir" 2>/dev/null
  local f="$dir/nabdah-rebuild-$(date -u +%Y%m%dT%H%M%SZ).json"
  { printf '{"total_seconds":%s,"target_seconds":%s,"verdict":"%s","phases":[' "$total" "$target" "$verdict"
    for i in "${!_RB_NAMES[@]}"; do printf '%s{"name":"%s","seconds":%s,"status":"%s"}' "$([ "$i" = 0 ] || echo ,)" "${_RB_NAMES[$i]}" "${_RB_SECS[$i]}" "${_RB_OK[$i]}"; done; printf ']}\n'; } > "$f" 2>/dev/null && echo "report: $f"
  [ $failed = 0 ] && [ "$total" -le "$target" ]
}
