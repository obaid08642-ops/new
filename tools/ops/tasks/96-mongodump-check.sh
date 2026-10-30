#!/bin/bash
# Why were the pre-deploy dumps 0 bytes (runs 55 and 57), and does the one-off dump work? Two runs of the same task.
#   Run 1 (APPLY empty): DIAGNOSIS, read-only. Prints, as `status:` lines: the memory cap, use and OOM flag of nabdah-mongodb (docker's and the cgroup's own oom counters), the kernel's
#                        "Killed process" lines by command name and count (names only, never arguments), MemAvailable and swap, the free room and the sizes of the last pre-deploy /
#                        pre-recreate dumps and nightlies (a 0-byte one is the symptom), the mongo image and network the one-off container would use. Nothing is written.
#   Run 2 (APPLY=yes, set in this file by the reviewer): takes ONE test dump with the new one-off container (the function of deploy/scripts/_mongodump-oneoff.sh, verbatim), prints rc,
#                        size, the last nightly's size and `gzip -t`, and deletes the test dump. Writes nothing else; stops nothing.
# Secret values are never printed or passed as arguments (the container's own environment is used for the credentials; the tool gets the password in a mode-600 file).
set -u
APPLY=""
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
DK="sudo -n docker"
CT=nabdah-mongodb
echo "## mongodump-check"
say() { echo "status: mongodump-check: $*"; }
mem_available_mb() { awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo; }

say "container $CT: state=$($DK inspect -f '{{.State.Status}}' $CT 2>/dev/null) oom_killed=$($DK inspect -f '{{.State.OOMKilled}}' $CT 2>/dev/null) restarts=$($DK inspect -f '{{.RestartCount}}' $CT 2>/dev/null) limit_bytes=$($DK inspect -f '{{.HostConfig.Memory}}' $CT 2>/dev/null) memswap_bytes=$($DK inspect -f '{{.HostConfig.MemorySwap}}' $CT 2>/dev/null)"
say "use now: $($DK stats --no-stream --format '{{.MemUsage}} ({{.MemPerc}})' $CT 2>/dev/null)"
CID=$($DK inspect -f '{{.Id}}' $CT 2>/dev/null)
for f in /sys/fs/cgroup/system.slice/docker-$CID.scope/memory.events /sys/fs/cgroup/memory/docker/$CID/memory.oom_control; do
  sudo -n test -r "$f" && say "cgroup $(basename "$f"): $(sudo -n cat "$f" | tr '\n' ' ' | cut -c1-200)"
done
KILLS=$(sudo -n dmesg 2>/dev/null | grep -i 'killed process' | sed -E 's/.*\(([A-Za-z0-9_.:-]+)\).*/\1/' | sort | uniq -c | sort -rn | head -8 | awk '{printf "%s=%s ", $2, $1}')
say "kernel OOM kills by command (dmesg): ${KILLS:-none visible}"
say "MemAvailable=$(mem_available_mb)MB swap_free_mb=$(awk '/SwapFree/ {print int($2/1024)}' /proc/meminfo) swap_total_mb=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)"
say "backup dir: free_mb=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $4}')"
for pat in 'pre-deploy-*.gz' 'pre-recreate-*.gz' 'nabd_*.gz*'; do
  say "last $pat: $(sudo -n sh -c "ls -t $B/$pat 2>/dev/null | head -4" | while read -r f; do printf '%s=%s ' "$(basename "$f")" "$(sudo -n stat -c %s "$f")"; done)"
done
say "one-off tool would use: image=$($DK inspect -f '{{.Config.Image}}' $CT 2>/dev/null) network=$($DK inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' $CT 2>/dev/null | awk '{print $1}') (600m, no swap, oom_score_adj 1000)"
if [ "$APPLY" != yes ]; then say "dry run only: nothing was written. APPLY would take one test dump in the one-off container and delete it"; exit 0; fi

MONGO_ROOT_USER=$($DK exec $CT printenv MONGO_INITDB_ROOT_USERNAME 2>/dev/null); MONGO_ROOT_PASSWORD=$($DK exec $CT printenv MONGO_INITDB_ROOT_PASSWORD 2>/dev/null)
MONGODUMP_DOCKER="$DK"; MONGO_CONTAINER=$CT
mongodump_oneoff() {
  local out=$1; shift
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net ip cfg="" err rc sz msg auth=()
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
  rc=0
  ( umask 077; $dkr run --rm -i --user 0:0 --network "$net" --memory 600m --memory-swap 600m --oom-score-adj 1000 "${auth[@]}" "$img" \
      mongodump --quiet ${cfg:+--config=/cfg/mongodump.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin} --host="$ip" --port=27017 "$@" > "$out" 2> "$err" ) || rc=$?
  sz=$(stat -c %s "$out" 2>/dev/null || echo 0)   # (no `set -e` surprises: a failing dump must reach the report below)
  echo "status: mongodump: one-off container ($img on $net, 600m, no swap, oom_score_adj 1000) rc=$rc size_bytes=$sz"
  if [ "$rc" -ne 0 ] || { [ "$sz" -le 0 ] && [ -z "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then
    msg=$(tail -n 2 "$err" | tr '\n' ' '); [ -n "${MONGO_ROOT_PASSWORD:-}" ] && msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}; echo "status: mongodump: error: ${msg:0:250}"
    rm -f "$cfg" "$err"; return 1
  fi
  rm -f "$cfg" "$err"; chmod 600 "$out" 2>/dev/null
  return 0
}

T=$(mktemp)
mongodump_oneoff "$T" --gzip --archive; RC=$?
SZ=$(stat -c %s "$T" 2>/dev/null || echo 0)
LAST=$(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | head -1"); LASTSZ=$([ -n "$LAST" ] && sudo -n stat -c %s "$LAST" || echo 0)
gzip -t "$T" 2>/dev/null && GZ=ok || GZ=invalid
rm -f "$T"
say "test dump: rc=$RC size_bytes=$SZ last_nightly_bytes=$LASTSZ gzip=$GZ MemAvailable_after=$(mem_available_mb)MB"
[ $RC -eq 0 ] && [ "$SZ" -gt 1048576 ] && [ "$SZ" -ge $((LASTSZ / 2)) ] && [ "$GZ" = ok ] && { say "OK: the one-off dump works (the test dump was deleted)"; exit 0; }
say "FAIL: the one-off dump did not produce a valid archive of the expected size (see the lines above)"; exit 1
