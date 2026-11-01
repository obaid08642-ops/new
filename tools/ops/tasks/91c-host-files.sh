#!/bin/bash
# Host files of the memory budget (#2137) that the deploy task (60-deploy-main.sh) does NOT write: it installs only the compose files and the nginx
# files, so these never reach the server by themselves:
#   deploy/mongo/mongod.conf  deploy/redis/redis.conf  deploy/scripts/oplog-backup.sh  deploy/scripts/_oplog-mongo-wait.sh  deploy/scripts/memory-report.sh
#   and, since run 77, the scripts the window cron and the nightly backup run and source: clamav-window.sh _backup-common.sh backup.sh _dump-guard.sh _mongodump-oneoff.sh _mongorestore-list.sh
# Two runs of the same task, plus a rollback:
#   Run 1 (APPLY empty): DRY RUN. Prints, as `status:` lines, which of the files differ from the uploaded release (name and sha8 only, never a
#                        file's content), what redis has now against what redis.conf says, and which release it compared with. Nothing is written.
#   Run 2 (APPLY=yes, set in this file by the reviewer): APPLY. Order:
#     0. pre-checks: the newest uploaded release dir ($REL_ROOT/<sha8>/) holds deploy.tgz + SHA256SUMS and `sha256sum -c` passes; the five files are in it
#     1. every file that differs is copied to $B (hostfiles-pre-<name>-<ts>; a file that was missing leaves a hostfiles-new-<name> marker), then installed
#     2. redis: `CONFIG SET maxmemory` to the value in the installed redis.conf (no restart, no eviction-policy change); the live value is read back
#     3. mongod.conf is only written to disk. mongod reads it at start, so it takes effect at the NEXT recreate of nabdah-mongodb. Nothing restarts mongod here
#     4. deploy/scripts/memory-report.sh runs and its `status:` lines are printed (it never fails)
#     5. any failure in 1-2: the copies are put back (and redis gets its old conf value back), exit 1
#   ROLLBACK=yes (set in this file): puts back the newest copy of each file this task saved, removes the files it installed new, resets redis maxmemory
#   from the restored redis.conf (if there is none, the value of the redis.conf on disk).
# The redis password is read from .env.production and handed to redis-cli on stdin; it is never an argument, never printed.
set -u
APPLY=""
ROLLBACK=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
REL_ROOT=${OPS_RELEASE_DIR:-/opt/nabdah/releases}
ENVF=$D/.env.production
RC=${REDIS_CONTAINER:-nabdah-redis}
# path under the release's deploy/ dir (= under $D on the server)
# scripts/clamav-window.sh + _backup-common.sh (the window cron), backup.sh + _dump-guard.sh (the nightly dump and its size guard), _mongodump-oneoff.sh + _mongorestore-list.sh (what both source):
# the deploy task writes none of them, so the server kept the copies of whenever they were last installed by hand (run 77: the window script on the server differs from the release).
# backup.sh and _dump-guard.sh MUST travel together: a backup.sh that sources a _dump-guard.sh the server lacks would treat every dump as suspect.
FILES="mongo/mongod.conf redis/redis.conf scripts/oplog-backup.sh scripts/_oplog-mongo-wait.sh scripts/memory-report.sh scripts/clamav-window.sh scripts/_backup-common.sh scripts/backup.sh scripts/_dump-guard.sh scripts/_mongodump-oneoff.sh scripts/_mongorestore-list.sh"
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
echo "## host-files"

