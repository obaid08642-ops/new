#!/bin/bash
# ops-detach: waits up to 5 min for mongod and 3 min for readiness (longer than the 420 s non-detached limit).
# MongoDB after the disk-full crash (review session, 2026-10-16). 8.7 GB are free now; mongodb stays "unhealthy"
# after `compose up --no-recreate`, and the backend gives 502 after its restart. This task:
#   1. prints the container state and the last mongod log lines (credentials dropped)
#   2. starts the container if it is not running (same container, same volume) and waits up to 5 minutes
#   3. prints the log again, then restarts backend + worker once and checks readiness
# Never removes the container, its volume or any database file; never runs a repair. Public lines start with "recover:".
set +e
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}; ENVF=$D/.env.production; DK="sudo -n docker"
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
[ -f $D/docker-compose.release.yml ] || COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
M=nabdah-mongodb; H_API='Host: api.nabd.plus'
redact() { grep -viE 'password|secret|token|authorization|bearer' | cut -c1-300; }
state() { $DK inspect -f 'status={{.State.Status}} exit={{.State.ExitCode}} restarts={{.RestartCount}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} started={{.State.StartedAt}}' $M 2>/dev/null; }
echo "recover: free on / = $(df -Pm / | awk 'NR==2{print $4}') MB"
echo "recover: mongodb $(state)"
echo "## mongod log (last 60, before)"; $DK logs --tail 60 $M 2>&1 | redact
echo "## last health check output"; $DK inspect -f '{{if .State.Health}}{{range .State.Health.Log}}{{.ExitCode}} {{.Output}}{{end}}{{end}}' $M 2>/dev/null | redact | tail -5
if [ "$($DK inspect -f '{{.State.Running}}' $M 2>/dev/null)" != true ]; then
  echo "recover: starting $M"; $DK start $M >/dev/null 2>&1
fi
for i in $(seq 1 60); do h=$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' $M); [ "$h" = healthy ] && break; sleep 5; done
echo "recover: mongodb after start: $(state)"
echo "## mongod log (last 60, after)"; $DK logs --tail 60 $M 2>&1 | redact
echo "## disk usage of the database volume"; sudo -n du -sh /var/lib/docker/volumes/nabdah-prod_mongo_data/_data 2>/dev/null
if [ "$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' $M)" = healthy ]; then
  $COMPOSE restart backend worker >/dev/null 2>&1
  for i in $(seq 1 36); do R=$(curl -sk --max-time 10 -H "$H_API" https://127.0.0.1/api/v1/health/readiness); echo "$R" | grep -q '"status":"ok"' && break; sleep 5; done
  echo "recover: readiness: $(echo "$R" | head -c 300)"
else
  echo "recover: mongodb not healthy; backend not restarted"
fi
for p in /api/v1/public/products/search?q=x /api/v1/legal/policy/privacy?lang=ar; do
  echo "recover: GET $p -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$H_API" "https://127.0.0.1$p")"
done
