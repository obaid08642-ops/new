#!/bin/bash
# WHAT makes mongod grow past its 1.6 GB cgroup limit and get OOM-killed (run 112b: ~every 80-90 s, each kill ~80 s after a start)? READ-ONLY, `status:` lines only
# (the public log keeps the first 40 status lines of the whole run, so the lines are short and the most important come first). Nothing is written, stopped, restarted or changed;
# no limit and no cache setting is touched. Command bodies and filters are never printed (they can hold patient data): only namespaces, operation types, plan summaries, durations,
# client application names and counts.
#   1 kills     the last KILLS kernel "Memory cgroup out of memory ... (mongod)" lines with their time and anon-rss
#   2 cgroup    memory.events (max / oom / oom_kill) and current / peak / limit of the mongodb container's cgroup
#   3 windows   for each of the last SHOW kills: mongod log in the WINDOW_S (90) seconds before it: slow queries (count, the slowest: ns, op, plan, ms, docs examined, client app),
#               index builds, sort/group memory messages, accepted connections, client application names
#   4 snapshot  db.currentOp(active) top 3 by running time + connections, resident, tcmalloc allocated / heap, WiredTiger cache bytes, 30 s and 60 s after the next mongod start (waits up to
#               WAIT_START_S, default 200 s, for one; without a start it takes one snapshot now)
#   5 jobs      backend and worker log lines (mongo reconnect, ScheduledOnce, createIndex, migration, aggregate, cron) in the 120 s after each of the last 3 mongod starts: counts and the first lines
set -u
KILLS=${KILLS:-5}
SHOW=${SHOW:-5}
WINDOW_S=${WINDOW_S:-90}
WAIT_START_S=${WAIT_START_S:-200}
SNAP1_S=${SNAP1_S:-30}
SNAP2_S=${SNAP2_S:-60}
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
CG=${OPS_CGROUP_ROOT:-/sys/fs/cgroup}
say() { echo "status: mongo-oom-cause: $*"; }
echo "## mongo-oom-cause (read-only)"
mb() { awk -v b="${1:-0}" 'BEGIN { printf "%d", b / 1048576 }'; }
q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null < /dev/null; }
field() { sed -nE "s/.*\"$1\":\"?([^\",}]*).*/\\1/p" | head -1; }   # one scalar of a JSON log line

# 1 kills (dmesg -T times are host local time; date -d turns them into epochs)
KL=$(sudo -n dmesg -T 2>/dev/null | grep -i 'out of memory' | grep -i '(mongod)' | tail -n "$KILLS")
EPOCHS=""
say "kills: $(printf '%s\n' "$KL" | grep -c .) shown, newest last"
printf '%s\n' "$KL" | while IFS= read -r l; do
  [ -z "$l" ] && continue
  t=$(printf '%s' "$l" | sed -nE 's/^\[([^]]+)\].*/\1/p'); e=$(date -d "$t" +%s 2>/dev/null || echo 0)
  rss=$(printf '%s' "$l" | sed -nE 's/.*anon-rss:([0-9]+)kB.*/\1/p')
  say "  kill $(date -u -d "@$e" +%FT%TZ 2>/dev/null || echo "$t") anon-rss=$( [ -n "$rss" ] && echo $((rss / 1024)) || echo ?) MB"
done
EPOCHS=$(printf '%s\n' "$KL" | while IFS= read -r l; do [ -z "$l" ] && continue; t=$(printf '%s' "$l" | sed -nE 's/^\[([^]]+)\].*/\1/p'); date -d "$t" +%s 2>/dev/null; done)

# 2 cgroup
CID=$($DK inspect -f '{{.Id}}' "$CT" 2>/dev/null)
for base in "$CG/system.slice/docker-$CID.scope" "$CG/memory/docker/$CID"; do
  [ -r "$base/memory.events" ] || continue
  say "cgroup: events $(tr '\n' ' ' < "$base/memory.events" | cut -c1-120); current $(mb "$(cat "$base/memory.current" 2>/dev/null)") MB, peak $( [ -r "$base/memory.peak" ] && mb "$(cat "$base/memory.peak")" || echo n/a) MB, limit $(cat "$base/memory.max" 2>/dev/null | awk '{ if ($1 ~ /^[0-9]+$/) printf "%d MB", $1/1048576; else print $1 }')"
  break
done

