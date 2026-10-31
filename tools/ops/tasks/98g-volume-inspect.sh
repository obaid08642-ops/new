#!/bin/bash
# What does the unused docker volume mongodb_secondary_data (about 910 MB) hold, and is any of it NOT in the live database? READ-ONLY by default; `status:` lines only: database and collection
# NAMES, document counts and the newest updatedAt/createdAt date per collection, never a value, never the environment.
#   (APPLY empty)  starts a THROWAWAY mongod on the volume, mounted read-only, with --queryableBackupMode, --wiredTigerCacheSizeGB 0.25, --memory 400m (no swap, oom_score_adj 1000), NO network
#                  (--network none: nothing is published, nothing can connect; the lists are read with docker exec), lists the databases and collections with counts and newest dates, compares every
#                  collection with the same one in the live nabdah-mongodb (counts and newest dates), then removes the throwaway container. The volume itself is not changed.
#   APPLY=yes      (set in this file by the reviewer, after reading the dry run; the owner approved removing THIS one volume, 2026-10-31): only if NO container (running or stopped) uses the
#                  volume: dumps it with mongodump (same image, same caps) to $OPS_BACKUP_DIR as mongodb_secondary_data-<timestamp>.archive.gz, checks the archive (gzip test, a mongorestore --dryRun
#                  that must list as many collections as were counted, and a non-empty file), and only then runs `docker volume rm`. Any failed check = nothing removed.
set -u
APPLY=""
VOL=${OPS_VOLUME:-mongodb_secondary_data}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
LIVE=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
DK="sudo -n docker"
echo "## volume-inspect"
say() { echo "status: volume-inspect: $*"; }
mb() { echo $(( ($1 + 524288) / 1048576 )); }
$DK volume inspect "$VOL" >/dev/null 2>&1 || { say "volume $VOL does not exist: nothing to inspect"; exit 0; }
USERS=$($DK ps -a --filter "volume=$VOL" --format '{{.Names}}' 2>/dev/null | tr '\n' ' ')
MP=$($DK volume inspect -f '{{.Mountpoint}}' "$VOL" 2>/dev/null)
SIZE=$(sudo -n du -sk "$MP" 2>/dev/null | cut -f1); SIZE=${SIZE:-0}
say "volume $VOL: $(( (SIZE + 512) / 1024 )) MB; used by containers: ${USERS:-none}"
IMG=$($DK inspect -f '{{.Config.Image}}' "$LIVE" 2>/dev/null)
[ -n "$IMG" ] || { say "ABORT cannot read the mongo image of $LIVE"; exit 1; }
NAME="nabd-volinspect-$$"
trap '$DK rm -f "$NAME" >/dev/null 2>&1' EXIT

# Read-only mount: mongod --queryableBackupMode never writes to the data directory. No --replSet, no auth, no network.
$DK run -d --name "$NAME" --network none --memory 400m --memory-swap 400m --oom-score-adj 1000 -v "$VOL:/data/db:ro" "$IMG" \
  mongod --queryableBackupMode --wiredTigerCacheSizeGB 0.25 --bind_ip 127.0.0.1 --port 27017 >/dev/null 2>&1 \
  || { say "ABORT the throwaway mongod did not start"; exit 1; }
UP=no; for i in $(seq 1 30); do $DK exec "$NAME" mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -qx 1 && { UP=yes; break; }; sleep 2; done
if [ "$UP" != yes ]; then
  say "ABORT the throwaway mongod did not answer (state=$($DK inspect -f '{{.State.Status}} oom_killed={{.State.OOMKilled}}' "$NAME" 2>/dev/null)); the volume may need a repair or a copy: nothing was changed"; exit 1
fi

