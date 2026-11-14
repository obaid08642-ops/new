#!/bin/bash
# Is mongod's memory setting really the one in the repo, and who kills it? READ-ONLY, one run, `status:` lines only; nothing is written, stopped, restarted or changed. For ops run 108 (96h):
# restarts 296 -> 356 in 13 h, cgroup memory.events max=3755, oom_kill=0, kernel kills by command mongod=11. Two things 96h could not show: (a) `dmesg` counts since BOOT with no
# time, and (b) `docker events` keeps only a short in-memory buffer (health checks fill it), so a die-event history of hours comes back empty. This task answers both from other sources.
#   1 config      the WiredTiger cache mongod actually runs with (`getCmdLineOpts` and serverStatus "maximum bytes configured"), the line in the repo's mongod.conf on the host, and whether
#                 they agree (a mismatch = the file was changed but mongod was not restarted, or it is not the file mongod reads); the container limit; MemoryReservation
#   2 use now     mongod's own numbers (WiredTiger cache bytes now / dirty, resident, connections) and the cgroup split anon (heap, cache, connections) / file (page cache, reclaimable) /
#                 memory.current / memory.peak, memory.events (max, oom, oom_kill). `max` counts the cgroup reclaiming page cache at its limit: harmless on its own; anon near the limit is not
#   3 kills       the kernel's "Killed process ... (mongod)" lines WITH their time (dmesg -T) in the last SINCE_H hours (default 48), split into cgroup kills (the 1.6 GB limit) and global kills
#                 (the host ran out), with the process's anon-rss in MB; plus the number of kills of other commands in the same window
#   4 restarts    from mongod's own log over the same window: starts (id 4615611), signals received (id 23377) and shutdowns (id 4784900), and the starts that had no signal or shutdown
#                 before them (= killed from outside: SIGKILL, the OOM killer, a power cut)
#   5 host        MemAvailable, swap, and the memory the top containers use now
# The host's mongod.conf is read for ONE line (cacheSizeGB); no other file content, no environment, no credentials: the credentials are read inside the container only to log in.
set -u
SINCE_H=${SINCE_H:-48}
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
CG=${OPS_CGROUP_ROOT:-/sys/fs/cgroup}
say() { echo "status: mongo-cache-check: $*"; }
echo "## mongo-cache-check (read-only)"
q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null < /dev/null; }
mb() { awk -v b="${1:-0}" 'BEGIN { printf "%d", b / 1048576 }'; }

# 1 config
EFF=$(q 'const o=db.adminCommand({getCmdLineOpts:1}).parsed; print((((o.storage||{}).wiredTiger||{}).engineConfig||{}).cacheSizeGB)' | tail -1 | tr -d "'\" ")
MAXB=$(q 'print(db.serverStatus().wiredTiger.cache["maximum bytes configured"])' | tail -1 | tr -d "'\" ")
FILE=$(grep -E '^\s*cacheSizeGB:' "$D/mongo/mongod.conf" 2>/dev/null | head -1 | sed -E 's/.*cacheSizeGB:\s*([0-9.]+).*/\1/')
LIMIT=$($DK inspect -f '{{.HostConfig.Memory}}' "$CT" 2>/dev/null); RESV=$($DK inspect -f '{{.HostConfig.MemoryReservation}}' "$CT" 2>/dev/null)
say "config: mongod runs with cacheSizeGB=${EFF:-unknown} (WiredTiger maximum $(mb "$MAXB") MB); the repo file on the host says ${FILE:-unreadable}; container limit $(mb "$LIMIT") MB, reservation $(mb "$RESV") MB"
if [ -n "$EFF" ] && [ "$EFF" != undefined ] && [ -n "$FILE" ]; then
  if [ "$(awk -v a="$EFF" -v b="$FILE" 'BEGIN { print (a + 0 == b + 0) ? "same" : "different" }')" = same ]; then say "config: the running value equals the file: the setting IS applied"
  else say "config: MISMATCH: the file says $FILE but mongod runs with $EFF (file edited without a restart, or mongod reads another file)"; fi
else say "config: could not compare (running value ${EFF:-unknown}, file ${FILE:-unreadable}); with no cacheSizeGB in the options mongod sizes the cache from HOST RAM (50% of RAM minus 1 GB)"; fi