# 3 what mongod logged in the WINDOW_S seconds before each kill
for e in $(printf '%s\n' "$EPOCHS" | tail -n "$SHOW"); do
  [ "${e:-0}" -gt 0 ] || continue
  L=$($DK logs --since "$((e - WINDOW_S))" --until "$e" "$CT" 2>&1)
  slow=$(printf '%s\n' "$L" | grep '"id":51803')
  n=$(printf '%s\n' "$slow" | grep -c .)
  top=$(printf '%s\n' "$slow" | awk '{ if (match($0, /"durationMillis":[0-9]+/)) { d = substr($0, RSTART + 17, RLENGTH - 17) + 0; if (d > m) { m = d; best = $0 } } } END { print best }')
  desc="none"
  if [ -n "$top" ]; then
    desc="$(printf '%s' "$top" | field ns) $(printf '%s' "$top" | field type) plan=$(printf '%s' "$top" | field planSummary | cut -c1-24) ms=$(printf '%s' "$top" | field durationMillis) docs=$(printf '%s' "$top" | field docsExamined) app=$(printf '%s' "$top" | field appName | cut -c1-24)"
  fi
  idx=$(printf '%s\n' "$L" | grep -c '"c":"INDEX"')
  mem=$(printf '%s\n' "$L" | grep -ciE 'exceeded memory|allowDiskUse|sort.*memory|\$group.*memory')
  conns=$(printf '%s\n' "$L" | grep -c '"id":22943')
  apps=$(printf '%s\n' "$L" | grep -o '"application":{"name":"[^"]*"' | sed 's/.*"name":"//; s/"$//' | sort | uniq -c | sort -rn | head -3 | awk '{printf "%s x%s ", $2, $1}')
  say "window $(date -u -d "@$e" +%T) (${WINDOW_S}s before): slow=$n top=[$desc] index_lines=$idx sort_or_group_memory=$mem conns=$conns apps=[${apps:-none}]"
done

# 4 snapshots after the next start
SNAP_JS='const s=db.serverStatus(), c=s.wiredTiger.cache, t=(s.tcmalloc||{}).generic||{}; const ops=db.currentOp({active:true}).inprog.filter(o=>o.ns&&!/^(admin|local)\./.test(o.ns)).sort((a,b)=>(b.secs_running||0)-(a.secs_running||0)).slice(0,3).map(o=>[o.op,o.ns,(o.secs_running||0)+"s",((o.clientMetadata||{}).application||{}).name||o.appName||"?",String(o.planSummary||"").slice(0,24),Object.keys(o.command||{})[0]||"?"].join("|")); print("up="+s.uptime+"s conns="+s.connections.current+" resident_MB="+s.mem.resident+" tc_alloc_MB="+Math.round((t.current_allocated_bytes||0)/1048576)+" tc_heap_MB="+Math.round((t.heap_size||0)/1048576)+" wt_cache_MB="+Math.round(c["bytes currently in the cache"]/1048576)+" dirty_MB="+Math.round(c["tracked dirty bytes in the cache"]/1048576)+" ops=["+ops.join(" ; ")+"]")'
snap() { say "snapshot $1: $(q "$SNAP_JS" | tail -1 | cut -c1-330)"; }
S0=$($DK inspect -f '{{.State.StartedAt}}' "$CT" 2>/dev/null)
waited=0; S1="$S0"
while [ "$waited" -lt "$WAIT_START_S" ]; do
  S1=$($DK inspect -f '{{.State.StartedAt}}' "$CT" 2>/dev/null)
  [ "$S1" != "$S0" ] && break
  sleep 5; waited=$((waited + 5))
done
if [ "$S1" != "$S0" ]; then
  st=$(date -d "$S1" +%s 2>/dev/null || date +%s)
  for pair in "$SNAP1_S:+${SNAP1_S}s" "$SNAP2_S:+${SNAP2_S}s"; do
    off=${pair%%:*}; lab=${pair#*:}
    now=$(date +%s); wait_s=$((st + off - now)); [ "$wait_s" -gt 0 ] && sleep "$wait_s"
    snap "$lab after the start at $(date -u -d "@$st" +%T)"
  done
else
  snap "now (no mongod start within ${WAIT_START_S}s)"
fi

# 5 the jobs that run right after mongod comes back (backend and worker logs, last 3 starts)
STARTS=$($DK logs --since 24h --timestamps "$CT" 2>&1 | grep '"id":4615611' | awk '{print $1}' | tail -3)
for ts in $STARTS; do
  e=$(date -d "$ts" +%s 2>/dev/null) || continue
  for c in nabdah-backend nabdah-worker; do
    M=$($DK logs --since "$e" --until "$((e + 120))" "$c" 2>&1 | grep -iE 'mongo(db)? (re)?connect|ScheduledOnce|createIndex|ensureIndex|migrat|aggregate|reconcil|nightly|cron' | sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/<mail>/g; s/\+?[0-9]{9,}/<num>/g')
    say "after start $(date -u -d "@$e" +%T) $c: matches=$(printf '%s\n' "$M" | grep -c .) first=[$(printf '%s\n' "$M" | head -2 | cut -c1-110 | tr '\n' ';')]"
  done
done
say "done (read-only)"
