#!/bin/bash
# Sourced, not run. mongodump in a ONE-OFF container of the same mongo image on mongod's own network, NOT inside nabdah-mongodb (2026-10-30: that container is
# capped at 1200m with no swap and mongod already uses most of it, so a full gzip dump inside it was OOM-killed and left 0 bytes).
# The tool gets its own cap (600m, no swap) and the highest oom_score_adj: if the host runs short, the dump is what dies, never mongod.
# The password never reaches argv or output: it goes to the container in a mode-600 file (mongodump --config).
#   needs: MONGO_ROOT_USER, MONGO_ROOT_PASSWORD; optional MONGO_CONTAINER (nabdah-mongodb), MONGODUMP_DOCKER (docker; "sudo -n docker" in the ops tasks)
#   mongodump_oneoff <out_file> <mongodump args: the output form and the scope, e.g. --gzip --archive --db=x, or --db=local --collection=oplog.rs --query=... --out ->
#   writes mongodump's stdout to <out_file> (mode 600); returns 0 only when mongodump exited 0 AND the file is not empty (MONGODUMP_ALLOW_EMPTY=1: an empty file is fine, an oplog slice with no entries). Prints `status:` rc lines, never a secret.
mongodump_oneoff() {
  local out=$1; shift
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net cfg err rc sz msg
  img=$($dkr inspect -f '{{.Config.Image}}' "$ctr" 2>/dev/null)
  net=$($dkr inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$ctr" 2>/dev/null | awk '{print $1}')
  if [ -z "$img" ] || [ -z "$net" ] || [ -z "${MONGO_ROOT_USER:-}" ]; then echo "status: mongodump: ABORT cannot read the image/network of $ctr or the root user"; return 1; fi
  cfg=$(mktemp) && err=$(mktemp) || { echo "status: mongodump: ABORT no temp file"; return 1; }
  chmod 600 "$cfg" "$err"
  printf "password: '%s'\n" "${MONGO_ROOT_PASSWORD//\'/\'\'}" > "$cfg"
  ( umask 077; $dkr run --rm -i --network "$net" --memory 600m --memory-swap 600m --oom-score-adj 1000 -v "$cfg:/cfg/mongodump.yml:ro" "$img" \
      mongodump --quiet --config=/cfg/mongodump.yml --host="$ctr" --port=27017 --username="$MONGO_ROOT_USER" --authenticationDatabase=admin "$@" > "$out" 2> "$err" )
  rc=$?
  sz=$(stat -c %s "$out" 2>/dev/null || echo 0)
  echo "status: mongodump: one-off container ($img on $net, 600m, no swap, oom_score_adj 1000) rc=$rc size_bytes=$sz"
  if [ "$rc" -ne 0 ] || { [ "$sz" -le 0 ] && [ -z "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then
    msg=$(tail -n 2 "$err" | tr '\n' ' '); msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}; echo "status: mongodump: error: ${msg:0:250}"
    rm -f "$cfg" "$err"; return 1
  fi
  rm -f "$cfg" "$err"; chmod 600 "$out" 2>/dev/null
  return 0
}
