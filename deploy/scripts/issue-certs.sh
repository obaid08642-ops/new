#!/bin/bash
# ═══ Issue Let's Encrypt certs for all nabd.plus subdomains (webroot) ═══
set -uo pipefail
cd "$(dirname "$0")/.."

EMAIL="${CERTBOT_EMAIL:-admin@nabd.plus}"
DOMAINS="api.nabd.plus admin.nabd.plus provider.nabd.plus live.nabd.plus turn.nabd.plus"

mkdir -p certs/webroot certs/live

for d in $DOMAINS; do
  if [ -f "certs/live/$d/fullchain.pem" ]; then
    echo "  ✔ $d — already issued"
    continue
  fi
  echo "  issuing $d …"
  docker run --rm \
    -v "$(pwd)/certs/live:/etc/letsencrypt" \
    -v "$(pwd)/certs/webroot:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    --email "$EMAIL" --agree-tos --no-eff-email --non-interactive \
    -d "$d" || echo "  ⚠️ $d FAILED (DNS not pointing here yet?)"
done

# Coturn reads its own copy (replace bootstrap self-signed with real LE certs)
mkdir -p certs/turn/turn.nabd.plus
if [ -f "certs/live/turn.nabd.plus/fullchain.pem" ]; then
  cp certs/live/turn.nabd.plus/fullchain.pem certs/turn/turn.nabd.plus/
  cp certs/live/turn.nabd.plus/privkey.pem   certs/turn/turn.nabd.plus/
fi

# Swap nginx from HTTP bootstrap to full SSL config (once api cert exists)
if [ -f "certs/live/api.nabd.plus/fullchain.pem" ] && [ -f "nginx/conf.d/nabd.plus.conf.ssl" ]; then
  cp nginx/conf.d/nabd.plus.conf.ssl nginx/conf.d/nabd.plus.conf
  rm nginx/conf.d/00-bootstrap.conf 2>/dev/null || true
  echo "nginx switched to SSL config"
fi

# Reload nginx with fresh certs (if running)
docker exec nabdah-nginx nginx -s reload 2>/dev/null || docker restart nabdah-nginx 2>/dev/null || true
docker restart nabdah-coturn 2>/dev/null || true
echo "✅ Certificate pass complete."
