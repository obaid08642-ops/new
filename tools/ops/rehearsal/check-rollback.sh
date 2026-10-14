#!/bin/bash
# Rehearsal check after a forced failure of tools/ops/tasks/60-deploy-main.sh: everything is back as it was.
# Usage: check-rollback.sh <task output> <task exit code> <forced step>
set -u
OUT=$1; RC=$2; STEP=$3; D=/opt/nabdah/deploy; fail=0
no() { echo "FAIL: $1"; fail=1; }
grep -q "forced failure at $STEP" "$OUT" && echo "reached the forced failure point ($STEP)" || no "forced point not reached"
[ "$RC" = 1 ] && echo "exit=1" || no "exit=$RC"
grep -q 'deploy: rollback complete' "$OUT" && echo "task reports: rollback complete" || no "task did not report a complete rollback"
# each service runs the image the task pinned as its newest rollback-<ts> tag (patient-web: the committed container)
for s in backend admin-web patient-web; do
  TAG=$(sudo docker images --format '{{.Tag}}' nabdah-$s | grep '^rollback-' | sort | tail -1)
  WANT=$(sudo docker image inspect -f '{{.Id}}' nabdah-$s:$TAG 2>/dev/null)
  [ -n "$WANT" ] && [ "$(sudo docker inspect -f '{{.Image}}' nabdah-$s)" = "$WANT" ] && echo "$s: old image ($TAG)" || no "$s not on its rollback image"
done
STUB=$(sudo docker image inspect -f '{{.Id}}' nabdah-prod-backend:latest)
[ "$(sudo docker inspect -f '{{.Image}}' nabdah-backend)" = "$STUB" ] && echo "backend: the stub image it ran before" || no "backend not on the stub image"
sudo grep -qF social_login_temporarily_disabled $D/nginx/conf.d/nabd.plus.conf && echo "Q107 hotfix still in the api vhost" || no "Q107 hotfix lost"
for c in nabdah-worker nabdah-meilisearch; do sudo docker inspect $c >/dev/null 2>&1 && no "$c still exists" || echo "$c: removed"; done
sudo sha256sum -c --quiet /opt/nabdah/old.sums && echo "nginx.conf, compose file, .env.production: identical to before" || no "files differ from before"
sudo test -e $D/docker-compose.release.yml && no "docker-compose.release.yml left behind" || echo "release override: removed"
[ "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)" = 200 ] && echo "api 200" || no "api not 200"
[ "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: nabd.plus' https://127.0.0.1/ar)" = 200 ] && echo "site 200" || no "site not 200"
ls /opt/nabdah/backups/pre-deploy-*.gz >/dev/null 2>&1 && echo "pre-deploy backup kept" || no "no pre-deploy backup"
exit $fail