# 2 use now
say "mongod now: $(q 'const s=db.serverStatus(), c=s.wiredTiger.cache; print("cache_in_use_MB="+Math.round(c["bytes currently in the cache"]/1048576)+" dirty_MB="+Math.round(c["tracked dirty bytes in the cache"]/1048576)+" resident_MB="+s.mem.resident+" connections="+s.connections.current+" available="+s.connections.available)' | tail -1)"
CID=$($DK inspect -f '{{.Id}}' "$CT" 2>/dev/null)
for base in "$CG/system.slice/docker-$CID.scope" "$CG/memory/docker/$CID"; do
  [ -r "$base/memory.stat" ] || [ -r "$base/memory.usage_in_bytes" ] || continue
  if [ -r "$base/memory.current" ]; then
    anon=$(awk '$1=="anon" {print $2}' "$base/memory.stat"); file=$(awk '$1=="file" {print $2}' "$base/memory.stat")
    say "cgroup: current $(mb "$(cat "$base/memory.current")") MB = anon $(mb "$anon") MB (heap, cache, connections) + file $(mb "$file") MB (page cache, reclaimable); peak $( [ -r "$base/memory.peak" ] && mb "$(cat "$base/memory.peak")" || echo n/a ) MB; limit $(cat "$base/memory.max" 2>/dev/null | awk '{ if ($1 ~ /^[0-9]+$/) printf "%d MB", $1/1048576; else print $1 }')"
    say "cgroup events (this container instance only, they reset at every restart): $(tr '\n' ' ' < "$base/memory.events" | cut -c1-160)"
  fi
  break
done

# 3 kills, with their time
NOW=$(date +%s); FROM=$((NOW - SINCE_H * 3600))
DM=$(sudo -n dmesg -T 2>/dev/null | grep -i 'killed process' | while IFS= read -r l; do
  t=$(printf '%s' "$l" | sed -nE 's/^\[([^]]+)\].*/\1/p'); e=$(date -d "$t" +%s 2>/dev/null || echo 0)
  [ "$e" -ge "$FROM" ] && printf '%s\n' "$l"
done)
mk=$(printf '%s\n' "$DM" | grep -c '(mongod)'); ok=$(printf '%s\n' "$DM" | grep -v '(mongod)' | grep -c .)
say "kernel kills in the last ${SINCE_H} h: mongod=$mk, other commands=$ok (dmesg -T times; the buffer itself goes back to boot)"
printf '%s\n' "$DM" | grep '(mongod)' | tail -6 | while IFS= read -r l; do
  t=$(printf '%s' "$l" | sed -nE 's/^\[([^]]+)\].*/\1/p'); kind=global; printf '%s' "$l" | grep -qi 'memory cgroup\|cgroup' && kind=cgroup
  rss=$(printf '%s' "$l" | sed -nE 's/.*anon-rss:([0-9]+)kB.*/\1/p'); say "  kill: $t kind=$kind anon-rss=$( [ -n "$rss" ] && echo $((rss / 1024)) || echo ? ) MB"
done
sudo -n dmesg -T 2>/dev/null | grep -i 'memory cgroup out of memory' | tail -3 | while IFS= read -r l; do say "  cgroup oom context: $(printf '%s' "$l" | sed -E 's/^\[([^]]+)\].*(task_memcg=[^,]*).*/\1 \2/' | sed -E 's#/docker/[0-9a-f]{12}[0-9a-f]*#/docker/<id>#' | cut -c1-120)"; done

# 4 restarts from mongod's own log (ids only)
IDS=$($DK logs --since "${SINCE_H}h" "$CT" 2>&1 | grep -o '"id":[0-9]*' | cut -d: -f2)
starts=$(printf '%s\n' "$IDS" | grep -c '^4615611$'); sigs=$(printf '%s\n' "$IDS" | grep -c '^23377$'); shut=$(printf '%s\n' "$IDS" | grep -c '^4784900$')
say "mongod log, last ${SINCE_H} h: starts=$starts signals_received=$sigs shutdowns=$shut"
unclean=$(( starts - (sigs > shut ? sigs : shut) )); [ "$unclean" -lt 0 ] && unclean=0
say "starts with no signal or shutdown before them (killed from outside: SIGKILL, the OOM killer): about $unclean of $starts"

# 5 host
say "host: MemAvailable $(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo) MB, swap free $(awk '/^SwapFree:/ {print int($2/1024)}' /proc/meminfo) of $(awk '/^SwapTotal:/ {print int($2/1024)}' /proc/meminfo) MB"
say "containers now: $($DK stats --no-stream --format '{{.Name}}={{.MemUsage}}' 2>/dev/null | sed 's/ \/ [0-9.]*[A-Za-z]*//' | tr '\n' ' ' | cut -c1-500)"
say "done (read-only)"
