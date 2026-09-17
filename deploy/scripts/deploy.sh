#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Nabdah Plus — MASTER PRODUCTION DEPLOY
# Run from /opt/nabdah/deploy on the server. Idempotent.
# Steps: secrets → env → IPs → build → up → indexes → certs → health
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."
DEPLOY_DIR=$(pwd)
exec > >(tee -a /var/log/nabdah-deploy.log) 2>&1

echo "═══ [1/7] Secrets & environment ═══"
ENV_FILE="$DEPLOY_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "Generating .env.production with fresh secrets…"
  cp .env.production.example "$ENV_FILE"
  gen() { openssl rand -hex 24; }
  sed -i "s|__MONGO_ROOT_PASSWORD__|$(gen)|"          "$ENV_FILE"
  sed -i "s|__REDIS_PASSWORD__|$(gen)|"               "$ENV_FILE"
  sed -i "s|__JWT_SECRET__|$(gen)$(gen)|"             "$ENV_FILE"
  sed -i "s|__COTURN_SECRET__|$(gen)|"                "$ENV_FILE"
  sed -i "s|__LIVEKIT_API_KEY__|nabd_$(openssl rand -hex 6)|" "$ENV_FILE"
  sed -i "s|__LIVEKIT_API_SECRET__|$(gen)$(gen)|"     "$ENV_FILE"
  # VAPID keys for Web Push
  VAPID=$(docker run --rm node:20-alpine npx --yes web-push generate-vapid-keys --json 2>/dev/null || true)
  if [ -n "$VAPID" ]; then
    PUB=$(echo "$VAPID" | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)
    PRV=$(echo "$VAPID" | grep -o '"privateKey":"[^"]*"' | cut -d'"' -f4)
    sed -i "s|__VAPID_PUBLIC__|$PUB|" "$ENV_FILE"
    sed -i "s|__VAPID_PRIVATE__|$PRV|" "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
  echo "⚠️  Edit $ENV_FILE to fill third-party keys (Firebase/Resend/R2/…), then re-run."
fi
set -a; source "$ENV_FILE"; set +a

echo "═══ [2/7] Inject public IP + bootstrap certs + payment placeholders ═══"
EXTERNAL_IP=$(curl -fsSL https://ifconfig.me || curl -fsSL https://api.ipify.org)
echo "Public IP: $EXTERNAL_IP"
sed -i "s|external-ip=.*|external-ip=$EXTERNAL_IP|" coturn/turnserver.conf
sed -i "s|^static-auth-secret=.*|static-auth-secret=$COTURN_SECRET|" coturn/turnserver.conf
sed -i "s|node_ip: .*|node_ip: $EXTERNAL_IP|" livekit/livekit.yaml
sed -i "s|^  ${LIVEKIT_API_KEY}:.*|  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}|" livekit/livekit.yaml
# Ensure the key line exists even after placeholder state
grep -q "$LIVEKIT_API_KEY" livekit/livekit.yaml || sed -i "s|^keys:.*|keys:\n  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}|" livekit/livekit.yaml

# Bootstrap self-signed TURN cert until Let's Encrypt issues the real one
mkdir -p certs/turn/turn.nabd.plus
if [ ! -f certs/turn/turn.nabd.plus/fullchain.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout certs/turn/turn.nabd.plus/privkey.pem \
    -out certs/turn/turn.nabd.plus/fullchain.pem \
    -subj "/CN=turn.nabd.plus" 2>/dev/null
  echo "bootstrap self-signed TURN cert created (30 days, replaced by Let's Encrypt later)"
fi

# Payment gateway placeholders — the backend refuses to boot without at least
# one configured gateway; payments stay INERT until real keys are filled.
for kv in "MOYASAR_API_KEY=pending_real_key" "MOYASAR_SECRET=pending_real_key" "MOYASAR_PUBLISHABLE_KEY=pending_real_key"; do
  k="${kv%%=*}"
  grep -q "^$k=.\+" "$ENV_FILE" || sed -i "s|^$k=.*|$k=pending_real_key|" "$ENV_FILE"
done

echo "═══ [3/7] Build images ═══"
docker compose --env-file .env.production -f docker-compose.production.yml build --pull

echo "═══ [4/7] Start stack ═══"
docker compose --env-file .env.production -f docker-compose.production.yml up -d
echo "Waiting for databases…"
sleep 15

echo "═══ [5/7] MongoDB indexes ═══"
docker cp mongo/init-indexes.js nabdah-mongodb:/tmp/init-indexes.js
docker exec nabdah-mongodb mongosh --quiet \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  "${DB_NAME:-nabd_nestjs}" /tmp/init-indexes.js

echo "═══ [6/7] TLS certificates (Let's Encrypt) ═══"
bash scripts/issue-certs.sh || echo "⚠️ Cert issuance deferred (DNS not pointing here yet?) — re-run scripts/issue-certs.sh later"

echo "═══ [7/7] Health verification ═══"
bash scripts/health-check.sh

echo "✅ DEPLOY COMPLETE — see report above."
