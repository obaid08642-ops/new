#!/bin/bash
# Recovery (2026-10-22). The detached 60-deploy-main of run 39858901688 failed at 'unpack deploy.tgz' (disk full) and
# rolled back to 5556efbd, but its rollback removes nabdah-worker and nabdah-meilisearch (written when the old stack had
# neither) and leaves the unused release images on disk: disk 100%, no worker. This:
#   1. frees disk: the unused release 79a3d84b images and its upload dir, dangling images, build cache > 72 h.
#      Never a volume, never a running image, never a rollback-* tag, never a backup.
#   2. brings worker (and meilisearch) back on the running release (production.yml + release.yml, no build), checked.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
DK="sudo -n docker"
REL=/opt/nabdah/releases
NEWREL=79a3d84b
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
[ -f $D/docker-compose.release.yml ] || COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || echo absent; }
wait_ok() { local s; for i in $(seq 1 "$2"); do s=$(health "$1"); case "$s" in healthy) return 0;; running) [ "$3" = running ] && return 0;; esac; sleep 5; done; return 1; }
disk() { df -P / | awk 'NR==2{print $5" used, "int($4/1048576)" GB free"}'; }
echo "## recover-disk-worker"
echo "status: recover disk_before=$(disk)"
RUNNING=$($DK ps --format '{{.Image}}' | sort -u)
for img in nabdah-prod-backend:$NEWREL nabdah-prod-admin-web:$NEWREL nabdah-patient-web:$NEWREL nabdah-migrations:$NEWREL; do
  $DK image inspect $img >/dev/null 2>&1 || continue
  echo "$RUNNING" | grep -qx "$img" && { echo "status: recover keep $img (running)"; continue; }
  $DK rmi $img >/dev/null 2>&1 && echo "status: recover removed image $img" || echo "status: recover could_not_remove $img"
done
[ -d "$REL/$NEWREL" ] && sudo -n rm -rf "$REL/$NEWREL" && echo "status: recover removed release upload dir $NEWREL"
$DK image prune -f >/dev/null 2>&1
$DK builder prune -f --filter "until=72h" >/dev/null 2>&1
echo "status: recover disk_after_cleanup=$(disk)"

SVC=$($COMPOSE config --services 2>/dev/null)
for s in worker meilisearch; do
  echo "$SVC" | grep -qx $s || { echo "status: recover $s not_in_compose"; continue; }
  if [ "$(health nabdah-$s)" = absent ]; then
    $COMPOSE up -d --no-deps --no-build $s >/dev/null 2>&1 && echo "status: recover $s started" || echo "status: recover $s start_failed"
  fi
done
wait_ok nabdah-worker 48 running && echo "status: recover worker health=$(health nabdah-worker)" || echo "status: recover worker health=FAIL($(health nabdah-worker))"
wait_ok nabdah-meilisearch 24 running && echo "status: recover meilisearch health=$(health nabdah-meilisearch)" || echo "status: recover meilisearch health=$(health nabdah-meilisearch)"
echo "status: recover backend=$(health nabdah-backend) worker_image=$($DK inspect -f '{{.Config.Image}}' nabdah-worker 2>/dev/null | sed 's/.*://')"
R=$(curl -sk --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/readiness); echo "status: recover readiness background_worker=$(echo "$R" | grep -oE '"background_worker":"[a-z]+"' | cut -d'"' -f4)"
c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness); echo "status: recover api=$c disk_final=$(disk)"
