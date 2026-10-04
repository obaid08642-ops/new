#!/bin/bash
# Next boot error after CLUSTER_MODE: "Optional module @mongodb-js/zstd not found" — something asks
# the Mongo driver for zstd compression, which the image does not ship. Find which setting asks for
# it (dist code + env names), drop "zstd" from that setting only (keep snappy/zlib), recreate,
# reload nginx, verify. Prints names, never values.
set +e
D=/opt/nabdah/deploy
DK="sudo -n docker"
IMG=ad589b9f26e6
echo "## fix-zstd"
echo "-- code references"
$DK run --rm --entrypoint sh $IMG -c "grep -rnE 'zstd|compressors' dist 2>/dev/null | grep -v '\.map:' | cut -c1-260 | head -15"
echo "-- env names whose value mentions zstd/compressors"
HITS=$(sudo -n grep -nE 'zstd|compressors' $D/.env.production | cut -d= -f1 | cut -d: -f2)
echo "deploy: env vars mentioning zstd: ${HITS:-none}"
echo "deploy: compose mentions zstd: $(grep -c zstd $D/docker-compose.production.yml)"
if [ -n "$HITS" ]; then
  sudo -n cp -p $D/.env.production /opt/nabdah/backups/env.production.pre-zstd.$(date -u +%Y%m%dT%H%M%SZ)
  for v in $HITS; do
    # remove zstd from comma lists (compressors=zstd,snappy,zlib -> snappy,zlib) or a bare value
    sudo -n sed -i -E "/^$v=/{s/zstd,//g; s/,zstd//g; s/(compressors=)zstd(&|$)/\1zlib\2/g; s/^($v=)zstd$/\1zlib/}" $D/.env.production
  done
  echo "deploy: zstd removed from: $HITS (remaining mentions: $(sudo -n grep -c zstd $D/.env.production))"
  cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1
fi
for i in $(seq 1 48); do h=$($DK inspect -f '{{.State.Health.Status}}' nabdah-backend 2>/dev/null); [ "$h" = healthy ] && break; sleep 5; done
echo "deploy: backend health=$h restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-backend)"
$DK exec nabdah-nginx nginx -s reload && echo "deploy: nginx reloaded"; sleep 3
echo "deploy: liveness via nginx -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)"
echo "-- last boot errors"
$DK logs --since 2m nabdah-backend 2>&1 | grep -E 'Error|failed|Nest application successfully started|listening' | sort | uniq -c | tail -8 | cut -c1-220
echo "## fix-zstd done"
