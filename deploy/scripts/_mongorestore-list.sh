#!/bin/bash
# Sourced, not run. Lists what a mongodump archive holds WITHOUT restoring it: `mongorestore --dryRun --verbose` in a one-off container against the live mongod, the archive on stdin.
# Same container rules as _mongodump-oneoff.sh (600m, no swap, oom_score_adj 1000, --user 0:0 and --entrypoint because the image entrypoint drops mongo* commands to uid 999, the password in
# a mode-600 file, never argv or output). Prints `status: mongorestore: archive lists N namespace(s)`; returns 0 only when N >= 1. Nothing is written to any database.
#   needs: MONGO_ROOT_USER, MONGO_ROOT_PASSWORD; optional MONGO_CONTAINER (nabdah-mongodb), MONGODUMP_DOCKER (docker; "sudo -n docker" in the ops tasks)
#   mongorestore_list_oneoff <archive_file>
mongorestore_list_oneoff() {
  local archive=$1
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net ip cfg="" out rc=0 n auth=()
  img=$($dkr inspect -f '{{.Config.Image}}' "$ctr" 2>/dev/null)
  net=$($dkr inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$ctr" 2>/dev/null | awk '{print $1}')
  ip=$([ -n "$net" ] && $dkr inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" "$ctr" 2>/dev/null)
  if [ -z "$img" ] || [ -z "$net" ] || [ -z "$ip" ]; then echo "status: mongorestore: ABORT cannot read the image, network or address of $ctr"; return 1; fi
  out=$(mktemp) && chmod 600 "$out" || { echo "status: mongorestore: ABORT no temp file"; return 1; }
  if [ -n "${MONGO_ROOT_USER:-}" ]; then
    cfg=$(mktemp) && chmod 600 "$cfg" || { echo "status: mongorestore: ABORT no temp file"; rm -f "$out"; return 1; }
    printf "password: '%s'\n" "${MONGO_ROOT_PASSWORD//\'/\'\'}" > "$cfg"
    auth=(-v "$cfg:/cfg/mongorestore.yml:ro")
  fi
  $dkr run --rm -i --user 0:0 --network "$net" --memory 600m --memory-swap 600m --oom-score-adj 1000 "${auth[@]}" --entrypoint mongorestore "$img" \
      --dryRun --verbose ${cfg:+--config=/cfg/mongorestore.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin} --host="$ip" --port=27017 --archive --gzip < "$archive" > "$out" 2>&1 || rc=$?
  n=$(grep -c 'reading metadata for' "$out")
  echo "status: mongorestore: archive lists $n namespace(s) (dry run, rc=$rc)"
  if [ "$rc" -ne 0 ] || [ "$n" -lt 1 ]; then
    local msg; msg=$(tail -n 2 "$out" | tr '\n' ' '); [ -n "${MONGO_ROOT_PASSWORD:-}" ] && msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}
    echo "status: mongorestore: error: ${msg:0:250}"; rm -f "$cfg" "$out"; return 1
  fi
  rm -f "$cfg" "$out"
  return 0
}
