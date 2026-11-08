#!/bin/bash
# Why does the pre-deploy mongodump exit 1 with NO error text (ops run 104: "ABORT backup too small (0 bytes)", twice, OOMKilled=false, while run 103 worked)?
# READ-ONLY diagnosis, one run. It replays the one-off container of deploy/scripts/_mongodump-oneoff.sh in four small steps and shows what each one says, WITHOUT `--quiet`:
#   0 context   disk and inodes (root, docker root, backup dir), memory, load, the state of nabdah-mongodb, kernel kill counts by command name
#   1 binary    `mongodump --version` in the same image on no network: can the one-off container start at all
#   2 network   one tiny collection (admin.system.version) WITHOUT credentials: reachable? mongod's real answer (normally "requires authentication") shows the network path works
#   3 auth      the same collection WITH the credentials (password in a mode-600 file, as in production), `--archive` to /dev/null, no --quiet
#   4 flags     the same as 3 with the production flags (--quiet --numParallelCollections=1 --gzip): if 3 works and 4 does not, the flags are the cause
#   5 full      ONLY with FULL=yes: what 60-deploy-main.sh really runs (`--gzip --archive`, every database) but WITHOUT --quiet, the bytes counted and thrown away, the LAST 8 stderr lines
#               shown (the failing collection, if any). Heavy: it reads the whole database once, the load of a backup. Off by default.
# Nothing is written to disk but three mode-600 temp files (the password file, stderr, and the few bytes of the one tiny collection; all removed at the end); each step's container is removed; no dump is kept; nothing is stopped, restarted or
# changed. The password is never an argument and never printed: every output line has the user and password masked and is cut at 200 characters; at most 8 lines per step.
# The credentials come from the container's own environment, like 96-mongodump-check.sh. The answer is `status:` lines.
set -u
FULL=""   # set to yes IN THIS FILE by the reviewer for step 5 (heavy: a full dump of every database, counted and thrown away; 15 minute limit)
DK="sudo -n docker"
CT=${MONGO_CONTAINER:-nabdah-mongodb}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
say() { echo "status: mongodump-diag: $*"; }
echo "## mongodump-diag (read-only)"

