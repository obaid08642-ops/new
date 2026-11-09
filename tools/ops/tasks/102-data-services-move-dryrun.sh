#!/bin/bash
# R7 DRY RUN: moving Redis / Meilisearch to another host (docs/platform/R7-data-tier.md). READ-ONLY: nothing is edited, started, stopped or recreated. It reads docker-compose.production.yml and
# .env.production and answers, per service: is the address in compose a fixed Docker alias (then an env value alone does NOT move it: compose must first read the address from the environment),
# is a value already set in .env.production, what KIND the candidate host is (private | PUBLIC | dns-name | service-name; a public one is refused), and then prints the migration and rollback steps.
# Prints `status:` lines only: names, counts and yes/no, never a password, key or address. The candidate comes from NEW_REDIS_HOST / NEW_MEILI_HOST (set in this file by the reviewer).
set -u
NEW_REDIS_HOST=""
NEW_MEILI_HOST=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
COMPOSE=$D/docker-compose.production.yml
say() { echo "status: data-move-dryrun: $*"; }
echo "## data-services-move-dryrun (nothing is changed)"
[ -r "$COMPOSE" ] || { say "cannot read the compose file: nothing to check"; exit 0; }
[ -r "$ENVF" ] || ENVF=/dev/null
kind() { case "$1" in
  "") echo none;;
  10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*|100.6[4-9].*|100.[7-9][0-9].*|100.1[01][0-9].*|100.12[0-7].*|127.*) echo private;;
  [0-9]*.[0-9]*.[0-9]*.[0-9]*) echo PUBLIC;;
  *.*) echo dns-name;;
  *) echo service-name;;
esac; }
check() { # service varname compose-pattern-fixed new-host
  local svc=$1 var=$2 fixed=$3 new=$4 n e
  n=$(grep -c -E "^\s+$var: $fixed" "$COMPOSE" 2>/dev/null); n=${n:-0}
  e=$(grep -c -E "^$var=" "$ENVF" 2>/dev/null); e=${e:-0}
  if [ "$n" -gt 0 ]; then say "$svc: compose fixes $var to the Docker alias in $n place(s): an env value alone would NOT move it; compose must first read it from the environment (a reviewed change, defaults unchanged)"
  else say "$svc: compose does not fix $var to the alias: the environment can move it"; fi
  say "$svc: $var set in .env.production today: $([ "$e" -gt 0 ] && echo yes || echo no)"
  if [ -n "$new" ]; then
    local k; k=$(kind "$new"); say "$svc: candidate address kind=$k"
    [ "$k" = PUBLIC ] && say "$svc: REFUSE: a public address (no TLS, no ACL on the open internet); use the private link of R7 (WireGuard)"
  fi
}
check redis REDIS_URL 'redis://:\$\{REDIS_PASSWORD\}@redis:6379' "$NEW_REDIS_HOST"
check meilisearch MEILI_URL 'http://meilisearch:7700' "$NEW_MEILI_HOST"
say "migration, Meilisearch first (rebuildable mirror of Mongo, search only): 1 run meilisearch on the standby (private link only) 2 point MEILI_URL at it, recreate backend and worker 3 the worker's boot sync re-sends search_index; search is partial until done 4 stop the local container"
say "migration, Redis (queues and sessions: latency-sensitive, same private network only): 1 run redis on the standby with the same password policy 2 let queues drain or accept the loss of cache 3 point REDIS_URL / REDIS_CACHE_URL, recreate backend, worker, patient-web 4 stop the local container"
say "rollback: put the two values back to the Docker alias (or remove them), recreate the same containers; the local containers were only stopped, not removed, until the new host has run a full day"
