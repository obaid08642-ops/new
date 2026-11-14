#!/bin/bash
# What do users actually get when they upload (prescription photos, chat files, lab results) on the small server? READ-ONLY, one run. Prints `status:` lines only; names, counts and
# minutes, never a value of the environment and never a file name or an owner of a file:
#   - the upload-scan settings by NAME with the word they hold only for the scan mode (UPLOAD_SCAN: unset | required | defer | optional) and "set/unset" for the rest
#     (CLAMAV_ON_DEMAND, CLAMAV_MIN_FREE_MB, CLAMAV_PAUSE), whether the window cron is installed
#   - what the running API tells the apps: /config features.uploads_enabled and features.uploads_pending_scan
#   - the scan queue: files waiting / scanning / infected / failed in storage_objects and media_assets, and the age in minutes of the oldest waiting one
#   - the scanner: container state, health, restarts; the window's own log by counts of what it did in the last 24 h
#   - memory: MemAvailable now, swap, and the use of every container (the numbers a decision about the scanner needs)
# Nothing is written, nothing is started or stopped.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
CRON_DIR=${OPS_CRON_DIR:-/etc/cron.d}
LOGF=${OPS_BACKUP_LOG:-/var/log/nabd-backups.log}
DK="sudo -n docker"
H_API='Host: api.nabd.plus'
echo "## uploads-state"
say() { echo "status: uploads-state: $*"; }
envval() { sudo -n grep -m1 "^$1=" "$ENVF" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"; }
word() { local v; v=$(envval "$1"); case "$v" in "") echo unset;; *) echo set;; esac; }

SCAN=$(envval UPLOAD_SCAN); case "$SCAN" in required|defer|optional) ;; "") SCAN=unset;; *) SCAN=set;; esac
say "UPLOAD_SCAN=$SCAN (unset behaves as required in production) CLAMAV_ON_DEMAND=$(word CLAMAV_ON_DEMAND) CLAMAV_MIN_FREE_MB=$(word CLAMAV_MIN_FREE_MB) CLAMAV_PAUSE=$(word CLAMAV_PAUSE)"
say "window cron installed: $(sudo -n grep -l 'clamav-window.sh' "$CRON_DIR"/* 2>/dev/null | wc -l) file(s); window script on the server: $(sudo -n test -x "$D/scripts/clamav-window.sh" && echo yes || echo no)"

CFG=$(curl -sk --max-time 10 -H "$H_API" "https://127.0.0.1/api/v1/config" 2>/dev/null)
say "what the apps are told (/config features): uploads_enabled=$(echo "$CFG" | jq -r '.features.uploads_enabled // .data.features.uploads_enabled // "unknown"' 2>/dev/null) uploads_pending_scan=$(echo "$CFG" | jq -r '.features.uploads_pending_scan // .data.features.uploads_pending_scan // "unknown"' 2>/dev/null)"

mongo_eval() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tail -1 | tr -d '\r'; }
Q="const d=db.getSiblingDB(process.env.DB_NAME||'nabd_nestjs'); const out={}; for (const c of ['storage_objects','media_assets']) { const r={}; for (const s of ['pending_scan','scanning','infected','failed','clean']) r[s]=d[c].countDocuments({scan_status:s}); const o=d[c].find({scan_status:{\$in:['pending_scan','scanning']}},{createdAt:1}).sort({createdAt:1}).limit(1).toArray()[0]; r.oldest_waiting_min=o&&o.createdAt?Math.round((Date.now()-new Date(o.createdAt).getTime())/60000):0; out[c]=r }; print(JSON.stringify(out))"
QUEUE=$(mongo_eval "$Q")
for c in storage_objects media_assets; do
  say "scan queue $c: $(echo "$QUEUE" | jq -r --arg c "$c" '.[$c] | to_entries | map("\(.key)=\(.value)") | join(" ")' 2>/dev/null || echo unreadable)"
done

say "scanner: state=$($DK inspect -f '{{.State.Status}}' nabdah-clamav 2>/dev/null) health=$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' nabdah-clamav 2>/dev/null) restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-clamav 2>/dev/null) limit_bytes=$($DK inspect -f '{{.HostConfig.Memory}}' nabdah-clamav 2>/dev/null)"
if sudo -n test -r "$LOGF"; then
  L=$(sudo -n grep 'clamav-window:' "$LOGF" 2>/dev/null | tail -2000)
  say "window log (last 2000 lines): started=$(echo "$L" | grep -c 'starting nabdah-clamav') waited_for_memory=$(echo "$L" | grep -c 'files stay in quarantine') stopped_idle=$(echo "$L" | grep -c 'stopping nabdah-clamav'); lowest free MB it saw: $(echo "$L" | sed -n 's/.*only \([0-9]*\) MB free.*/\1/p' | sort -n | head -1)"
else
  say "window log: not readable ($LOGF)"
fi

say "memory: MemAvailable=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo)MB swap_total=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)MB swap_used=$(awk '/SwapTotal/ {t=$2} /SwapFree/ {f=$2} END {print int((t-f)/1024)}' /proc/meminfo)MB"
say "containers (use now): $($DK stats --no-stream --format '{{.Name}}={{.MemUsage}}' 2>/dev/null | sed 's/nabdah-//; s/ \/ [0-9.]*[A-Za-z]*//' | tr '\n' ' ' | cut -c1-700)"
say "done (read-only)"