MONGO_ROOT_USER=$($DK exec "$CT" printenv MONGO_INITDB_ROOT_USERNAME 2>/dev/null < /dev/null)
MONGO_ROOT_PASSWORD=$($DK exec "$CT" printenv MONGO_INITDB_ROOT_PASSWORD 2>/dev/null < /dev/null)
mask() { # stdin -> masked, cut, first 8 lines
  local l n=0
  while { IFS= read -r l || [ -n "$l" ]; } && [ "$n" -lt 8 ]; do
    [ -n "${MONGO_ROOT_PASSWORD:-}" ] && l=${l//"$MONGO_ROOT_PASSWORD"/<hidden>}
    [ -n "${MONGO_ROOT_USER:-}" ] && l=${l//"$MONGO_ROOT_USER"/<user>}
    l=$(printf '%s' "$l" | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g')
    say "  | ${l:0:200}"; n=$((n + 1))
  done
}

# 0 context
say "step 0 context"
say "root fs: free_mb=$(df -Pm / 2>/dev/null | awk 'NR==2 {print $4}') inodes_free=$(df -Pi / 2>/dev/null | awk 'NR==2 {print $4}')"
DROOT=$($DK info -f '{{.DockerRootDir}}' 2>/dev/null); DROOT=${DROOT:-/var/lib/docker}
say "docker root: free_mb=$(sudo -n df -Pm "$DROOT" 2>/dev/null | awk 'NR==2 {print $4}') inodes_free=$(sudo -n df -Pi "$DROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
say "backup dir: free_mb=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $4}') inodes_free=$(df -Pi "$B" 2>/dev/null | awk 'NR==2 {print $4}')"
say "memory: MemAvailable=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo)MB swap_free=$(awk '/^SwapFree:/ {print int($2/1024)}' /proc/meminfo)MB load=$(cut -d' ' -f1-3 /proc/loadavg)"
say "$CT: state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null) health=$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CT" 2>/dev/null) restarts=$($DK inspect -f '{{.RestartCount}}' "$CT" 2>/dev/null) started=$($DK inspect -f '{{.State.StartedAt}}' "$CT" 2>/dev/null) oom_killed=$($DK inspect -f '{{.State.OOMKilled}}' "$CT" 2>/dev/null)"
KILLS=$(sudo -n dmesg 2>/dev/null | grep -i 'killed process' | sed -E 's/.*\(([A-Za-z0-9_.:-]+)\).*/\1/' | sort | uniq -c | sort -rn | head -6 | awk '{printf "%s=%s ", $2, $1}')
say "kernel kills by command: ${KILLS:-none visible}"
IMG=$($DK inspect -f '{{.Config.Image}}' "$CT" 2>/dev/null)
NET=$($DK inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$CT" 2>/dev/null | awk '{print $1}')
IP=$([ -n "$NET" ] && $DK inspect -f "{{(index .NetworkSettings.Networks \"$NET\").IPAddress}}" "$CT" 2>/dev/null)
say "one-off would use: image=${IMG:+present} network=${NET:-MISSING} address=${IP:+present}"
if [ -z "$IMG" ] || [ -z "$NET" ] || [ -z "$IP" ]; then say "RESULT: cannot read the image, network or address of $CT: this is the failure the dump step sees; nothing more to run"; exit 0; fi

AVAIL=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo); CAP=600; [ "${AVAIL:-0}" -gt 0 ] && CAP=$((AVAIL - 250)); [ "$CAP" -gt 600 ] && CAP=600; [ "$CAP" -lt 350 ] && CAP=350
ERR=$(mktemp); CFG=$(mktemp); OUT=$(mktemp); chmod 600 "$ERR" "$CFG" "$OUT"
printf "password: '%s'\n" "${MONGO_ROOT_PASSWORD//\'/\'\'}" > "$CFG"

step() { # label network use_cfg -- mongodump args
  local label=$1 net=$2 usecfg=$3 name rc=0 st ec oom bytes; shift 4
  name="nabd-diag-$$-${label%%[^0-9]*}"
  local auth=(); [ "$usecfg" = yes ] && auth=(-v "$CFG:/cfg/mongodump.yml:ro")
  local cred=(); [ "$usecfg" = yes ] && cred=(--config=/cfg/mongodump.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin)
  : > "$ERR"; : > "$OUT"
  $DK run --name "$name" --user 0:0 --network "$net" --memory "${CAP}m" --memory-swap "${CAP}m" --oom-score-adj 1000 "${auth[@]}" --entrypoint mongodump "$IMG" \
      "${cred[@]}" "$@" > "$OUT" 2> "$ERR" || rc=$?
  bytes=$(stat -c %s "$OUT" 2>/dev/null || echo 0)
  st=$($DK inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' "$name" 2>/dev/null); ec=${st% *}; oom=${st#* }
  $DK rm -f "$name" >/dev/null 2>&1 || true
  say "step $label: docker run rc=$rc container_exit=${ec:-?} oom_killed=${oom:-?} stdout_bytes=${bytes:-0} stderr_lines=$(wc -l < "$ERR")"
  mask < "$ERR"
  [ ! -s "$ERR" ] && say "  | (stderr is empty)"
  return 0
}

say "step 1 binary (no network)"
step "1 version" none no -- --version
say "step 2 network, no credentials"
step "2 noauth" "$NET" no -- --host="$IP" --port=27017 --db=admin --collection=system.version --archive
say "step 3 credentials, no --quiet"
step "3 auth" "$NET" yes -- --numParallelCollections=1 --host="$IP" --port=27017 --db=admin --collection=system.version --archive
say "step 4 credentials, the production flags"
step "4 prodflags" "$NET" yes -- --quiet --numParallelCollections=1 --gzip --host="$IP" --port=27017 --db=admin --collection=system.version --archive
if [ "$FULL" = yes ]; then
  say "step 5 full dump (counted, not kept), no --quiet, 15 minute limit"
  : > "$ERR"; rc=0; name="nabd-diag-$$-5"
  nbytes=$( ( timeout 900 $DK run --name "$name" --user 0:0 --network "$NET" --memory "${CAP}m" --memory-swap "${CAP}m" --oom-score-adj 1000 -v "$CFG:/cfg/mongodump.yml:ro" --entrypoint mongodump "$IMG" \
      --numParallelCollections=1 --config=/cfg/mongodump.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin --host="$IP" --port=27017 --gzip --archive 2> "$ERR" | wc -c ) 2>/dev/null )
  st=$($DK inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' "$name" 2>/dev/null); ec=${st% *}; oom=${st#* }
  $DK rm -f "$name" >/dev/null 2>&1 || true
  say "step 5 full: container_exit=${ec:-?} oom_killed=${oom:-?} gzip_archive_bytes=${nbytes:-0} stderr_lines=$(wc -l < "$ERR")"
  tail -n 8 "$ERR" > "$OUT"; mask < "$OUT"
fi
rm -f "$CFG" "$ERR" "$OUT"
say "READ: step1 fails -> the container cannot start (image/cap/docker); step2 prints no error -> network or mongod; step3 fails with text -> that text is the cause; step3 ok and step4 fails -> the flags"
