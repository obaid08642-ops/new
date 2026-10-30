#!/bin/bash
# 20.8 rehearsal on a REAL MongoDB 7 replica set (CI, .github/workflows/dr-drill.yml). Test data only.
# Proves: the nightly dump + 10-minute oplog slices, both encrypted, restore the database to its newest state from the
# off-server copies alone (inserts, updates, deletes and a transaction made AFTER the dump come back), the drill measures
# RPO and RTO and reports them, and a wrong key or a gap in the chain fails the drill instead of passing.
set -uo pipefail
cd "$(dirname "$0")/../../.."
S=deploy/scripts
W=$(mktemp -d)
export NABD_ENV_FILE=/dev/null BACKUP_DIR="$W/backups" DB_NAME=nabd_nestjs MONGO_CONTAINER=nabdah-mongodb
export BACKUP_S3_ENDPOINT=http://127.0.0.1:5555 BACKUP_S3_BUCKET=nabd-backups-test BACKUP_S3_ACCESS_KEY_ID=bk-test BACKUP_S3_SECRET_ACCESS_KEY=bk-secret-test BACKUP_S3_REGION=us-east-1
openssl rand -hex 32 > "$W/pass"; chmod 400 "$W/pass"; export BACKUP_ENCRYPTION_PASSPHRASE_FILE="$W/pass"
export BACKUP_REPORT_URL=http://127.0.0.1:5556 BACKUP_REPORT_TOKEN=$(openssl rand -hex 24)
unset MONGO_ROOT_USER MONGO_ROOT_PASSWORD S3_BUCKET S3_ACCESS_KEY_ID
n=0; bad=0
check() { n=$((n+1)); if [ "$2" = 0 ]; then echo "ok $n - $1"; else echo "NOT OK $n - $1"; bad=$((bad+1)); fi; }
sh() { docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "$1"; }
counts() { sh "const d=db.getSiblingDB('nabd_nestjs'); d.getCollectionNames().sort().map(c => c+'='+d.getCollection(c).countDocuments({})).join(' ')" | tail -1; }
aws_b() { AWS_ACCESS_KEY_ID=$BACKUP_S3_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$BACKUP_S3_SECRET_ACCESS_KEY aws "$@" --endpoint-url "$BACKUP_S3_ENDPOINT" --region us-east-1; }

aws_b s3 mb "s3://$BACKUP_S3_BUCKET" >/dev/null
python3 - "$W/reports.jsonl" <<'PY' &
import http.server, sys
out = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("content-length", 0))).decode()
        open(out, "a").write(body + "\n")
        self.send_response(201); self.end_headers(); self.wfile.write(b"{}")
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", 5556), H).serve_forever()
PY
sleep 1

sh "const d=db.getSiblingDB('nabd_nestjs'); d.users.insertMany(Array.from({length:50},(_, i)=>({_id:'u'+i,name:'SECRET-MARKER-'+i,v:1}))); d.bookings.insertMany(Array.from({length:30},(_, i)=>({_id:'b'+i,user:'u'+i}))); d.orders.insertOne({_id:'o0'})" >/dev/null

# the chain must start before the dump does
bash $S/oplog-backup.sh >"$W/o0.log" 2>&1; check "oplog chain starts" $?
sleep 2
bash $S/backup.sh >"$W/b.log" 2>&1; check "nightly backup (dump + oplog start + encrypted off-site copy)" $?
aws_b s3 ls "s3://$BACKUP_S3_BUCKET/mongodb/" | grep -q '\.gz\.gpg$'; check "off-site dump is .gpg" $?
aws_b s3 ls "s3://$BACKUP_S3_BUCKET/mongodb/" | grep -q '\.gz\.gpg\.oplogts$'; check "dump has its oplog start marker" $?
aws_b s3 cp "s3://$BACKUP_S3_BUCKET/mongodb/$(aws_b s3 ls "s3://$BACKUP_S3_BUCKET/mongodb/" | awk '/\.gz\.gpg$/{print $4}' | head -1)" "$W/enc" >/dev/null
! gzip -dc "$W/enc" 2>/dev/null | grep -aq SECRET-MARKER; check "off-site dump is not readable without the passphrase" $?

