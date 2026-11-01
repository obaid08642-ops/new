#!/bin/bash
# Why does mongod reach its 1600m container limit with a 0.6 GB WiredTiger cache, and did anyone get an alert? READ-ONLY, one run (outage of 2026-11-01 ~02:30-04:32 UTC). Numbers and
# names only, never a value, never an address, never a query text. Public lines start with "status:".
#   1. mongod's own accounting (serverStatus): WiredTiger cache bytes now / configured / dirty, tcmalloc allocated / heap / free-in-page-heap, resident and virtual memory,
#      connections (current / available / total created), open cursors, and the ops running over 5 s (5 samples, 1 s apart: most at once, longest running, by kind)
#   2. the container's cgroup: limit, memory.current, and the split into anon (heap, cache, connections) and file (page cache), memory.events (max / oom / oom_kill), restarts, OOMKilled
#   3. which client opened the most connections, by driver appName (an app name is a label the client sets, not a secret)
#   4. alerts: was monitor.sh scheduled, did it log alerts for the outage window, and are the mail settings present (set/unset only, never the address or key)
#   WINDOW_FROM / WINDOW_TO (UTC, "YYYY-MM-DD HH:MM") bound the alert-log count. Default: 2026-11-01 02:00 to 05:00.
set -u
DK="sudo -n docker"; CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
FROM=${WINDOW_FROM:-2026-11-01 02:00}; TO=${WINDOW_TO:-2026-11-01 05:00}
echo "## mongod-memory"
say() { echo "status: mongod-memory: $*"; }
q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tr -d '\r'; }
mb() { awk -v b="${1:-0}" 'BEGIN{printf "%d", b/1048576}'; }

# ---- 1. serverStatus (parts) and the 5 s sample of current operations
SS=$(q 'const s=db.serverStatus({tcmalloc:1});const c=s.wiredTiger&&s.wiredTiger.cache||{};const t=s.tcmalloc&&s.tcmalloc.generic||{};const tt=s.tcmalloc&&s.tcmalloc.tcmalloc||{};print(JSON.stringify({cache_now:c["bytes currently in the cache"],cache_max:c["maximum bytes configured"],cache_dirty:c["tracked dirty bytes in the cache"],tc_alloc:t.current_allocated_bytes,tc_heap:t.heap_size,tc_pageheap_free:tt.pageheap_free_bytes,tc_central_free:tt.central_cache_free_bytes,res_mb:s.mem&&s.mem.resident,virt_mb:s.mem&&s.mem.virtual,conn:s.connections,cursors:s.metrics&&s.metrics.cursor&&s.metrics.cursor.open}))' | grep -E '^\{' | tail -1)
if echo "$SS" | jq -e . >/dev/null 2>&1; then
  say "wiredTiger cache: now=$(mb "$(echo "$SS" | jq -r '.cache_now // 0')")MB configured=$(mb "$(echo "$SS" | jq -r '.cache_max // 0')")MB dirty=$(mb "$(echo "$SS" | jq -r '.cache_dirty // 0')")MB"
  say "tcmalloc: allocated=$(mb "$(echo "$SS" | jq -r '.tc_alloc // 0')")MB heap=$(mb "$(echo "$SS" | jq -r '.tc_heap // 0')")MB pageheap_free=$(mb "$(echo "$SS" | jq -r '.tc_pageheap_free // 0')")MB central_cache_free=$(mb "$(echo "$SS" | jq -r '.tc_central_free // 0')")MB  (heap minus allocated = memory mongod holds but is not using)"
  say "mongod mem: resident=$(echo "$SS" | jq -r '.res_mb // "?"')MB virtual=$(echo "$SS" | jq -r '.virt_mb // "?"')MB"
  say "connections: current=$(echo "$SS" | jq -r '.conn.current // "?"') available=$(echo "$SS" | jq -r '.conn.available // "?"') total_created=$(echo "$SS" | jq -r '.conn.totalCreated // "?"')"
  say "open cursors: total=$(echo "$SS" | jq -r '.cursors.total // "?"') noTimeout=$(echo "$SS" | jq -r '.cursors.noTimeout // "?"') pinned=$(echo "$SS" | jq -r '.cursors.pinned // "?"')"
else
  say "serverStatus unreadable (mongod down or the login failed)"
fi
MAXOPS=0; MAXSECS=0; KINDS=""
for i in 1 2 3 4 5; do
  O=$(q 'const o=db.getSiblingDB("admin").aggregate([{$currentOp:{allUsers:true,idleConnections:false}},{$project:{op:1,secs:{$ifNull:["$secs_running",0]}}}]).toArray();const k={};let m=0;o.forEach(x=>{k[x.op]=(k[x.op]||0)+1;if(x.secs>m)m=x.secs});print(JSON.stringify({n:o.length,m:m,k:k}))' | grep -E '^\{' | tail -1)
  n=$(echo "$O" | jq -r '.n // 0' 2>/dev/null); s=$(echo "$O" | jq -r '.m // 0' 2>/dev/null)
  [ "${n:-0}" -gt "$MAXOPS" ] && { MAXOPS=$n; KINDS=$(echo "$O" | jq -r '.k | to_entries | map("\(.key)=\(.value)") | join(" ")'); }
  [ "${s:-0}" -gt "$MAXSECS" ] && MAXSECS=$s
  [ "$i" -lt 5 ] && sleep 1
