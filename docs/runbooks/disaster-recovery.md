# Disaster recovery: backups, point-in-time recovery, restore (20.8)

**Targets:** RPO ≤ 15 min (at most 15 minutes of writes lost), RTO ≤ 1 h (database restored and verified).
Owner decision D-33 covers the nightly dump and the off-server copy; 20.8 adds oplog slices, encryption and a drill that proves the targets.

## What exists

| Piece | Where | When | Notes |
|---|---|---|---|
| Nightly dump | `deploy/scripts/backup.sh` | 03:00 UTC | 14 days on the server; off-server copy to the private bucket `mongodb/` (AES-256 `.enc` when `BACKUP_ENCRYPTION_KEY` is set); `.oplogts` marker next to it records where the oplog stood when the dump began |
| Oplog slices | `deploy/scripts/oplog-backup.sh` | every 10 min | `oplog/oplog_<from>_<to>.bson.gz.enc`, encrypted always (a slice has every write); the name holds its bounds so a gap is detectable; a roll-over of the oplog reports a GAP and starts a new chain |
| Catalogue export | `catalogue-export.sh` | Sundays | JSON + image list, `catalogue/` |
| Restore drill (local file) | `restore-drill.sh` | 2nd of the month | restores the newest local dump into a throwaway database (D-33) |
| **DR drill (off-server only)** | `deploy/scripts/dr-drill.sh` | 3rd of the month | downloads dump + oplog chain from the bucket, decrypts, restores into a throwaway `mongod` with no network, replays the oplog, verifies, and reports `dr_drill` with measured `rpo_seconds` and `rto_seconds`; fails if either target is missed |

Reports go to the admin page (D-34) as `oplog` and `dr_drill`. A failed run emails the owner. The page turns red when the newest oplog slice is older than 30 min.

Measured numbers: **RPO** is the worst gap between two oplog uploads in the last 24 h (and the age of the newest). With a 10-minute schedule it is about 10–12 min. **RTO** is the wall time of the drill's restore. A real recovery adds the time to decide and to repoint the app (see steps 6–7); budget 15 min for that.

## Keys (do this once)

1. `openssl rand -hex 32` → `BACKUP_ENCRYPTION_KEY` in `deploy/.env.production` on the server.
2. **Put a second copy in the owner's safe (password manager).** Without it the off-server backups cannot be read; with a server fire the first copy is gone too. Never in the repo, chat or the bucket.
3. Rotation: new key for new files; keep the old key as long as files encrypted with it are inside the 30-day expiry.

## Restore (the server is gone or the database is corrupt)

Needs: the private bucket credentials (`BACKUP_S3_*`), `BACKUP_ENCRYPTION_KEY`, a machine with Docker and the `aws` CLI. All of it can be done from a new server.

1. **Decide the target moment.** Newest state (default) or just before a bad change: `DR_TARGET_TIME=<epoch seconds>` (oplog entries from that second on are not applied).
2. **Rehearse on the spot, no production data touched:** `DR_RPO_TARGET=99999 deploy/scripts/dr-drill.sh` prints the dump, the oplog chain used and the restored collection counts. If it fails with "no dump has an unbroken oplog chain" the chain has a hole; fall back to the nightly dump alone (step 5, no replay) and accept up to 24 h of loss.
3. **Start the real database** (new server: `docker compose -f deploy/docker-compose.production.yml up -d mongodb`, wait healthy, `rs.initiate()` for `rs0`).
4. **Stop writers:** `docker compose stop backend fastapi admin-web patient-web` (nothing may write while restoring).
5. **Restore the dump:** download `mongodb/<newest>.gz.enc`, decrypt (`openssl enc -d -aes-256-cbc -pbkdf2 -md sha256 -pass env:BACKUP_ENCRYPTION_KEY`), then  
   `docker exec -i nabdah-mongodb mongorestore -u … -p … --authenticationDatabase admin --archive --gzip --drop --nsInclude='nabd_nestjs.*' < dump.gz`
6. **Replay the oplog (point in time):** concatenate the decrypted, gunzipped slices from `oplog/` in name order into `oplog.bson` (the drill prints the exact list), copy it into the container and run  
   `mongorestore -u … -p … --authenticationDatabase admin --oplogReplay --oplogFile /tmp/oplog.bson [--oplogLimit <epoch>] /tmp/empty`
7. **Verify** collection counts against the last drill report (`/opt/nabdah/backups/dr-drill-report-*.txt`), then start the services in order: backend, fastapi, then the web apps. Check `/api/v1/health/readiness` and the admin Ops page.
8. **After:** take a fresh `backup.sh` immediately (the oplog chain restarts from the restored state), write an incident note (`docs/runbooks/` template), and run the drill again within a day.

## Failures and what they mean

| Alert / message | Cause | Action |
|---|---|---|
| `oplog` run failed: `GAP: the oplog rolled over` | the server was down or slow longer than the oplog window | a new chain started; run `backup.sh` now so a dump covers the hole; check oplog size (`rs.printReplicationInfo()`) |
| `oplog` run failed: `BACKUP_ENCRYPTION_KEY not set` | key missing from the env file | restore the key from the safe |
| `dr_drill` failed: `no dump has an unbroken oplog chain` | no dump whose start is covered | run `backup.sh` then wait one slice; investigate any GAP |
| `dr_drill` failed: `target missed` | RPO > 900 s (slices late or missing) or RTO > 3600 s (data grew; restore too slow) | read the report: for RTO consider a larger machine or sharded restore; for RPO fix the cron |
| `dr_drill` failed: decryption failed | wrong or rotated key | use the key that was current when the files were written |

## Rehearsal in CI

`.github/workflows/dr-drill.yml` runs the three scripts against a real MongoDB 7 replica set and a stand-in bucket: seed, dump, slices (with a transaction), restore from the encrypted off-site copies only, compare collection counts with the live database, check the report carries RPO/RTO within targets, and check a wrong key or a missing slice fails the drill. It runs on every change to these files.
