#!/bin/bash
# Recovery step 2 (2026-10-22). 88 freed the disk (100% -> 80%) but did not start the worker: for a container that does
# not exist the health check printed an empty string, not "absent", so the start was skipped. This always runs
# `compose up -d --no-deps --no-build worker meilisearch` on the running release (idempotent: an up-to-date running
# container is left alone) and reports the result, with compose's first error line when it fails (no values).
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
DK="sudo -n docker"
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
[ -f $D/docker-compose.release.yml ] || COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
state() { local s; s=$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null); echo "${s:-absent}"; }
echo "## worker-up"
echo "status: workerup services_in_compose=$($COMPOSE config --services 2>/dev/null | tr '\n' ' ')"
echo "status: workerup before worker=$(state nabdah-worker) meilisearch=$(state nabdah-meilisearch) release_images=$($DK inspect -f '{{.Config.Image}}' nabdah-backend 2>/dev/null)"
for s in worker meilisearch; do
  out=$($COMPOSE up -d --no-deps --no-build $s 2>&1); rc=$?
  [ $rc = 0 ] && echo "status: workerup $s up rc=0" || echo "status: workerup $s up rc=$rc err=$(echo "$out" | grep -iE 'error|no such|not found|pull' | head -1 | sed -E 's/(KEY|SECRET|PASS(WORD)?|TOKEN)=[^ ]*/\1=<hidden>/g' | cut -c1-160)"
done
for i in $(seq 1 36); do case "$(state nabdah-worker)" in healthy|running) break;; esac; sleep 5; done
sleep 20
echo "status: workerup after worker=$(state nabdah-worker) image=$($DK inspect -f '{{.Config.Image}}' nabdah-worker 2>/dev/null) meilisearch=$(state nabdah-meilisearch)"
R=$(curl -sk --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/readiness); echo "status: workerup readiness background_worker=$(echo "$R" | grep -oE '"background_worker":"[a-z]+"' | cut -d'"' -f4)"
echo "status: workerup api=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness) disk=$(df -P / | awk 'NR==2{print $5}') mem_available_mb=$(awk '/^MemAvailable:/{print int($2/1024)}' /proc/meminfo)"
