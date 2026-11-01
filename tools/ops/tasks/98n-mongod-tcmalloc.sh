#!/bin/bash
# mongod holds memory it is not using (run 81: tcmalloc heap 823 MB, 585 MB allocated, so about 238 MB sits free in tcmalloc's page heap while the container limit is 1600m).
# That free part is the one reclaimable number in the 99n report: the WiredTiger cache is a budget (0.6 GB), connections are about 1 MB each. Asking tcmalloc to give pages back sooner
# (tcmallocReleaseRate, a documented runtime parameter; default 1.0, 0 = never, higher = faster) lowers the heap without a restart. This task changes ONLY that one parameter, at runtime.
#   Dry run (default, READ-ONLY): the value now (or "not supported by this mongod"), and the tcmalloc numbers: allocated, heap, free in the page heap, central cache free.
#   APPLY=yes: remembers the value now, sets tcmallocReleaseRate to RATE (default 5), waits WAIT seconds (default 60), measures again and prints before / after. If the server refuses the
#     parameter nothing was changed and the task says so. The setting lasts until mongod restarts (it is not written to mongod.conf: a parameter this build rejects would stop mongod from starting).
#   ROLLBACK=yes: sets it back to ROLLBACK_TO (default 1.0).
set -u
APPLY="yes"
ROLLBACK=""
RATE=${RATE:-5}
WAIT=${WAIT:-60}
ROLLBACK_TO=${ROLLBACK_TO:-1.0}
DK="sudo -n docker"; CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
echo "## mongod-tcmalloc"
say() { echo "status: mongod-tcmalloc: $*"; }
q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tr -d '\r'; }
mb() { awk -v b="${1:-0}" 'BEGIN{printf "%d", b/1048576}'; }
rate() { q 'let r;try{r=db.adminCommand({getParameter:1,tcmallocReleaseRate:1}).tcmallocReleaseRate}catch(e){r=null}print(JSON.stringify({r:r===undefined?null:r}))' | grep -E '^\{' | tail -1 | jq -r '.r // "unsupported"' 2>/dev/null; }
nums() { q 'const s=db.serverStatus({tcmalloc:1});const g=(s.tcmalloc&&s.tcmalloc.generic)||{};const t=(s.tcmalloc&&s.tcmalloc.tcmalloc)||{};print(JSON.stringify({a:g.current_allocated_bytes,h:g.heap_size,f:t.pageheap_free_bytes,c:t.central_cache_free_bytes}))' | grep -E '^\{' | tail -1; }
show() { local j; j=$(nums); echo "$j" | jq -e .a >/dev/null 2>&1 || { say "$1: tcmalloc numbers unreadable (mongod down or login failed)"; return 1; }
  say "$1: allocated=$(mb "$(echo "$j" | jq -r '.a // 0')")MB heap=$(mb "$(echo "$j" | jq -r '.h // 0')")MB free_in_page_heap=$(mb "$(echo "$j" | jq -r '.f // 0')")MB central_cache_free=$(mb "$(echo "$j" | jq -r '.c // 0')")MB"; }

NOW=$(rate)
say "tcmallocReleaseRate now: $NOW"
if [ "$ROLLBACK" = yes ]; then
  [ "$NOW" != unsupported ] || { say "ABORT this mongod does not know the parameter: nothing to roll back"; exit 1; }
  q "print(JSON.stringify(db.adminCommand({setParameter:1,tcmallocReleaseRate:$ROLLBACK_TO})))" | grep -q '"ok":1' || { say "FAILED to set it back"; exit 1; }
  say "rolled back: tcmallocReleaseRate=$(rate)"; exit 0
fi
show before || exit 1
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was changed. APPLY=yes would set tcmallocReleaseRate=$RATE for the running mongod, wait ${WAIT}s and print the same numbers again"; exit 0
fi
[ "$NOW" != unsupported ] || { say "ABORT this mongod does not know tcmallocReleaseRate: nothing changed (no restart-time setting is attempted: an unknown parameter stops mongod)"; exit 1; }
case "$RATE" in ''|*[!0-9.]*) say "ABORT RATE must be a number"; exit 1;; esac
OUT=$(q "print(JSON.stringify(db.adminCommand({setParameter:1,tcmallocReleaseRate:$RATE})))" | grep -E '^\{' | tail -1)
echo "$OUT" | grep -q '"ok":1' || { say "FAILED the server refused the parameter: nothing changed"; exit 1; }
say "set: tcmallocReleaseRate $NOW -> $(rate); waiting ${WAIT}s"
sleep "$WAIT"
show "after ${WAIT}s"
say "runtime only: lasts until mongod restarts. To undo now: ROLLBACK=yes (sets $ROLLBACK_TO)"
