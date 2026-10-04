#!/bin/bash
# Fix the crash loop: dist/main.js enables node cluster mode unless CLUSTER_MODE=false, and its
# cluster import is broken (`cluster.on is not a function`). The container that ran for two weeks
# had been started with cluster mode off; .env.production does not say so. Add CLUSTER_MODE=false
# (also saves RAM on this 2-core server), recreate the backend on the same production image,
# wait for health, reload nginx (new container IP), verify the API through nginx.
set -u
D=/opt/nabdah/deploy
DK="sudo -n docker"
echo "## fix-cluster"
if sudo -n grep -q '^CLUSTER_MODE=' $D/.env.production; then
  sudo -n sed -i 's/^CLUSTER_MODE=.*/CLUSTER_MODE=false/' $D/.env.production
else
  sudo -n sh -c "printf '\n# Ops 2026-10-04: dist/main.js cluster mode crashes (cluster.on is not a function)\nCLUSTER_MODE=false\n' >> $D/.env.production"
fi
echo "deploy: CLUSTER_MODE=false set"
cur=$($DK inspect -f '{{.Image}}' nabdah-backend | cut -c8-19)
echo "deploy: backend image $cur"
cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build --force-recreate backend 2>&1 | tail -2 | sed -E 's/[A-Za-z0-9+\/=]{30,}/***/g'
h=""
for i in $(seq 1 48); do h=$($DK inspect -f '{{.State.Health.Status}}' nabdah-backend 2>/dev/null); [ "$h" = healthy ] && break; sleep 5; done
echo "deploy: backend health=$h restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-backend)"
$DK exec nabdah-nginx nginx -t >/dev/null 2>&1 && $DK exec nabdah-nginx nginx -s reload && echo "deploy: nginx reloaded"
sleep 3
for p in /api/v1/health/liveness /api/v1/health/readiness; do
  echo "deploy: $p via nginx -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1$p)"
done
$DK logs --since 3m nabdah-backend 2>&1 | grep -E 'TypeError|Error:|listening|Nest application successfully started' | tail -5 | cut -c1-200
free -m | awk '/Mem:/{print "deploy: RAM used="$3"MB avail="$7"MB"}'
echo "## fix-cluster done"
