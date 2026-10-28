#!/bin/bash
# Uploads on the small server (#2029): UPLOAD_SCAN=defer. An upload that finds no scanner is accepted into quarantine (never served) and released
# after a scan; ClamAV runs only in short windows (deploy/scripts/clamav-window.sh, every 2 minutes, only while files wait and the memory is there).
# Two runs of the same task, plus a rollback:
#   Run 1 (APPLY empty): DRY RUN. Prints, as `status:` lines, what is set (names and "set/unset/defer" only, never a value), whether the window cron is
#                        installed, whether the running backend carries the quarantine code, and what /config says now. Nothing is written.
#   Run 2 (APPLY=yes, set in this file by the reviewer): APPLY. Order:
#     0. pre-checks: backend healthy, the image carries the quarantine worker, the window script is on the server, the env file is readable
#     1. a copy of .env.production (mode 600) in $B, then UPLOAD_SCAN=defer and CLAMAV_ON_DEMAND=1 (the second one switches the window script on)
#        written by NAME; no other line is touched and no value is printed
#     2. the window cron (/etc/cron.d/nabd-clamav-window, one line) unless some file in /etc/cron.d already runs clamav-window.sh
#     3. the backend ONLY is recreated (same image, nothing else restarted), then /config must say features.uploads_enabled=true
#     4. any failure: the env copy is put back, the cron file this run created is removed, the backend is recreated on the same image, exit 1
#   The window script and the helper it sources (deploy/scripts/clamav-window.sh, _backup-common.sh) are NOT written by the deploy task (it writes the
#   compose and nginx files only). This task installs them itself from the uploaded release (REL/deploy.tgz, after `sha256sum -c SHA256SUMS`), only
#   when the server's copy is missing or differs; the old copy is saved in $B first. The dry run says which would be installed.
#   ROLLBACK=yes (set in this file): restores the newest env copy this task saved, removes the cron file this task installed, recreates the backend.
# Not touched: the ClamAV container (a `docker compose up -d` of the deploy script starts it again; with CLAMAV_ON_DEMAND=1 the window stops it when idle).
# The clients must handle the "being checked" state (423 file_pending_scan, features.uploads_pending_scan) before this is applied.
set -u
APPLY="yes"
ROLLBACK=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
CRON_DIR=${OPS_CRON_DIR:-/etc/cron.d}
ENVF=$D/.env.production
CT=${BACKEND_CONTAINER:-nabdah-backend}
CRON_FILE=$CRON_DIR/nabd-clamav-window
REL_ROOT=${OPS_RELEASE_DIR:-/opt/nabdah/releases}
WINDOW_FILES="clamav-window.sh _backup-common.sh"
CRON_LINE="*/2 * * * * root $D/scripts/clamav-window.sh >> /var/log/nabd-backups.log 2>&1"
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
echo "## upload-scan-defer"

