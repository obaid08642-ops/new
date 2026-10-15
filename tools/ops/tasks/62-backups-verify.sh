#!/bin/bash
# ops-detach: runs detached on the server (see server-inspect.yml); the workflow polls its log.
# D-33 proof on production (reviewer, 2026-10-15), after 61-backups-env and 60-deploy-main:
#   1. the running backend has BACKUP_REPORT_TOKEN (recreated with the deploy's compose files if not) and answers
#      POST /api/v1/ops/backup-runs without the token with 401
#   2. one real backup.sh run (as root, like cron): local dump + off-server copy to the private bucket
#   3. the uploaded object is read back from the bucket with the backup key and its sha256 equals the local archive
#   4. the backup key cannot read the public CDN bucket (S3_BUCKET)
#   5. backup_runs holds this run's local and offsite reports, both ok
#   6. one test mail to OPS_ALERT_EMAIL (Resend, like monitor.sh)
# Prints names, sizes, hashes and counts only. Idempotent: each run adds one more dated backup.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
DK="sudo -n docker"
echo "## backups-verify"
envget() { sudo -n grep -E "^$1=" "$ENVF" | tail -1 | cut -d= -f2- | sed -E "s/^[\"']//; s/[\"']$//"; }
DBN=$(envget DB_NAME); DBN=${DBN:-nabd_nestjs}
URL=$(envget BACKUP_REPORT_URL)
[ -n "$URL" ] && [ -n "$(envget BACKUP_S3_BUCKET)" ] || { echo "backups: ABORT run 61-backups-env first"; exit 1; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
mq() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin '"$DBN"' --eval "$0"' "$1" 2>/dev/null | tail -1; }

# the checks run in verify(); the test mail (6) goes out whatever their result, and says it
verify() {
  # ---------------------------------------------------------------- 1. backend reads the report token
  if ! $DK exec nabdah-backend sh -c '[ "${#BACKUP_REPORT_TOKEN}" -ge 32 ]' 2>/dev/null; then
    F="-f $D/docker-compose.production.yml"; sudo -n test -f $D/docker-compose.release.yml && F="$F -f $D/docker-compose.release.yml"
    $DK compose $F --project-directory $D --env-file $ENVF up -d --no-deps backend >/dev/null 2>&1
    for i in $(seq 1 40); do [ "$(health nabdah-backend)" = healthy ] && break; sleep 5; done
    [ "$(health nabdah-backend)" = healthy ] || { echo "backups: ABORT backend not healthy after reading the new env"; return 1; }
    $DK exec nabdah-backend sh -c '[ "${#BACKUP_REPORT_TOKEN}" -ge 32 ]' || { echo "backups: ABORT backend still has no BACKUP_REPORT_TOKEN"; return 1; }
    echo "backups: backend recreated to read BACKUP_REPORT_TOKEN"
  fi
  # a valid body without the token: validation passes, so only the missing token can refuse it
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST -H 'Content-Type: application/json' \
    --data "{\"kind\":\"local\",\"ok\":true,\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" "${URL%/}/api/v1/ops/backup-runs")
  NOREPORT=0
  case "$C" in
    401) echo "backups: backend has the report token; the endpoint refuses a run without it (401)" ;;
    404) NOREPORT=1; echo "backups: the running backend has no /ops/backup-runs (code before D-34): the upload is checked, the reports are not" ;;
    *) echo "backups: ABORT POST /api/v1/ops/backup-runs without the token answered $C, wanted 401"; return 1 ;;
  esac

  # ---------------------------------------------------------------- 2. one real run
  START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  BEFORE=$(mq "db.backup_runs.countDocuments()")
  sudo -n bash $D/scripts/backup.sh > /tmp/ops-backup-run.log 2>&1; rc=$?
  sed -E 's/^/backups:   /' /tmp/ops-backup-run.log | cut -c1-500; rm -f /tmp/ops-backup-run.log
  [ $rc = 0 ] || { echo "backups: FAIL backup.sh exit $rc"; return 1; }

  # ---------------------------------------------------------------- 3 + 4. read back, and the key's limits
  CHECK=$(sudo -n bash -c '
    source '"$D"'/scripts/_backup-common.sh; nabd_load_env
    f=$(ls -1t "$BACKUP_DIR"/nabd_*.gz | head -1); n=$(basename "$f")
    echo "name=$n"; echo "local=$(sha256sum < "$f" | cut -d" " -f1)"; echo "size=$(stat -c %s "$f")"
    echo "remote=$(backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/mongodb/$n" - 2>/dev/null | sha256sum | cut -d" " -f1)"
    echo "objects=$(backup_aws s3 ls "s3://$BACKUP_S3_BUCKET/mongodb/" 2>/dev/null | grep -c "nabd_")"
    if [ -n "${S3_BUCKET:-}" ]; then backup_aws s3 ls "s3://$S3_BUCKET/" >/dev/null 2>&1 && echo "public=readable" || echo "public=denied"; else echo "public=none"; fi')
  v() { printf '%s\n' "$CHECK" | grep "^$1=" | cut -d= -f2-; }
  echo "backups: newest archive $(v name), $(v size) bytes, sha256 $(v local | cut -c1-16)…"
  [ -n "$(v local)" ] && [ "$(v local)" = "$(v remote)" ] || { echo "backups: FAIL the copy read back from the bucket differs (remote sha256 $(v remote | cut -c1-16)…)"; return 1; }
  echo "backups: read back from the private bucket: same sha256 ($(v objects) backup object(s) in mongodb/)"
  case "$(v public)" in
    denied) echo "backups: the backup key cannot read the public CDN bucket (access denied), as intended" ;;
    readable) echo "backups: FAIL the backup key can read the public CDN bucket: it is not limited to the backup bucket"; return 1 ;;
    *) echo "backups: no S3_BUCKET configured, public-bucket check skipped" ;;
  esac

  # ---------------------------------------------------------------- 5. the reports
  [ $NOREPORT = 1 ] && { echo "backups: reports not checked (no D-34 endpoint on the running backend)"; return 2; }
  R=$(mq "print(JSON.stringify(db.backup_runs.find({reported_at: {\$gte: new Date('$START')}}, {_id:0, kind:1, ok:1, size_bytes:1}).toArray()))")
  echo "backups: backup_runs since $START: $R (before: $BEFORE rows)"
  for k in local offsite; do
    printf '%s' "$R" | python3 -c 'import json,sys; rows=json.load(sys.stdin); sys.exit(0 if any(r.get("kind")==sys.argv[1] and r.get("ok") is True for r in rows) else 1)' $k \
      || { echo "backups: FAIL no ok '$k' report in backup_runs"; return 1; }
  done
  echo "backups: /ops/backup-runs recorded this run: local ok, offsite ok"
}
verify; RESULT=$?
case $RESULT in
  0) SUMMARY="all checks passed: local dump, off-server copy read back with the same sha256, both runs reported" ;;
  2) SUMMARY="local dump and off-server copy (read back, same sha256) passed; reports not checked: the running backend predates D-34"; RESULT=0 ;;
  *) SUMMARY="a check FAILED (see the ops report); the local nightly dump keeps running either way" ;;