# writes after the dump: slice 1
sleep 2
sh "const d=db.getSiblingDB('nabd_nestjs'); d.users.insertMany(Array.from({length:7},(_, i)=>({_id:'late'+i,name:'SECRET-MARKER-late',v:1}))); d.users.updateMany({_id:/^u1/},{\$set:{v:2}}); d.bookings.deleteMany({_id:/^b2/})" >/dev/null
sleep 2
bash $S/oplog-backup.sh >"$W/o1.log" 2>&1; check "oplog slice 1" $?
# slice 2 includes a transaction
sh "const s=db.getMongo().startSession(); s.startTransaction(); const d=s.getDatabase('nabd_nestjs'); d.users.insertOne({_id:'tx1',v:3}); d.orders.insertOne({_id:'tx-o1'}); s.commitTransaction()" >/dev/null
sh "db.getSiblingDB('nabd_nestjs').orders.insertOne({_id:'o-last'})" >/dev/null
sleep 2
bash $S/oplog-backup.sh >"$W/o2.log" 2>&1; check "oplog slice 2 (with a transaction)" $?
aws_b s3 ls "s3://$BACKUP_S3_BUCKET/oplog/" | grep -c 'oplog_.*\.bson\.gz\.gpg' | grep -q '^2$'; check "two encrypted slices off-site" $?

LIVE=$(counts); echo "live:     $LIVE"

# the oplog backup refuses to run without a key (never uploads in the clear)
( unset BACKUP_ENCRYPTION_PASSPHRASE_FILE; bash $S/oplog-backup.sh >"$W/nokey.log" 2>&1 ); [ $? -ne 0 ]; check "no passphrase -> oplog backup fails" $?

# a deploy (lock held) makes the slice skip quietly: exit 0, nothing reported, the state does not move, so no gap
export NABD_DEPLOY_LOCK="$W/deploy.lock"
STATE_BEFORE=$(cat "$BACKUP_DIR/oplog.state")
touch "$NABD_DEPLOY_LOCK"
bump() { sh "db.getSiblingDB('nabd_nestjs').users.updateOne({_id:'tx1'},{\$inc:{v:1}})" >/dev/null; }
bump
bash $S/oplog-backup.sh >"$W/lock.log" 2>&1; check "deploy lock held -> slice skipped, exit 0" $?
grep -q 'skipped (deploy in progress)' "$W/lock.log" && ! grep -q 'FAIL oplog' "$W/lock.log"; check "skip is quiet (no FAIL report)" $?
[ "$(cat "$BACKUP_DIR/oplog.state")" = "$STATE_BEFORE" ]; check "state not advanced by a skipped run" $?
rm -f "$NABD_DEPLOY_LOCK"

# a transient failure (mongodump fails once, like Mongo restarting) is retried once and succeeds with no report of failure
bump
mkdir -p "$W/shim"; cat > "$W/shim/docker" <<SHIM
#!/bin/bash
if { [ "\$1" = exec ] || [ "\$1" = run ]; } && [[ " \$* " == *" mongodump "* ]] && [ ! -e "$W/dumped-once" ]; then touch "$W/dumped-once"; exit 1; fi
exec $(command -v docker) "\$@"
SHIM
chmod +x "$W/shim/docker"
OPLOG_RETRY_DELAY=1 OPLOG_RESTART_GRACE=0 PATH="$W/shim:$PATH" bash $S/oplog-backup.sh >"$W/retry.log" 2>&1; check "transient failure -> retried once and succeeds" $?
# the retry now happens inside mongodump_oneoff (2026-10-30, P0 run 61) and the oplog script discards its output, so the log cannot show it: the shim's marker proves the dump DID fail once
[ -e "$W/dumped-once" ] && grep -q 'slice uploaded' "$W/retry.log" && ! grep -q 'FAIL oplog' "$W/retry.log"; check "retry uploaded the slice without a failure report" $?
aws_b s3 ls "s3://$BACKUP_S3_BUCKET/oplog/" | grep -c 'oplog_.*\.bson\.gz\.gpg' | grep -q '^3$'; check "the skipped interval is covered by the next slice (3 slices, chain unbroken)" $?

