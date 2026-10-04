#!/bin/bash
# 1) URGENT: 94 wrote an EMPTY nginx.conf (sed delimiter clash). nginx still runs on the config in
#    memory. Restore the file from the backup taken seconds before, verify it, then apply the
#    staging-upstream change safely (output checked before writing), nginx -t, reload.
# 2) The backend dies in the Mongo driver: the build hard-codes compressors [zstd, snappy, zlib] and
#    the zstd module is not in the image. Let mongod offer zlib only (built into Node), so the
#    driver never picks zstd. Backup mongod.conf, edit, restart mongo, wait, then the backend.
set +e
D=/opt/nabdah/deploy
B=/opt/nabdah/backups
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
NGX="$DK exec nabdah-nginx"
echo "## restore-nginx"
BK=$(ls -t $B/nginx.conf.pre-restore.* 2>/dev/null | head -1)
echo "deploy: backup=$(basename "$BK") lines=$(wc -l < "$BK") has_events=$(grep -c '^events' "$BK")"
if [ -s "$BK" ] && grep -q '^events' "$BK"; then
  sudo -n sh -c "cat '$BK' > $D/nginx/nginx.conf"
  echo "deploy: nginx.conf restored: lines=$(wc -l < $D/nginx/nginx.conf)"
else
  echo "deploy: ABORT backup unusable"; exit 1
fi
TMP=$(mktemp)
sed -E 's|^([[:space:]]*)server[[:space:]]+nabdah-staging-backend:8003[^;]*;|\1server 127.0.0.1:9 down;|' $D/nginx/nginx.conf > $TMP
if [ -s $TMP ] && grep -q '^events' $TMP && [ $(wc -l < $TMP) = $(wc -l < $D/nginx/nginx.conf) ]; then
  sudo -n sh -c "cat $TMP > $D/nginx/nginx.conf"; echo "deploy: staging upstream marked down: $(grep -c '127.0.0.1:9 down' $D/nginx/nginx.conf)"
fi
rm -f $TMP
if $NGX nginx -t 2>&1 | grep -q successful; then $NGX nginx -s reload && echo "deploy: nginx -t ok, reloaded"
else echo "deploy: nginx -t fails, restoring the original file:"; $NGX nginx -t 2>&1 | tail -2; sudo -n sh -c "cat '$BK' > $D/nginx/nginx.conf"; fi

echo "## mongo-compression"
MC=$D/mongo/mongod.conf
sudo -n cp -p $MC $B/mongod.conf.pre-zlib.$TS
echo "-- mongod.conf (no secrets in this file)"; sudo -n cat $MC
sudo -n python3 - $MC <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
if re.search(r'^\s+compressors:', s, re.M):
    s = re.sub(r'^(\s+compressors:).*$', r'\1 zlib', s, flags=re.M)
elif re.search(r'^net:\s*$', s, re.M):
    s = re.sub(r'^net:\s*$', 'net:\n  compression:\n    compressors: zlib', s, count=1, flags=re.M)
else:
    s += '\nnet:\n  compression:\n    compressors: zlib\n'
open(p, 'w').write(s)
print("deploy: mongod.conf compressors set to zlib")
PY
echo "-- mongod.conf after"; sudo -n grep -nA2 'compression' $MC
$DK restart nabdah-mongodb >/dev/null
m=""; for i in $(seq 1 36); do m=$($DK inspect -f '{{.State.Health.Status}}' nabdah-mongodb); [ "$m" = healthy ] && break; sleep 5; done
echo "deploy: mongodb health=$m"
if [ "$m" != healthy ]; then
  echo "deploy: mongo not healthy, restoring mongod.conf"; sudo -n cp -p $B/mongod.conf.pre-zlib.$TS $MC; $DK restart nabdah-mongodb >/dev/null; sleep 30
  echo "deploy: mongodb health after restore=$($DK inspect -f '{{.State.Health.Status}}' nabdah-mongodb)"
fi
$DK restart nabdah-backend >/dev/null
h=""; for i in $(seq 1 48); do h=$($DK inspect -f '{{.State.Health.Status}}' nabdah-backend); [ "$h" = healthy ] && break; sleep 5; done
echo "deploy: backend health=$h"
$NGX nginx -t 2>&1 | grep -q successful && $NGX nginx -s reload && echo "deploy: nginx reloaded"
sleep 3
echo "deploy: liveness via nginx -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)"
echo "deploy: site via nginx -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: nabd.plus' https://127.0.0.1/)"
echo "-- backend errors"; $DK logs --since 4m nabdah-backend 2>&1 | grep -E 'Error|successfully started|listening' | sort | uniq -c | tail -6 | cut -c1-220
echo "## done"