Q="const out={};for(const dn of db.adminCommand({listDatabases:1}).databases.map(x=>x.name)){if(dn==='local')continue;const d=db.getSiblingDB(dn);for(const c of d.getCollectionNames()){if(c.startsWith('system.'))continue;let m=null;for(const f of ['updatedAt','createdAt','updated_at','created_at']){const r=d[c].find({[f]:{\$exists:true}},{[f]:1,_id:0}).sort({[f]:-1}).limit(1).toArray()[0];if(r&&r[f]){const t=new Date(r[f]).toISOString().slice(0,10);if(!m||t>m)m=t}}out[dn+'.'+c]={n:d[c].countDocuments({}),newest:m}}};print(JSON.stringify(out))"
SEC=$($DK exec "$NAME" mongosh --quiet --eval "$Q" 2>/dev/null | tail -1 | tr -d '\r')
echo "$SEC" | jq -e . >/dev/null 2>&1 || { say "ABORT the collection list of the volume is unreadable"; exit 1; }
LV=$($DK exec "$LIVE" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$Q" 2>/dev/null | tail -1 | tr -d '\r')
echo "$LV" | jq -e . >/dev/null 2>&1 || { LV='{}'; say "the live database could not be read: every collection below shows live=?"; }

NS=$(echo "$SEC" | jq -r 'keys | length'); DOCS=$(echo "$SEC" | jq -r '[.[].n] | add // 0')
say "the volume holds $NS collection(s), $DOCS document(s) (database 'local' skipped)"
ONLY=0; MORE=0
for k in $(echo "$SEC" | jq -r 'keys[]'); do
  n=$(echo "$SEC" | jq -r --arg k "$k" '.[$k].n'); nw=$(echo "$SEC" | jq -r --arg k "$k" '.[$k].newest // "none"')
  ln=$(echo "$LV" | jq -r --arg k "$k" '.[$k].n // "?"'); lw=$(echo "$LV" | jq -r --arg k "$k" '.[$k].newest // "none"')
  verdict=same-or-fewer
  if [ "$ln" = "?" ]; then verdict="NOT IN THE LIVE DATABASE"; [ "$n" -gt 0 ] && ONLY=$((ONLY+1)); elif [ "$n" -gt "$ln" ]; then verdict="MORE THAN LIVE"; MORE=$((MORE+1)); fi
  say "$k: volume=$n newest=$nw live=$ln newest=$lw -> $verdict"
done
say "summary: $ONLY non-empty collection(s) missing from the live database, $MORE collection(s) with more documents than live; everything else is a copy or older"

[ "$APPLY" = yes ] || { say "dry run (read-only): nothing was changed. To apply, set APPLY=yes in this task (after the review of the lines above)"; exit 0; }

# ---- APPLY: dump, verify, remove (only this volume)
OTHERS=$(echo "$USERS" | tr ' ' '\n' | grep -v '^$' | grep -vx "$NAME" | tr '\n' ' ')
[ -z "$OTHERS" ] || { say "ABORT container(s) still use the volume: $OTHERS: nothing removed"; exit 1; }
sudo -n test -d "$B" || { say "ABORT $B does not exist"; exit 1; }
OUT="$B/${VOL}-$(date -u +%Y%m%d-%H%M%S).archive.gz"
( umask 077; $DK exec "$NAME" mongodump --quiet --host 127.0.0.1 --port 27017 --numParallelCollections=1 --gzip --archive 2>/dev/null | sudo -n tee "$OUT" >/dev/null )
BYTES=$(sudo -n stat -c %s "$OUT" 2>/dev/null || echo 0)
if [ "$BYTES" -le 0 ]; then say "ABORT the dump is empty: nothing removed"; sudo -n rm -f -- "$OUT"; exit 1; fi
sudo -n gzip -t "$OUT" 2>/dev/null || { say "ABORT the archive fails gzip -t: nothing removed (kept $OUT for inspection)"; exit 1; }
LISTED=$(sudo -n cat "$OUT" | $DK exec -i "$NAME" mongorestore --dryRun --verbose --gzip --archive --host 127.0.0.1 --port 27017 2>&1 | grep -c 'found collection .* bson to restore to')
if [ "$LISTED" -lt "$NS" ]; then say "ABORT the archive lists $LISTED collection(s), $NS were counted: nothing removed (kept $OUT)"; exit 1; fi
say "dump written: $(basename "$OUT") $(mb "$BYTES") MB, gzip ok, lists $LISTED collection(s) (counted $NS)"
$DK rm -f "$NAME" >/dev/null 2>&1
if $DK volume rm "$VOL" >/dev/null 2>&1; then say "APPLIED: volume $VOL removed (about $(( (SIZE + 512) / 1024 )) MB); the archive is in $B"; else say "volume rm failed (a container still holds it?): archive kept in $B"; exit 1; fi