say() { echo "status: upload-scan-defer: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "${OPS_WAIT_TRIES:-48}"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 health=$s"; return 1; }
# the state of one env variable, by name: unset | set | defer (a value is never printed, except the word defer)
envstate() {
  local v; v=$(sudo -n sed -n "s/^$1=//p" "$ENVF" 2>/dev/null | tail -1 | tr -d "\"'")
  if [ -z "$v" ]; then echo unset; elif [ "$v" = defer ]; then echo defer; elif [ "$v" = 1 ]; then echo on; else echo set; fi
}
cron_present() { sudo -n grep -qs 'clamav-window\.sh' "$CRON_DIR"/* 2>/dev/null; }
config_once() { curl -sk --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/config 2>/dev/null | grep -Eq '"uploads_enabled" ?: ?true'; }
config_uploads_enabled() { for i in $(seq 1 "${OPS_WAIT_TRIES_API:-12}"); do config_once && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; return 1; }
recreate_backend() { $COMPOSE up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1 && wait_healthy "$CT"; }


# --- the window script from the release: newest release dir with a checksummed deploy.tgz; its files are staged and compared, never trusted unchecked
STAGE=""
stage_window_files() {
  local r d
  for d in $(sudo -n ls -1t "$REL_ROOT" 2>/dev/null); do
    sudo -n test -f "$REL_ROOT/$d/deploy.tgz" && sudo -n test -f "$REL_ROOT/$d/SHA256SUMS" && { r="$REL_ROOT/$d"; break; }
  done
  [ -n "${r:-}" ] || return 1
  sudo -n sh -c "cd '$r' && sha256sum -c --quiet SHA256SUMS" >/dev/null 2>&1 || return 2
  STAGE=$(sudo -n mktemp -d) || return 3
  sudo -n tar -xzf "$r/deploy.tgz" -C "$STAGE" $(for f in $WINDOW_FILES; do printf 'deploy/scripts/%s ' "$f"; done) 2>/dev/null || return 3
  for f in $WINDOW_FILES; do sudo -n test -s "$STAGE/deploy/scripts/$f" || return 3; done
  REL_USED=$(basename "$r")
}
window_differs() { local f; for f in $WINDOW_FILES; do sudo -n cmp -s "$STAGE/deploy/scripts/$f" "$D/scripts/$f" || return 0; done; return 1; }
window_ok_on_server() { local f; for f in $WINDOW_FILES; do sudo -n test -f "$D/scripts/$f" || return 1; done; sudo -n test -x "$D/scripts/clamav-window.sh"; }

# --- ROLLBACK mode
if [ "$ROLLBACK" = yes ]; then
  LAST=$(sudo -n sh -c "ls -1t $B/env-pre-upload-scan-* 2>/dev/null" | head -1)
  [ -n "$LAST" ] || { say "ABORT no env copy saved by this task in $B"; exit 1; }
  RUNIMG=$($DK inspect -f '{{.Image}}' "$CT" 2>/dev/null)
  sudo -n sh -c "cat '$LAST' > '$ENVF'" || { say "ABORT cannot restore the env copy"; exit 1; }
  [ -f "$CRON_FILE" ] && sudo -n rm -f "$CRON_FILE" && say "cron file removed"
  for f in $WINDOW_FILES; do
    SAVED=$(sudo -n sh -c "ls -1t $B/window-pre-$f-* 2>/dev/null" | head -1)
    [ -n "$SAVED" ] && sudo -n cp -p "$SAVED" "$D/scripts/$f" && say "$f restored from $(basename "$SAVED")"
    [ -f "$B/window-new-$f" ] && sudo -n rm -f "$D/scripts/$f" "$B/window-new-$f" && say "$f (installed by this task) removed"
  done
  [ -n "$RUNIMG" ] && $DK tag "$RUNIMG" nabdah-prod-backend:latest
  recreate_backend || { say "ROLLBACK INCOMPLETE - the backend is not healthy, needs attention (env copy: $(basename "$LAST"))"; exit 1; }
  say "rolled back: env restored from $(basename "$LAST"), backend recreated and healthy; UPLOAD_SCAN is now $(envstate UPLOAD_SCAN)"
  exit 0
fi

# --- 0. pre-checks
STATE=$(health "$CT")
[ "$STATE" = healthy ] || { say "ABORT $CT is not healthy ($STATE)"; exit 1; }
sudo -n test -r "$ENVF" || { say "ABORT $ENVF is not readable"; exit 1; }
$DK exec "$CT" test -f dist/modules/storage/pending-scan.service.js || { say "ABORT the running image has no quarantine worker (PR #2029): deploy the release first"; exit 1; }
stage_window_files; SRC=$?
if [ $SRC -ne 0 ] && ! window_ok_on_server; then
  case $SRC in
    1) say "ABORT the window script is not on the server and no uploaded release ($REL_ROOT/<sha>/deploy.tgz) holds it";;
    2) say "ABORT the uploaded release fails its checksums: nothing was installed";;
    *) say "ABORT the uploaded release has no usable window script";;
  esac
  exit 1
fi
if [ $SRC -eq 0 ] && window_differs; then WINDOW_INSTALL=1; say "window script: will be installed from release $REL_USED (checksums ok): $(for f in $WINDOW_FILES; do sudo -n test -f "$D/scripts/$f" && echo "$f differs" || echo "$f missing"; done | tr '\n' ' ')"
else WINDOW_INSTALL=""; say "window script: already on the server${REL_USED:+ and equal to release $REL_USED}"; fi
say "pre-checks ok: backend healthy, quarantine worker in the image"
say "now: UPLOAD_SCAN=$(envstate UPLOAD_SCAN) CLAMAV_ON_DEMAND=$(envstate CLAMAV_ON_DEMAND) window cron $(cron_present && echo installed || echo missing)"
if config_once; then say "/config now: uploads_enabled=true"; else say "/config now: uploads_enabled=false"; fi
if [ "$APPLY" != yes ]; then
  [ -n "$STAGE" ] && sudo -n rm -rf "$STAGE"
  say "dry run only: nothing was written. To apply, set APPLY=yes in this task (the clients must show the \"being checked\" state first)"
  exit 0
fi

# --- 0b. the window script and its helper, from the verified release (old copies saved first)
if [ -n "$WINDOW_INSTALL" ]; then
  sudo -n mkdir -p "$B" "$D/scripts"
  for f in $WINDOW_FILES; do
    if sudo -n test -f "$D/scripts/$f"; then sudo -n cp -p "$D/scripts/$f" "$B/window-pre-$f-$TS" || { say "ABORT cannot save the old $f"; exit 1; }
    else sudo -n touch "$B/window-new-$f"; fi
    sudo -n install -m 755 "$STAGE/deploy/scripts/$f" "$D/scripts/$f" || { say "ABORT cannot install $f"; exit 1; }
  done
  say "window script installed from release $REL_USED (old copies, if any, saved in $B)"
fi
[ -n "$STAGE" ] && sudo -n rm -rf "$STAGE"
sudo -n test -x "$D/scripts/clamav-window.sh" || { say "ABORT $D/scripts/clamav-window.sh is not executable after the install"; exit 1; }

# --- 1. env copy, then the two names
RUNIMG=$($DK inspect -f '{{.Image}}' "$CT")
$DK tag "$RUNIMG" nabdah-prod-backend:latest && $DK tag "$RUNIMG" nabdah-prod-backend:prev-$TS
sudo -n mkdir -p "$B" && SAVE=$(sudo -n mktemp "$B/env-pre-upload-scan-$TS-XXXX") && sudo -n cp -p "$ENVF" "$SAVE" && sudo -n chmod 600 "$SAVE" \
  || { say "ABORT cannot save a copy of the env file"; exit 1; }
say "env copy saved ($(basename "$SAVE"), mode 600)"
CRON_MADE=""
restore() {
  say "FAILED at '$1', rolling back"
  sudo -n sh -c "cat '$SAVE' > '$ENVF'"
  [ -n "$CRON_MADE" ] && sudo -n rm -f "$CRON_FILE"
  $DK tag "$RUNIMG" nabdah-prod-backend:latest
  if recreate_backend; then say "rollback complete: env restored, backend healthy on the same image"; else say "ROLLBACK INCOMPLETE - the backend is not healthy, needs attention (env copy: $(basename "$SAVE"))"; fi
  exit 1
}
CHANGED=$(sudo -n python3 - "$ENVF" <<'PY'
import os, sys
path = sys.argv[1]
want = {"UPLOAD_SCAN": "defer", "CLAMAV_ON_DEMAND": "1"}
lines = open(path, encoding="utf-8").read().splitlines()
def get(name):
    for l in lines:
        if l.startswith(name + "="):
            return l.split("=", 1)[1].strip().strip('"').strip("'")
    return None
changed = []
for k, v in want.items():
    if get(k) == v:
        continue
    lines = [l for l in lines if not l.startswith(k + "=")]
    lines.append(f"{k}={v}")
    changed.append(k)
if changed:
    tmp = path + ".tmp"
    st = os.stat(path)
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    os.chmod(tmp, st.st_mode & 0o777)
    os.replace(tmp, path)
print(",".join(changed))
PY
) || restore "env write"
[ "$(envstate UPLOAD_SCAN)" = defer ] && [ "$(envstate CLAMAV_ON_DEMAND)" = on ] || restore "env check"
say "env: names changed: ${CHANGED:-none (already set)}"

# --- 2. the window cron
if cron_present; then
  say "window cron already installed, left as it is"
else
  printf '# ClamAV window for UPLOAD_SCAN=defer (tools/ops/tasks/91b-upload-scan-defer.sh): starts ClamAV while uploads wait, stops it when the queue is empty\n%s\n' "$CRON_LINE" | sudo -n tee "$CRON_FILE" >/dev/null \
    && sudo -n chmod 644 "$CRON_FILE" && CRON_MADE=1 || restore "cron install"
  say "window cron installed ($CRON_FILE)"
fi

# --- 3. only the backend, then /config
recreate_backend || restore "backend health"
[ "$($DK inspect -f '{{.Image}}' "$CT")" = "$RUNIMG" ] || restore "backend image changed"
$DK exec "$CT" sh -c '[ "$UPLOAD_SCAN" = defer ]' || restore "the backend does not see UPLOAD_SCAN=defer"
config_uploads_enabled || restore "/config does not say uploads_enabled=true"
say "applied: backend healthy on the same image, UPLOAD_SCAN=defer seen by the backend, /config uploads_enabled=true"
