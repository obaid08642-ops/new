#!/bin/bash
# ═══ Disaster recovery drill (20.8, D-33): restore from the OFF-SERVER copies only, measure RPO and RTO ═══
# Downloads the newest dump and the unbroken oplog chain that follows it from the private bucket, decrypts them, restores
# into a throwaway mongod container with no network to production (so oplog replay can never touch real data), replays the
# oplog, checks the data came back and reports to the admin page as kind "dr_drill":
#   rpo_seconds  worst gap between oplog uploads in the last 24 h (what a disaster at the worst moment would have lost)
#   rto_seconds  wall time of this whole restore (download, decrypt, restore, replay, verify)
# ok only when the restore passed AND rpo <= DR_RPO_TARGET (900 s) AND rto <= DR_RTO_TARGET (3600 s).
# DR_TARGET_TIME=<epoch seconds> restores to that moment instead of the newest one (a real recovery uses the same code).
# Schedule: monthly (deploy/cron/nabd-backups). Runbook: docs/runbooks/disaster-recovery.md.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env

RPO_TARGET=${DR_RPO_TARGET:-900}
RTO_TARGET=${DR_RTO_TARGET:-3600}
IMAGE=${DR_MONGO_IMAGE:-mongo:7.0}
T0=$(date +%s)
TMP=$(mktemp -d)
CTR="nabd-dr-drill-$T0-$$"
RPO=""
cleanup() { docker rm -f "$CTR" >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT
fail() { echo "[dr-drill] FAIL: $1"; report_dr dr_drill false "$RPO" "$(( $(date +%s) - T0 ))" "$1"; exit 1; }
list() { # list <prefix> -> JSON [{key, modified}]
  backup_aws s3api list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix "$1" --output json 2>/dev/null \
    | python3 -I -c 'import json,sys,datetime
d=json.load(sys.stdin) or {}
print(json.dumps([{"key":o["Key"],"modified":int(datetime.datetime.fromisoformat(o["LastModified"].replace("Z","+00:00")).timestamp())} for o in d.get("Contents") or []]))'
}

ERR=$(private_bucket_error)
[ -z "$ERR" ] || fail "$ERR"
backup_encryption_enabled || fail "BACKUP_ENCRYPTION_PASSPHRASE_FILE not set, the oplog slices cannot be decrypted"

# ── 1. Plan: which dump + which oplog slices ────────────────────────────────
DUMPS=$(list mongodb/) || fail "cannot list mongodb/ in the private bucket"
SLICES=$(list oplog/) || fail "cannot list oplog/ in the private bucket"
BASES=$(python3 -I - "$DUMPS" <<'PY'
import json, sys
print(json.dumps([o["key"] for o in json.loads(sys.argv[1]) if o["key"].endswith(".oplogts")]))
PY
)
DUMP_LIST="[]"
for sk in $(python3 -I -c 'import json,sys;print(" ".join(json.loads(sys.argv[1])))' "$BASES"); do
  base=$(backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/$sk" - 2>/dev/null | head -1)
  DUMP_LIST=$(python3 -I -c 'import json,sys;l=json.loads(sys.argv[1]);l.append({"key":sys.argv[2][:-8],"base":sys.argv[3].strip()});print(json.dumps(l))' "$DUMP_LIST" "$sk" "$base")
done
PLAN=$(python3 -I -c 'import json,sys,time
print(json.dumps({"now":int(time.time()),"dumps":json.loads(sys.argv[1]),"slices":json.loads(sys.argv[2]),"target":int(sys.argv[3]) if sys.argv[3] else None}))' \
  "$DUMP_LIST" "$SLICES" "${DR_TARGET_TIME:-}" | python3 -I "$(dirname "$0")/dr_plan.py")
pl() { python3 -I -c 'import json,sys;v=json.loads(sys.argv[1])[sys.argv[2]];print(" ".join(v) if isinstance(v,list) else ("" if v is None else v))' "$PLAN" "$1"; }
[ "$(pl ok)" = True ] || fail "$(pl error)"
DUMP_KEY=$(pl dump); RPO=$(pl rpo_seconds); END=$(pl end)
echo "[dr-drill] dump $DUMP_KEY, oplog slices: $(pl slices | wc -w), replay up to $END"

# ── 2. Download and decrypt ─────────────────────────────────────────────────
backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/$DUMP_KEY" "$TMP/dump.raw" --only-show-errors >/dev/null 2>&1 || fail "dump download failed"
case "$DUMP_KEY" in
  *.gpg) backup_decrypt "$TMP/dump.raw" > "$TMP/dump.gz" || fail "dump decryption failed (wrong passphrase?)" ;;
  *) mv "$TMP/dump.raw" "$TMP/dump.gz" ;;
esac
: > "$TMP/oplog.bson"
for k in $(pl slices); do
  backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/$k" "$TMP/slice.gpg" --only-show-errors >/dev/null 2>&1 || fail "download failed: $k"
  backup_decrypt "$TMP/slice.gpg" | gzip -dc >> "$TMP/oplog.bson" || fail "slice decryption failed: $k"
done

# ── 3. Throwaway mongod, no network ─────────────────────────────────────────
docker run -d --rm --network none --name "$CTR" "$IMAGE" mongod --noauth --bind_ip 127.0.0.1 >/dev/null || fail "cannot start the throwaway mongod ($IMAGE)"
up=0
for _ in $(seq 1 60); do
  docker exec "$CTR" mongosh --quiet --eval 'db.adminCommand("ping").ok' 2>/dev/null | tail -1 | grep -q '^1$' && { up=1; break; }
  sleep 1
done
[ "$up" = 1 ] || fail "the throwaway mongod did not start"

# ── 4. Restore the dump, replay the oplog ───────────────────────────────────
docker exec -i "$CTR" mongorestore --quiet --archive --gzip --nsInclude="$DB_NAME.*" < "$TMP/dump.gz" || fail "mongorestore of the dump failed"
if [ -s "$TMP/oplog.bson" ]; then
  LIMIT=()
  [ -z "${DR_TARGET_TIME:-}" ] || LIMIT=(--oplogLimit "$DR_TARGET_TIME")
  docker cp "$TMP/oplog.bson" "$CTR:/tmp/oplog.bson" >/dev/null || fail "cannot copy the oplog into the container"
  docker exec "$CTR" sh -c 'mkdir -p /tmp/empty' || fail "mkdir failed"
  docker exec "$CTR" mongorestore --quiet --oplogReplay --oplogFile /tmp/oplog.bson "${LIMIT[@]}" /tmp/empty || fail "oplog replay failed"
fi

# ── 5. Verify ───────────────────────────────────────────────────────────────
COUNTS=$(docker exec "$CTR" mongosh --quiet --eval "const d=db.getSiblingDB('$DB_NAME'); d.getCollectionNames().sort().map(c => c+'='+d.getCollection(c).countDocuments({})).join(' ')" | tail -1)
NONEMPTY=$(printf '%s' "$COUNTS" | tr ' ' '\n' | grep -c '=[1-9]' || true)
echo "[dr-drill] restored collections: $COUNTS"
[ "${NONEMPTY:-0}" -ge 2 ] || fail "restored database has ${NONEMPTY:-0} non-empty collection(s)"

# ── 6. Targets ──────────────────────────────────────────────────────────────
RTO=$(( $(date +%s) - T0 ))
SUMMARY="RPO ${RPO:-unknown} s (target ${RPO_TARGET}), RTO ${RTO} s (target ${RTO_TARGET})"
mkdir -p "$BACKUP_DIR"
printf 'dr-drill %s UTC\ndump: %s\noplog replayed to: %s\n%s\ncollections: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%S)" "$DUMP_KEY" "$END" "$SUMMARY" "$COUNTS" \
  > "$BACKUP_DIR/dr-drill-report-$(date -u +%Y%m%d).txt"
if [ -z "$RPO" ]; then fail "no oplog upload in the last 24 h, the RPO cannot be shown ($SUMMARY)"; fi
if [ "$RPO" -gt "$RPO_TARGET" ] || [ "$RTO" -gt "$RTO_TARGET" ]; then fail "target missed: $SUMMARY"; fi
echo "[dr-drill] PASSED: $SUMMARY"
report_dr dr_drill true "$RPO" "$RTO"
