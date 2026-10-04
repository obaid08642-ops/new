#!/bin/bash
# Restore api.nabd.plus.
# 1) nginx.conf itself defines an upstream on nabdah-staging-backend:8003; with that container
#    stopped every `nginx -t`/reload fails, so nginx keeps the old backend IP (502). Mark that
#    upstream server `down` (valid syntax, staging is disabled anyway), test, reload.
# 2) The backend crash-loops with the current .env.production (edited 2026-09-30). The stopped
#    staging container still carries the env it was created with on 2026-09-16, when the same build
#    ran fine. Copy over ONLY the variables that exist there but are missing from .env.production
#    (single-line values; PORT/DB_NAME/MONGO_URL/REDIS_*/NODE_ENV excluded, compose sets those).
#    Values are copied on the server and never printed. Backups first.
set +e
D=/opt/nabdah/deploy
B=/opt/nabdah/backups
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
NGX="$DK exec nabdah-nginx"
echo "## restore-api"

# --- 1) nginx
sudo -n cp -p $D/nginx/nginx.conf $B/nginx.conf.pre-restore.$TS
grep -n 'nabdah-staging-backend' $D/nginx/nginx.conf | sed 's/^/deploy: nginx.conf staging ref line /'
TMP=$(mktemp); sed -E 's#^(\s*)server\s+nabdah-staging-backend:8003([^;]*);#\1server 127.0.0.1:9 down; # staging disabled 2026-10-04#' $D/nginx/nginx.conf > $TMP
sudo -n sh -c "cat $TMP > $D/nginx/nginx.conf"; rm -f $TMP
if $NGX nginx -t 2>&1 | tail -1 | grep -q successful; then $NGX nginx -s reload && echo "deploy: nginx reloaded with the fixed config"
else echo "deploy: nginx -t still fails:"; $NGX nginx -t 2>&1 | tail -2; fi

# --- 2) env: what did the working 2026-09-16 container have that the file lacks?
sudo -n cp -p $D/.env.production $B/env.production.pre-restore.$TS
$DK inspect nabdah-staging-backend --format '{{json .Config.Env}}' > /tmp/stg_env.json 2>/dev/null
sudo -n python3 - "$D/.env.production" /tmp/stg_env.json <<'PY'
import json, sys, re
envf, stg = sys.argv[1], sys.argv[2]
try:
    cont = json.load(open(stg))
except Exception as e:
    print("deploy: cannot read staging container env:", e); sys.exit(0)
c = {}
for kv in cont:
    k, _, v = kv.partition('=')
    c[k] = v
fnames = set(m.group(1) for m in re.finditer(r'^([A-Z_][A-Z0-9_]*)=', open(envf).read(), re.M))
skip = {'PORT','DB_NAME','MONGO_URL','REDIS_URL','REDIS_HOST','REDIS_PORT','REDIS_PASSWORD','NODE_ENV','PATH','HOSTNAME','HOME','NODE_VERSION','YARN_VERSION'}
missing = sorted(k for k in c if k not in fnames and k not in skip)
print("deploy: vars in the working container but not in .env.production:", ' '.join(missing) or 'none')
added = []
with open(envf, 'a') as f:
    f.write('\n# Ops 2026-10-04: restored from the 2026-09-16 container env\n')
    for k in missing:
        v = c[k]
        if '\n' in v: continue
        f.write(f'{k}={v}\n'); added.append(k)
print("deploy: added:", ' '.join(added) or 'none')
diff = sorted(k for k in c if k in fnames and k not in skip)
fv = {}
for line in open(envf):
    m = re.match(r'^([A-Z_][A-Z0-9_]*)=(.*)$', line.rstrip('\n'))
    if m: fv[m.group(1)] = m.group(2).strip().strip('"').strip("'")
print("deploy: same name, different value (names only):", ' '.join(k for k in diff if fv.get(k) != c[k] and '\n' not in c[k]) or 'none')
PY
rm -f /tmp/stg_env.json

echo "-- app.module compressors context"
$DK run --rm --entrypoint sh ad589b9f26e6 -c "sed -n '185,200p' dist/app.module.js" | cut -c1-200

cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1
h=""; for i in $(seq 1 48); do h=$($DK inspect -f '{{.State.Health.Status}}' nabdah-backend 2>/dev/null); [ "$h" = healthy ] && break; sleep 5; done
echo "deploy: backend health=$h restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-backend)"
$NGX nginx -t >/dev/null 2>&1 && $NGX nginx -s reload && echo "deploy: nginx reloaded"
sleep 3
echo "deploy: liveness via nginx -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)"
echo "-- backend log tail (no route mapping lines)"
$DK logs --tail 120 nabdah-backend 2>&1 | grep -v 'Mapped {' | grep -v MONGOOSE | grep -v 'own risk' | tail -30 | sed -E 's#(://)[^:@/ ]+:[^@/ ]+@#\1***:***@#g' | cut -c1-260
echo "## restore-api done"
