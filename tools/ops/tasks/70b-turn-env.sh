#!/bin/bash
# Cloudflare Realtime TURN keys in the production env (owner, 2026-10-30), on the model of 70-mail-env. Two runs of the same task. Values are never printed, NAMES only.
#   The keys CF_TURN_KEY_ID and CF_TURN_API_TOKEN (GitHub environment `production` secrets) reach the server only on ssh stdin, as a mode-600 file in $HOME that the workflow
#   leaves; this task reads it and shreds it whatever happens. They are written into .env.production by NAME (copy saved first, mode 600), never to a command line.
#   Run 1 (APPLY empty): DRY RUN. Reads the key file, asks Cloudflare once for a 10-minute credential with it (prints `ok` or `fail` only: no status code, no body, no value), prints which
#                        names would be set and what is already in the env. Writes nothing, restarts nothing.
#   Run 2 (APPLY=yes, set in this file by the reviewer): the same check (aborts on anything but ok: a wrong key is never written), then the names are written into
#                        .env.production, then ONLY the backend is recreated (`up -d --no-deps --force-recreate backend`), waited for healthy and for the API's readiness (200).
#                        If the backend does not come back, the env copy is put back and the backend is recreated again; exit 1.
#   PROVIDER (set in this file): "cloudflare" (the default here, owner 2026-10-31) or "coturn" -> CALLS_TURN_PROVIDER. Empty keeps what the env has (unset = Cloudflare first, our coturn second).
#                        "coturn" drops Cloudflare at once with this task and no deploy (the keys stay in the env).
# The backend reads the new names when its container is created, so the deploy that carries the TURN code must be live before the calls use them.
set -u
APPLY=""
PROVIDER="cloudflare"
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
ENVF=$D/.env.production
CREDS=${OPS_TURN_CREDS:-$HOME/ops-turn.env}
CF_API=${OPS_CF_TURN_API:-https://rtc.live.cloudflare.com/v1/turn/keys}
DK="sudo -n docker"
H_API='Host: api.nabd.plus'
TS=$(date -u +%Y%m%dT%H%M%SZ)
FILES="-f $D/docker-compose.production.yml"
[ -f "$D/docker-compose.release.yml" ] && FILES="$FILES -f $D/docker-compose.release.yml"
COMPOSE="$DK compose $FILES --project-directory $D --env-file $ENVF"
T=$(mktemp); chmod 600 "$T"
trap 'rm -f "$T"; [ -f "$CREDS" ] && { shred -u "$CREDS" 2>/dev/null || rm -f "$CREDS"; }' EXIT
echo "## turn-env"
say() { echo "status: turn-env: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 health=$s"; return 1; }
wait_ready() { local c; for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$H_API" "https://127.0.0.1/api/v1/health/readiness"); [ "$c" = 200 ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "api readiness answered $c, wanted 200"; return 1; }

sudo -n test -f "$ENVF" || { say "ABORT $ENVF missing"; exit 1; }
case "$PROVIDER" in ""|cloudflare|coturn) ;; *) say "ABORT PROVIDER must be cloudflare, coturn or empty"; exit 1;; esac

# ---------------------------------------------------------------- 1. the keys
if [ -f "$CREDS" ]; then
  grep -E '^(CF_TURN_KEY_ID|CF_TURN_API_TOKEN)=[^[:space:]"'"'"'\\$`]+$' "$CREDS" > "$T"
  say "key file found with $(grep -c . "$T") of 2 names"
else
  say "no key file (names already on the server are kept)"
fi
[ -n "$PROVIDER" ] && echo "CALLS_TURN_PROVIDER=$PROVIDER" >> "$T"
envval() { sudo -n grep -m1 "^$1=" "$ENVF" | cut -d= -f2- | tr -d '"'"'"; }
KEYID=$(grep -m1 '^CF_TURN_KEY_ID=' "$T" | cut -d= -f2-); [ -n "$KEYID" ] || KEYID=$(envval CF_TURN_KEY_ID)
TOKEN=$(grep -m1 '^CF_TURN_API_TOKEN=' "$T" | cut -d= -f2-); [ -n "$TOKEN" ] || TOKEN=$(envval CF_TURN_API_TOKEN)
if [ -z "$KEYID" ] || [ -z "$TOKEN" ]; then say "ABORT CF_TURN_KEY_ID or CF_TURN_API_TOKEN is missing (neither in the key file nor in the env)"; exit 1; fi

