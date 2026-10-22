#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Why the last Redis background save failed: counts, yes/no and percentages only.
# The password goes to redis-cli on stdin only and is never printed; log lines are counted, never printed.
# If authentication fails, no Redis value is judged: they are printed as unknown.
set +e
DK="sudo -n docker"
echo "## ops-redis-diag"
ENVF=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}/.env.production
# The Redis password is passed to the container's redis-cli on stdin only (the container has no REDIS_PASSWORD in its
# environment; compose gives it to redis-server as an argument). It is never on a command line and never printed.
pw_cmd() { sudo -n grep -E '^REDIS_PASSWORD=' "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | sed -E "s/^\"(.*)\"$/\1/; s/^'(.*)'$/\1/"; }
rcli() { pw_cmd | $DK exec -i nabdah-redis sh -c 'read -r p; REDISCLI_AUTH="$p" redis-cli "$@"' sh "$@" 2>&1 | tr -d '\r'; }
if [ "$(rcli PING)" = PONG ]; then auth=ok; else auth=fail; fi
echo "status: redis auth=$auth"
info=""; [ "$auth" = ok ] && info=$(rcli INFO persistence)
field() { echo "$info" | grep -E "^$1:" | cut -d: -f2; }
swv=unknown; stv=unknown
if [ "$auth" = ok ]; then
  sw=$(rcli CONFIG GET stop-writes-on-bgsave-error | sed -n 2p); [ "$sw" = yes ] && swv=yes || { [ "$sw" = no ] && swv=no; }
  st=$(field rdb_last_bgsave_status); [ "$st" = ok ] && stv=ok; [ "$st" = err ] && stv=err
fi
last=$(field rdb_last_save_time); now=""; [ "$auth" = ok ] && now=$(rcli TIME | head -1)
age="unknown"; [[ "$last" =~ ^[0-9]+$ && "$now" =~ ^[0-9]+$ ]] && age=$(( (now - last) / 60 ))
chg=$(field rdb_changes_since_last_save); chg=${chg:-unknown}
aof=$(field aof_enabled); aof=${aof:-unknown}
echo "status: redis stop_writes=$swv last_bgsave=$stv last_bgsave_age_min=$age changes_since_save=$chg aof_enabled=$aof"
dir=""; [ "$auth" = ok ] && dir=$(rcli CONFIG GET dir | sed -n 2p)
free="unknown"; wr=unknown
if [ -n "$dir" ]; then
  used=$($DK exec nabdah-redis df -P "$dir" 2>/dev/null | awk 'NR==2{gsub("%","",$5); print $5}')
  [[ "$used" =~ ^[0-9]+$ ]] && free=$((100 - used))
  if $DK exec nabdah-redis test -w "$dir" 2>/dev/null; then wr=yes; else wr=no; fi
fi
echo "status: redis dir_free_pct=$free dir_writable=$wr"
errs=$($DK logs nabdah-redis --since 24h 2>&1 | grep -ciE "Background saving error|Can't save|MISCONF")
echo "status: redis log_save_errors_24h=${errs:-0}"
echo "## ops-redis-diag done"