# a failure that persists after the retry is reported
bump
cat > "$W/shim/docker" <<SHIM
#!/bin/bash
if { [ "\$1" = exec ] || [ "\$1" = run ]; } && [[ " \$* " == *" mongodump "* ]]; then exit 1; fi
exec $(command -v docker) "\$@"
SHIM
( OPLOG_RETRY_DELAY=1 OPLOG_RESTART_GRACE=0 PATH="$W/shim:$PATH" bash $S/oplog-backup.sh >"$W/hard.log" 2>&1 ); [ $? -ne 0 ] && grep -q 'FAIL oplog slice: mongodump of the oplog failed (after one retry)' "$W/hard.log"; check "a failure that survives the retry is reported" $?
bump
bash $S/oplog-backup.sh >"$W/o3.log" 2>&1; check "next run after the failure covers the interval (no gap)" $?

# a stuck drill must fail within 4 minutes and say where it is stuck (timeout alone only stops the shell, not a hung docker exec under it)
bash $S/dr-drill.sh >"$W/drill.log" 2>&1 &
dp=$!
for _ in $(seq 1 120); do kill -0 $dp 2>/dev/null || break; sleep 2; done
if kill -0 $dp 2>/dev/null; then
  echo "--- drill still running after 240 s; processes:"; ps -eo pid,ppid,etime,args | grep -E "dr-drill|mongo|docker|gpg|gzip|aws" | grep -v grep | cut -c1-220
  docker ps -a | cut -c1-160
  pkill -KILL -P $dp 2>/dev/null; kill -KILL $dp 2>/dev/null; rc=124
else
  wait $dp; rc=$?
fi
cat "$W/drill.log"
check "DR drill passes from the off-site copies" $rc
RESTORED=$(sed -n 's/.*restored collections: //p' "$W/drill.log" | tail -1); echo "restored: $RESTORED"
[ -n "$RESTORED" ] && [ "$RESTORED" = "$LIVE" ]; check "restored collection counts equal the live database (post-dump writes included)" $?
python3 - "$W/reports.jsonl" <<'PY'
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
dr = [r for r in rows if r["kind"] == "dr_drill"]
assert dr and dr[-1]["ok"] is True, rows
assert dr[-1]["rpo_seconds"] <= 900 and dr[-1]["rto_seconds"] <= 3600, dr[-1]
assert any(r["kind"] == "oplog" and r["ok"] for r in rows)
print("report:", dr[-1])
PY
check "dr_drill report carries RPO <= 900 s and RTO <= 3600 s" $?
docker ps --format '{{.Names}}' | grep -q nabd-dr-drill; [ $? -ne 0 ]; check "throwaway mongod removed" $?

# a wrong key fails the drill and reports it
( openssl rand -hex 32 > "$W/wrong"; BACKUP_ENCRYPTION_PASSPHRASE_FILE="$W/wrong" bash $S/dr-drill.sh >"$W/wrongkey.log" 2>&1 ); [ $? -ne 0 ]; check "wrong passphrase -> drill fails" $?
tail -1 "$W/reports.jsonl" | grep -q '"kind":"dr_drill","ok":false'; check "failed drill is reported ok=false" $?

# a hole in the chain: remove slice 1 -> no unbroken chain from the dump -> drill fails
K=$(aws_b s3 ls "s3://$BACKUP_S3_BUCKET/oplog/" | awk '{print $4}' | sort | head -1)
aws_b s3 rm "s3://$BACKUP_S3_BUCKET/oplog/$K" >/dev/null
( bash $S/dr-drill.sh >"$W/gap.log" 2>&1 ); [ $? -ne 0 ]; check "missing slice (gap) -> drill fails" $?

echo "$((n-bad))/$n checks passed"
[ "$bad" = 0 ]