say() { echo "status: host-files: $*"; }
flat() { echo "$1" | tr / _; }
sha8() { sudo -n sha256sum "$1" 2>/dev/null | cut -c1-8; }
mode_of() { case "$1" in scripts/*) echo 755;; *) echo 644;; esac; }
# 1G / 320mb / 512k to bytes (what redis prints for CONFIG GET)
to_bytes() {
  local v=${1,,}
  case "$v" in
    *gb) echo $(( ${v%gb} * 1073741824 ));; *mb) echo $(( ${v%mb} * 1048576 ));; *kb) echo $(( ${v%kb} * 1024 ));; *g) echo $(( ${v%g} * 1073741824 ));;
    *m) echo $(( ${v%m} * 1048576 ));; *k) echo $(( ${v%k} * 1024 ));; *[!0-9]*|'') echo "";; *) echo "$v";;
  esac
}
conf_maxmemory() { sudo -n awk '$1=="maxmemory"{v=$2} END{print v}' "$1" 2>/dev/null; }
redis_password() { sudo -n sed -n 's/^REDIS_PASSWORD=//p' "$ENVF" 2>/dev/null | tail -1 | tr -d "\"'"; }
# the password goes in on stdin; the script inside the container reads it into REDISCLI_AUTH
redis_get() { redis_password | $DK exec -i "$RC" sh -c 'read -r REDISCLI_AUTH; export REDISCLI_AUTH; redis-cli config get maxmemory | tail -1' 2>/dev/null | tr -d '\r'; }
redis_set() { redis_password | $DK exec -i "$RC" sh -c "read -r REDISCLI_AUTH; export REDISCLI_AUTH; redis-cli config set maxmemory $1" >/dev/null 2>&1; }
redis_matches() { # $1 = value as written in a conf; true when redis already holds it
  local want live; want=$(to_bytes "$1"); live=$(redis_get)
  [ -n "$want" ] && [ "$live" = "$want" ]
}

# --- the release: newest dir with a checksummed deploy.tgz; staged and compared, never trusted unchecked
STAGE=""; REL_USED=""
stage_release() {
  local r d
  for d in $(sudo -n ls -1t "$REL_ROOT" 2>/dev/null); do
    sudo -n test -f "$REL_ROOT/$d/deploy.tgz" && sudo -n test -f "$REL_ROOT/$d/SHA256SUMS" && { r="$REL_ROOT/$d"; break; }
  done
  [ -n "${r:-}" ] || return 1
  sudo -n sh -c "cd '$r' && sha256sum -c --quiet SHA256SUMS" >/dev/null 2>&1 || return 2
  STAGE=$(sudo -n mktemp -d) || return 3
  sudo -n tar -xzf "$r/deploy.tgz" -C "$STAGE" $(for f in $FILES; do printf 'deploy/%s ' "$f"; done) 2>/dev/null || return 3
  for f in $FILES; do sudo -n test -s "$STAGE/deploy/$f" || return 3; done
  REL_USED=$(basename "$r")
}
cleanup() { [ -n "$STAGE" ] && sudo -n rm -rf "$STAGE"; STAGE=""; }

# --- ROLLBACK mode
if [ "$ROLLBACK" = yes ]; then
  FOUND=""
  for f in $FILES; do
    n=$(flat "$f")
    SAVED=$(sudo -n sh -c "ls -1t $B/hostfiles-pre-$n-* 2>/dev/null" | head -1)
    if [ -n "$SAVED" ]; then
      sudo -n install -m "$(mode_of "$f")" "$SAVED" "$D/$f" && say "$f restored from $(basename "$SAVED")" && FOUND=1
    elif [ -f "$B/hostfiles-new-$n" ]; then
      sudo -n rm -f "$D/$f" "$B/hostfiles-new-$n" && say "$f (installed new by this task) removed" && FOUND=1
    fi
  done
  [ -n "$FOUND" ] || { say "ABORT nothing saved by this task in $B"; exit 1; }
  W=$(conf_maxmemory "$D/redis/redis.conf")
  if [ -n "$W" ] && [ -n "$(to_bytes "$W")" ]; then
    if redis_set "$W" && redis_matches "$W"; then say "redis maxmemory back to $W (live, no restart)"; else say "ROLLBACK INCOMPLETE - redis maxmemory could not be set to $W; the file is restored"; exit 1; fi
  else
    say "redis.conf has no maxmemory line: redis left as it is"
  fi
  say "rolled back (mongod.conf, if it was restored, is read at the next recreate of nabdah-mongodb)"
  exit 0
fi

# --- 0. pre-checks
stage_release; SRC=$?
case $SRC in
  0) ;;
  1) say "ABORT no uploaded release ($REL_ROOT/<sha8>/deploy.tgz + SHA256SUMS) found"; exit 1;;
  2) say "ABORT the uploaded release fails its checksums: nothing was installed"; exit 1;;
  *) say "ABORT the uploaded release does not hold all of: $FILES"; exit 1;;
esac
DIFF=""
for f in $FILES; do
  new=$(sha8 "$STAGE/deploy/$f")
  if sudo -n test -f "$D/$f"; then
    old=$(sha8 "$D/$f")
    if [ "$new" = "$old" ]; then say "$f same (release $REL_USED, sha $new)"; else say "$f DIFFERS (server $old, release $new)"; DIFF="$DIFF $f"; fi
  else
    say "$f MISSING on the server (release $new)"; DIFF="$DIFF $f"
  fi
done
WANT=$(conf_maxmemory "$STAGE/deploy/redis/redis.conf")
LIVE=$(redis_get)
say "redis maxmemory: live=${LIVE:-unknown} bytes, release redis.conf says ${WANT:-nothing} ($(to_bytes "${WANT:-}") bytes)"
if [ -n "$DIFF" ]; then say "release $REL_USED checked against its checksums; differing:$DIFF"; else say "release $REL_USED checked against its checksums; nothing differs"; fi
if [ "$APPLY" != yes ]; then
  cleanup
  say "dry run only: nothing was written. To apply, set APPLY=yes in this task"
  exit 0
fi

# --- 1. copies, then install
sudo -n mkdir -p "$B" || { say "ABORT cannot create $B"; cleanup; exit 1; }
restore() {
  say "FAILED at '$1', putting the copies back"
  for f in $FILES; do
    n=$(flat "$f")
    if [ -f "$B/hostfiles-new-$n" ] && [ -z "$(sudo -n sh -c "ls $B/hostfiles-pre-$n-$TS 2>/dev/null")" ]; then sudo -n rm -f "$D/$f" "$B/hostfiles-new-$n"
    elif sudo -n test -f "$B/hostfiles-pre-$n-$TS"; then sudo -n install -m "$(mode_of "$f")" "$B/hostfiles-pre-$n-$TS" "$D/$f"; fi
  done
  OLDW=$(conf_maxmemory "$D/redis/redis.conf")
  [ -n "$OLDW" ] && redis_set "$OLDW"
  cleanup
  exit 1
}
for f in $DIFF; do
  n=$(flat "$f")
  if sudo -n test -f "$D/$f"; then sudo -n cp -p "$D/$f" "$B/hostfiles-pre-$n-$TS" || { say "ABORT cannot save the old $f"; cleanup; exit 1; }
  else sudo -n touch "$B/hostfiles-new-$n"; fi
done
for f in $DIFF; do
  sudo -n mkdir -p "$(dirname "$D/$f")"
  sudo -n install -m "$(mode_of "$f")" "$STAGE/deploy/$f" "$D/$f" || restore "install $f"
  say "$f installed from release $REL_USED (old copy saved in $B)"
done
cleanup
[ -z "$DIFF" ] && say "nothing to install"

# --- 2. redis: reload the one setting, no restart
W=$(conf_maxmemory "$D/redis/redis.conf")
if [ -z "$W" ] || [ -z "$(to_bytes "$W")" ]; then
  say "redis.conf has no usable maxmemory line: redis left as it is"
elif redis_matches "$W"; then
  say "redis maxmemory already $W (live)"
else
  redis_set "$W" || restore "redis CONFIG SET maxmemory"
  redis_matches "$W" || restore "redis maxmemory did not read back as $W"
  say "redis maxmemory set to $W (live, no restart; the value is also in redis.conf for the next start)"
fi

# --- 3. mongod.conf
case " $DIFF " in
  *" mongo/mongod.conf "*) say "mongod.conf written to disk only: mongod reads it at its next start, so it applies at the next recreate of nabdah-mongodb (nothing was restarted)";;
  *) say "mongod.conf unchanged";;
esac

# --- 4. the memory report
MEMREPORT_DOCKER="$DK" bash "$D/scripts/memory-report.sh" 2>&1 | grep '^status:' || say "memory-report printed no status lines"
say "applied"
exit 0
