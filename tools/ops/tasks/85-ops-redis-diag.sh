#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Why the last Redis background save failed: counts, yes/no and percentages only.
# The password is read inside the container and never printed; log lines are counted, never printed.
set +e
DK="sudo -n docker"
echo "## ops-redis-diag"
rcli() { $DK exec nabdah-redis sh -c 'REDISCLI_AUTH="${REDIS_PASSWORD:-${REDIS_PASS:-}}" redis-cli "$@"' sh "$@" 2>&1 | tr -d '\r'; }
info=$(rcli INFO persistence)
field() { echo "$info" | grep -E "^$1:" | cut -d: -f2; }
sw=$(rcli CONFIG GET stop-writes-on-bgsave-error | sed -n 2p); [ "$sw" = yes ] && swv=yes || swv=no
st=$(field rdb_last_bgsave_status); [ "$st" = ok ] && stv=ok || stv=err
last=$(field rdb_last_save_time); now=$(rcli TIME | head -1)
age="n/a"; [[ "$last" =~ ^[0-9]+$ && "$now" =~ ^[0-9]+$ ]] && age=$(( (now - last) / 60 ))
chg=$(field rdb_changes_since_last_save); chg=${chg:-n/a}
aof=$(field aof_enabled); aof=${aof:-n/a}
echo "status: redis stop_writes=$swv last_bgsave=$stv last_bgsave_age_min=$age changes_since_save=$chg aof_enabled=$aof"
dir=$(rcli CONFIG GET dir | sed -n 2p)
free="n/a"; wr=no
if [ -n "$dir" ]; then
  used=$($DK exec nabdah-redis df -P "$dir" 2>/dev/null | awk 'NR==2{gsub("%","",$5); print $5}')
  [[ "$used" =~ ^[0-9]+$ ]] && free=$((100 - used))
  $DK exec nabdah-redis test -w "$dir" 2>/dev/null && wr=yes
fi
echo "status: redis dir_free_pct=$free dir_writable=$wr"
errs=$($DK logs nabdah-redis --since 24h 2>&1 | grep -ciE "Background saving error|Can't save|MISCONF")
echo "status: redis log_save_errors_24h=${errs:-0}"
echo "## ops-redis-diag done"