done
say "current ops over 5 s (5 samples): most at once=$MAXOPS ($KINDS), longest running=${MAXSECS}s"

# ---- 3. which client opened the most connections
CONNS=$(q 'const r=db.getSiblingDB("admin").aggregate([{$currentOp:{allUsers:true,idleConnections:true}},{$group:{_id:{$ifNull:["$appName","(none)"]},n:{$sum:1}}},{$sort:{n:-1}},{$limit:8}]).toArray();print(JSON.stringify(r.map(x=>({a:x._id,n:x.n}))))' | grep -E '^\[' | tail -1)
say "connections by client appName (top 8): $(echo "$CONNS" | jq -r 'map("\(.a)=\(.n)") | join(" ")' 2>/dev/null || echo unreadable)"

# ---- 2. the container's cgroup
ID=$($DK inspect -f '{{.Id}}' "$CT" 2>/dev/null)
say "container: restarts=$($DK inspect -f '{{.RestartCount}}' "$CT" 2>/dev/null) oom_killed=$($DK inspect -f '{{.State.OOMKilled}}' "$CT" 2>/dev/null) started=$($DK inspect -f '{{.State.StartedAt}}' "$CT" 2>/dev/null) limit=$(mb "$($DK inspect -f '{{.HostConfig.Memory}}' "$CT" 2>/dev/null)")MB swap_limit=$(mb "$($DK inspect -f '{{.HostConfig.MemorySwap}}' "$CT" 2>/dev/null)")MB"
CG=""; for p in "/sys/fs/cgroup/system.slice/docker-$ID.scope" "/sys/fs/cgroup/docker/$ID" "/sys/fs/cgroup/memory/docker/$ID"; do sudo -n test -d "$p" && { CG=$p; break; }; done
if [ -n "$CG" ]; then
  rd() { sudo -n cat "$CG/$1" 2>/dev/null; }
  say "cgroup: memory.current=$(mb "$(rd memory.current)")MB memory.peak=$(mb "$(rd memory.peak)")MB memory.max=$(rd memory.max | awk '{ if ($1 ~ /^[0-9]+$/) printf "%dMB", $1/1048576; else print $1 }')"
  say "cgroup split: anon=$(mb "$(rd memory.stat | awk '$1=="anon"{print $2}')")MB file(page cache)=$(mb "$(rd memory.stat | awk '$1=="file"{print $2}')")MB shmem=$(mb "$(rd memory.stat | awk '$1=="shmem"{print $2}')")MB kernel=$(mb "$(rd memory.stat | awk '$1=="kernel"{print $2}')")MB"
  say "cgroup events: $(rd memory.events | tr '\n' ' ')"
else
  say "cgroup directory of the container not found (cgroup v1 layout or no access)"
fi

# ---- 4. alerts
# the globs are expanded by root (sh -c under sudo): /var/spool/cron/crontabs is not readable by the ops user, so a glob expanded by the caller stayed literal and missed root's crontab (run 81)
CRONS=$(sudo -n sh -c 'grep -ls "monitor\.sh" /etc/cron.d/* /etc/crontab /var/spool/cron/crontabs/* /var/spool/cron/* /etc/systemd/system/*.service /etc/systemd/system/*.timer 2>/dev/null' | sed 's#.*/##' | sort -u | tr '\n' ' ')
sudo -n crontab -l 2>/dev/null | grep -q 'monitor\.sh' && CRONS="${CRONS}root-crontab "
say "monitor.sh scheduled in: ${CRONS:-NOWHERE (no cron file or crontab names it)}; script on the server: $(sudo -n test -x "$D/scripts/monitor.sh" && echo yes || echo no)"
LOGF=${OPS_ALERT_LOG:-/var/log/nabdah-alerts.log}
if sudo -n test -r "$LOGF"; then
  W=$(sudo -n awk -v f="$FROM" -v t="$TO" 'match($0, /^\[[0-9-]+ [0-9:]+\]/) { d=substr($0, 2, 16); if (d >= f && d <= t) print }' "$LOGF")
  say "alert log $LOGF: total lines=$(sudo -n wc -l < "$LOGF"), lines in the window $FROM..$TO UTC=$(echo "$W" | grep -c .)"
  echo "$W" | sed -E 's/^\[[^]]*\] //; s/[0-9]+(\.[0-9]+)?/N/g' | sort | uniq -c | sort -rn | head -12 | while read -r c msg; do say "  alert in window x$c: $msg"; done
  say "first/last alert in the window: $(echo "$W" | head -1 | cut -c2-17) / $(echo "$W" | tail -1 | cut -c2-17)"
else
  say "alert log $LOGF: not readable or missing"
fi
word() { local v; v=$(sudo -n grep -m1 "^$1=" "$D/.env.production" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"); [ -n "$v" ] && echo set || echo unset; }
say "mail settings (set/unset only): OPS_ALERT_EMAIL=$(word OPS_ALERT_EMAIL) OWNER_ALERT_EMAIL=$(word OWNER_ALERT_EMAIL) RESEND_API_KEY=$(word RESEND_API_KEY) MAIL_FROM=$(word MAIL_FROM)"
SD=${OPS_MONITOR_STATE_DIR:-/var/lib/nabdah-monitor}
say "monitor state dir $SD: $(sudo -n ls -l --time-style=+%F_%R "$SD" 2>/dev/null | awk 'NR>1{printf "%s(%s) ", $7, $6}')"
say "done (read-only)"
