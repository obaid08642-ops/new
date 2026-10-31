#!/bin/bash
# The production mongod holds other databases next to the app database (run 75: nabd_staging 259 MB, temp_restore 210 MB, next to nabd_nestjs 601 MB). What are they, and may they go?
# READ-ONLY by default: for every database except admin/local/config and the app database it prints, per collection, the document count, the newest updatedAt/createdAt date and the storage MB,
# and the count of the same collection in the app database (names, counts and dates only, never a value).
#   DROP_DBS="nabd_staging temp_restore" APPLY=yes   (set in this file by the reviewer after reading the dry run): for each NAMED database, one at a time:
#       1. refuse it if it is admin, local, config or the app database (DB_NAME of nabdah-backend, default nabd_nestjs) or is not on the server;
#       2. dump it with the one-off dump (same image, caps and network as the nightly) to $OPS_BACKUP_DIR/extra-db-<name>-<timestamp>.archive.gz;
#       3. verify: non-empty, gzip -t, and `mongorestore --dryRun` lists at least as many collections as were counted;
#       4. only then dropDatabase on THAT database. Any failed step = that database is not dropped.
#   A database that is not named in DROP_DBS is never touched. The app database is never touched by this task.
set -u
APPLY=${APPLY:-no}
DROP_DBS=${DROP_DBS:-}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
DK="sudo -n docker"; CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
echo "## extra-dbs"
say() { echo "status: extra-dbs: $*"; }
mb() { echo $(( ($1 + 524288) / 1048576 )); }
q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tr -d '\r'; }
APP=$($DK exec nabdah-backend printenv DB_NAME 2>/dev/null | tr -d '\r'); APP=${APP:-nabd_nestjs}
# print() writes the raw JSON (a bare expression would be printed quoted by mongosh)
ALL=$(q "const o={};for(const x of db.adminCommand({listDatabases:1}).databases){if(['admin','local','config'].includes(x.name))continue;const d=db.getSiblingDB(x.name);const cs={};for(const c of d.getCollectionNames()){if(c.startsWith('system.'))continue;let m=null;for(const f of ['updatedAt','createdAt','updated_at','created_at']){const r=d.getCollection(c).find({[f]:{\$exists:true}},{[f]:1,_id:0}).sort({[f]:-1}).limit(1).toArray()[0];if(r&&r[f]){const t=new Date(r[f]).toISOString().slice(0,10);if(!m||t>m)m=t}}cs[c]={n:d.getCollection(c).estimatedDocumentCount(),newest:m,mb:Math.round(d.getCollection(c).stats().storageSize/1048576)}}o[x.name]={mb:Math.round(x.sizeOnDisk/1048576),c:cs}}print(JSON.stringify(o))" | grep -E '^\{' | tail -1)
echo "$ALL" | jq -e . >/dev/null 2>&1 || { say "ABORT the database list is unreadable"; exit 1; }
say "app database: $APP (never touched by this task)"
say "databases: $(echo "$ALL" | jq -r 'to_entries | map("\(.key)=\(.value.mb)MB") | join(" ")')"
EXTRA=$(echo "$ALL" | jq -r --arg a "$APP" 'keys[] | select(. != $a)')
[ -n "$EXTRA" ] || { say "no database other than the app database: nothing to do"; exit 0; }
for db in $EXTRA; do
  say "$db: $(echo "$ALL" | jq -r --arg d "$db" '.[$d] | "\(.mb) MB, \(.c|length) collection(s), \([.c[].n]|add // 0) document(s)"')"
  for c in $(echo "$ALL" | jq -r --arg d "$db" '.[$d].c | keys[]'); do
    say "$db.$c: $(echo "$ALL" | jq -r --arg d "$db" --arg c "$c" --arg a "$APP" '.[$d].c[$c] as $x | (.[$a].c[$c] // null) as $y | "\($x.n) docs, \($x.mb) MB, newest \($x.newest // "none"); same collection in \($a): \(if $y then "\($y.n) docs, newest \($y.newest // "none")" else "absent" end)"')"
  done
done
if [ -z "$DROP_DBS" ]; then say "dry run (read-only): nothing was changed. To remove databases set DROP_DBS=\"name ...\" and APPLY=yes in this task (after the review of the lines above)"; exit 0; fi
if [ "$APPLY" != yes ]; then say "dry run: would dump, verify and drop: $DROP_DBS (APPLY=yes to do it)"; exit 0; fi

# ---- APPLY
[ -f "$D/scripts/_mongodump-oneoff.sh" ] && [ -f "$D/scripts/_mongorestore-list.sh" ] || { say "ABORT the dump helpers are not in $D/scripts"; exit 1; }
. "$D/scripts/_mongodump-oneoff.sh"; . "$D/scripts/_mongorestore-list.sh"
MONGO_ROOT_USER=$($DK exec "$CT" printenv MONGO_INITDB_ROOT_USERNAME 2>/dev/null); MONGO_ROOT_PASSWORD=$($DK exec "$CT" printenv MONGO_INITDB_ROOT_PASSWORD 2>/dev/null)
MONGODUMP_DOCKER="$DK"; MONGO_CONTAINER="$CT"; export MONGO_ROOT_USER MONGO_ROOT_PASSWORD MONGODUMP_DOCKER MONGO_CONTAINER
sudo -n test -d "$B" || { say "ABORT $B does not exist"; exit 1; }
RC_ALL=0
for db in $DROP_DBS; do
  case "$db" in admin|local|config) say "$db: REFUSED (system database)"; RC_ALL=1; continue;; esac
  [ "$db" != "$APP" ] || { say "$db: REFUSED (this is the app database)"; RC_ALL=1; continue; }
  echo "$ALL" | jq -e --arg d "$db" 'has($d)' >/dev/null || { say "$db: REFUSED (no such database on the server)"; RC_ALL=1; continue; }
  NS=$(echo "$ALL" | jq -r --arg d "$db" '.[$d].c | length')
  OUT="$B/extra-db-${db}-$(date -u +%Y%m%d-%H%M%S).archive.gz"; TMP=$(mktemp)
  if ! mongodump_oneoff "$TMP" --db="$db" --gzip --archive || [ ! -s "$TMP" ]; then say "$db: ABORT the dump failed or is empty: not dropped"; rm -f "$TMP"; RC_ALL=1; continue; fi
  sudo -n install -m 600 "$TMP" "$OUT"; rm -f "$TMP"
  gzip -t < "$OUT" 2>/dev/null || sudo -n gzip -t "$OUT" 2>/dev/null || { say "$db: ABORT the archive fails gzip -t: not dropped (kept $OUT)"; RC_ALL=1; continue; }
  if [ "$NS" -ge 1 ]; then
    LISTED=$(sudo -n cat "$OUT" | { mongorestore_list_oneoff /dev/stdin; } 2>&1 | sed -n 's/.*archive lists \([0-9]*\) namespace.*/\1/p' | tail -1)
    [ "${LISTED:-0}" -ge "$NS" ] || { say "$db: ABORT the archive lists ${LISTED:-0} of $NS collection(s): not dropped (kept $OUT)"; RC_ALL=1; continue; }
  fi
  say "$db: archive $(basename "$OUT") $(mb "$(sudo -n stat -c %s "$OUT")") MB verified ($NS collection(s))"
  R=$(q "print(JSON.stringify(db.getSiblingDB('$db').dropDatabase()))")
  case "$R" in *'"ok":1'*) say "$db: DROPPED";; *) say "$db: dropDatabase did not confirm ($R): check by hand, the archive is kept"; RC_ALL=1;; esac
done
exit $RC_ALL