# the token goes to curl on stdin (--config -), never on a command line
CODE=$(printf 'header = "Authorization: Bearer %s"\n' "$TOKEN" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 --config - -X POST \
  -H 'Content-Type: application/json' -d '{"ttl":600}' "$CF_API/$KEYID/credentials/generate")
say "cloudflare credential request (10-minute credential): $([ "$CODE" = 200 ] && echo ok || echo fail)"
[ "$CODE" = 200 ] || { say "ABORT Cloudflare did not accept the key; the env is unchanged"; exit 1; }
say "names that would be set: $(cut -d= -f1 "$T" | tr '\n' ' ')| already in the env: $(for n in CF_TURN_KEY_ID CF_TURN_API_TOKEN CALLS_TURN_PROVIDER; do [ -n "$(envval $n)" ] && printf '%s ' "$n"; done)"
if [ "$APPLY" != yes ]; then say "dry run only: nothing was written or restarted. APPLY writes the names and recreates only the backend"; exit 0; fi

# ---------------------------------------------------------------- 2. env, by name
sudo -n mkdir -p "$B" && SAVE=$(sudo -n mktemp "$B/env-pre-turn-$TS-XXXX") && sudo -n cp -p "$ENVF" "$SAVE" && sudo -n chmod 600 "$SAVE" \
  || { say "ABORT cannot save $ENVF"; exit 1; }
OUT=$(sudo -n python3 - "$ENVF" "$T" <<'PY'
import os, sys
envf, newf = sys.argv[1], sys.argv[2]
lines = open(envf, encoding="utf-8").read().splitlines()
def get(name):
    for l in lines:
        if l.startswith(name + "="):
            return l.split("=", 1)[1].strip().strip('"').strip("'")
    return None
new = dict(l.split("=", 1) for l in open(newf, encoding="utf-8").read().splitlines() if "=" in l)
changed = []
for k, v in new.items():
    if get(k) == v:
        continue
    lines = [l for l in lines if not l.startswith(k + "=")]
    lines.append(f"{k}={v}")
    changed.append(k)
tmp = envf + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
os.chmod(tmp, 0o600)
os.replace(tmp, envf)
print("names set: " + (" ".join(changed) if changed else "none"))
PY
)
rc=$?
echo "$OUT" | sed 's/^/status: turn-env: env /'
[ $rc = 0 ] || { sudo -n cp -p "$SAVE" "$ENVF"; say "ABORT env unchanged (copy put back)"; exit 1; }
if sudo -n cmp -s "$SAVE" "$ENVF"; then sudo -n rm -f "$SAVE"; say "env already as wanted (no copy kept)"; else say "env copy before the change: $(basename "$SAVE")"; fi

# ---------------------------------------------------------------- 3. only the backend
if $COMPOSE up -d --no-deps --force-recreate backend >/dev/null 2>&1 && wait_healthy nabdah-backend && wait_ready; then
  say "backend recreated: healthy, API ready; calls now use Cloudflare TURN first and our coturn second (CALLS_TURN_PROVIDER=$(envval CALLS_TURN_PROVIDER | grep . || echo unset))"
  exit 0
fi
say "backend did not come back: putting the env copy back and recreating it again"
[ -f "$SAVE" ] || SAVE=""
[ -n "$SAVE" ] && sudo -n cp -p "$SAVE" "$ENVF"
$COMPOSE up -d --no-deps --force-recreate backend >/dev/null 2>&1; wait_healthy nabdah-backend && say "backend healthy again with the old env"
exit 1