esac
echo "backups: result: $SUMMARY"
# ---------------------------------------------------------------- 6. a test mail to OPS_ALERT_EMAIL (reviewer, 2026-10-15)
# the same way monitor.sh sends its alerts (Resend, RESEND_API_KEY + MAIL_FROM); the address is not printed
MAILURL=${OPS_RESEND_URL:-https://api.resend.com/emails}
CODE=$(sudo -n bash -c '
  set -a; source '"$ENVF"' 2>/dev/null; set +a
  [ -n "${RESEND_API_KEY:-}" ] && [ -n "${MAIL_FROM:-}" ] && [ -n "${OPS_ALERT_EMAIL:-}" ] || { echo unset; exit 0; }
  python3 -c "import json,sys; print(json.dumps({\"from\": sys.argv[1], \"to\": [sys.argv[2]], \"subject\": \"[nabd.plus] test: backups and alerts are set up\", \"text\": sys.argv[3]}))" \
    "$MAIL_FROM" "$OPS_ALERT_EMAIL" "$(hostname) $(date -u +%FT%TZ): off-server backups (D-33) and the disk/service alerts are installed. Backup check: $2. This is a test mail." \
  | curl -s -o /dev/null -w "%{http_code}" --max-time 20 -X POST "$1" -H "Content-Type: application/json" \
      -H @<(printf "Authorization: Bearer %s\n" "$RESEND_API_KEY") --data-binary @-' _ "$MAILURL" "$SUMMARY")
case "$CODE" in
  20?) echo "backups: test mail sent to OPS_ALERT_EMAIL (HTTP $CODE)" ;;
  unset) echo "backups: FAIL test mail not sent: RESEND_API_KEY, MAIL_FROM or OPS_ALERT_EMAIL missing in .env.production"; exit 1 ;;
  *) echo "backups: FAIL test mail refused (HTTP $CODE)"; exit 1 ;;
esac
[ $RESULT = 0 ] || { echo "backups: FAIL see the lines above"; exit 1; }
echo "## backups-verify done"
