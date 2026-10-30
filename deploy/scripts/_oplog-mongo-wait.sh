#!/bin/bash
# Mongo's state for the oplog slice job (sourced by oplog-backup.sh; tested by test_oplog_mongo_wait.py).
# A kernel OOM kill or a health failure restarts the mongodb container; it then needs minutes to recover (journal replay, election) and a slice
# taken meanwhile fails for a reason that heals itself. So a failed slice waits until Mongo is healthy again, tries once more, and only a failure
# after that is a real one. The mail says whether Mongo restarted since the last good slice, which tells the owner the cause at once.
# Needs MONGO_CONTAINER and BACKUP_DIR.

# "<status> <health> <restart count> <started at>", e.g. "running healthy 4 2026-10-30T00:40:11.1Z"
mongo_inspect() {
  docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.RestartCount}} {{.State.StartedAt}}' "$MONGO_CONTAINER" 2>/dev/null
}

mongo_healthy() {
  local s h _rest
  read -r s h _rest <<<"$(mongo_inspect)"
  [ "$s" = running ] && { [ "$h" = healthy ] || [ "$h" = none ]; }
}

# wait_mongo_healthy <seconds>: 0 as soon as Mongo is running and healthy, 1 when it is not by then
wait_mongo_healthy() {
  local deadline=$(( $(date +%s) + ${1:-0} ))
  while :; do
    mongo_healthy && return 0
    [ "$(date +%s)" -ge "$deadline" ] && return 1
    sleep "${OPLOG_POLL:-5}"
  done
}

MONGO_MARK="${BACKUP_DIR:-/tmp}/oplog.mongo"

# remember the container's restart count and start time at the moment of a good slice
mongo_mark() {
  local s h rc started
  read -r s h rc started <<<"$(mongo_inspect)"
  [ -n "${rc:-}" ] && echo "$rc $started" > "$MONGO_MARK"
  return 0
}

# one sentence for the failure mail: did Mongo restart since the last good slice?
mongo_restart_note() {
  local s h rc started prc pstarted
  read -r s h rc started <<<"$(mongo_inspect)"
  if [ -z "${rc:-}" ]; then echo "Mongo's state could not be read"; return; fi
  if ! read -r prc pstarted < "$MONGO_MARK" 2>/dev/null || [ -z "${pstarted:-}" ]; then
    echo "Mongo is $s/$h (restart count $rc, running since $started); there is no earlier good slice to compare with"; return
  fi
  if [ "$rc" != "$prc" ] || [ "$started" != "$pstarted" ]; then
    echo "Mongo RESTARTED since the last good slice (restart count $prc -> $rc, running since $started, now $s/$h)"
  else
    echo "Mongo did NOT restart since the last good slice (running since $started, $s/$h)"
  fi
}
