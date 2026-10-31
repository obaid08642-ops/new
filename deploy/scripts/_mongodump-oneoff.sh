#!/bin/bash
# Sourced, not run. mongodump in a ONE-OFF container of the same mongo image on mongod's own network, NOT inside nabdah-mongodb (2026-10-30: that container is
# capped at 1200m with no swap and mongod already uses most of it, so a full gzip dump inside it was OOM-killed and left 0 bytes).
# The tool gets its own cap (600m, no swap) and the highest oom_score_adj: if the host runs short, the dump is what dies, never mongod.
# The password never reaches argv or output: it goes to the container in a mode-600 file (mongodump --config). The container runs as root (--user 0:0): the file belongs to the
# host user and the mongo image's default user (uid 999) cannot open it (run 58: "open /cfg/mongodump.yml: permission denied"); the container has no other mount and no published port.
# --user 0:0 alone is NOT enough (CI found it): the image's docker-entrypoint.sh drops every command that starts with "mongo" to the mongodb user, so mongodump is started directly
# with --entrypoint.
#   needs: MONGO_ROOT_USER, MONGO_ROOT_PASSWORD (empty user = no credentials, for a test database); optional MONGO_CONTAINER (nabdah-mongodb), MONGODUMP_DOCKER (docker; "sudo -n docker" in the ops tasks)
#   mongodump_oneoff <out_file> <mongodump args: the output form and the scope, e.g. --gzip --archive --db=x, or --db=local --collection=oplog.rs --query=... --out ->
#   writes mongodump's stdout to <out_file> (mode 600); returns 0 only when mongodump exited 0 AND the file is not empty (MONGODUMP_ALLOW_EMPTY=1: an empty file is fine, an oplog slice with no entries). Prints `status:` rc lines, never a secret.
mongodump_oneoff() {
  local out=$1; shift
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net ip cfg="" err rc sz msg auth=() attempt avail cap name state ec oom
  img=$($dkr inspect -f '{{.Config.Image}}' "$ctr" 2>/dev/null)
  net=$($dkr inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$ctr" 2>/dev/null | awk '{print $1}')
  ip=$([ -n "$net" ] && $dkr inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" "$ctr" 2>/dev/null)
  if [ -z "$img" ] || [ -z "$net" ] || [ -z "$ip" ]; then echo "status: mongodump: ABORT cannot read the image, network or address of $ctr"; return 1; fi
  err=$(mktemp) || { echo "status: mongodump: ABORT no temp file"; return 1; }
  chmod 600 "$err"
  if [ -n "${MONGO_ROOT_USER:-}" ]; then   # production always has the root user; a test database without one is dumped without credentials
    cfg=$(mktemp) && chmod 600 "$cfg" || { echo "status: mongodump: ABORT no temp file"; rm -f "$err"; return 1; }
    printf "password: '%s'\n" "${MONGO_ROOT_PASSWORD//\'/\'\'}" > "$cfg"
    auth=(-v "$cfg:/cfg/mongodump.yml:ro")
  fi
  # Run 61 (2026-10-30): "rc=1 size_bytes=300688232" with an EMPTY error: the container was killed (no stderr to read). So: no --rm, the container is inspected for its real
  # exit code and OOMKilled before it is removed; one collection at a time (--numParallelCollections=1: the least memory); the cap follows MemAvailable (600m at most, 350m at least,
  # MemAvailable minus 250 MB between); one retry, with the cap read again. Only exit 0 AND a non-empty file is a success.
  for attempt in 1 2; do
    avail=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo 2>/dev/null); avail=${avail:-0}
    cap=600; [ "$avail" -gt 0 ] && cap=$((avail - 250)); [ "$cap" -gt 600 ] && cap=600; [ "$cap" -lt 350 ] && cap=350
    name="nabd-dump-$$-$attempt"; rc=0; : > "$err"
    ( umask 077; $dkr run --name "$name" --user 0:0 --network "$net" --memory "${cap}m" --memory-swap "${cap}m" --oom-score-adj 1000 "${auth[@]}" --entrypoint mongodump "$img" \
        --quiet --numParallelCollections=1 ${cfg:+--config=/cfg/mongodump.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin} --host="$ip" --port=27017 "$@" > "$out" 2> "$err" ) || rc=$?
    state=$($dkr inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' "$name" 2>/dev/null); ec=${state% *}; oom=${state#* }
    $dkr rm -f "$name" >/dev/null 2>&1 || true
    [ -n "$ec" ] && [ "$ec" != 0 ] && [ "$rc" = 0 ] && rc=$ec
    sz=$(stat -c %s "$out" 2>/dev/null || echo 0)   # (no `set -e` surprises: a failing dump must reach the report below)
    echo "status: mongodump: attempt $attempt: one-off container ($img on $net, cap ${cap}m of MemAvailable ${avail}m, no swap, oom_score_adj 1000, 1 collection at a time) rc=$rc exit_code=${ec:-?} oom_killed=${oom:-?} size_bytes=$sz"
    if [ "$rc" -eq 0 ] && { [ "$sz" -gt 0 ] || [ -n "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then break; fi
    msg=$(tail -n 5 "$err" | tr '\n' ' '); [ -n "${MONGO_ROOT_PASSWORD:-}" ] && msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}
    [ -z "${msg// /}" ] && msg="no error text (exit $rc${oom:+, OOMKilled=$oom}; 137 means the container was killed, usually for memory)"
    echo "status: mongodump: attempt $attempt error: ${msg:0:400}"
    [ "$attempt" = 1 ] && sleep "${MONGODUMP_RETRY_WAIT:-5}"
  done
  rm -f "$cfg" "$err"
  if [ "$rc" -ne 0 ] || { [ "$sz" -le 0 ] && [ -z "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then return 1; fi
  chmod 600 "$out" 2>/dev/null
  return 0
}
