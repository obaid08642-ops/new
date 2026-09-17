#!/bin/bash
# ═══ Nabdah Plus — full production health battery ═══
cd "$(dirname "$0")/.." 2>/dev/null || true
set -a; [ -f .env.production ] && source .env.production; set +a
PASS=0; FAIL=0
chk() { # name, command
  if eval "$2" >/dev/null 2>&1; then PASS=$((PASS+1)); echo "  ✅ $1";
  else FAIL=$((FAIL+1)); echo "  ❌ $1"; fi
}

echo "═══ Docker containers ═══"
docker compose --env-file .env.production -f docker-compose.production.yml ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null || docker ps

echo ""
echo "═══ Service health ═══"
chk "MongoDB ping"        "docker exec nabdah-mongodb mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1"
chk "Redis ping"          "docker exec nabdah-redis redis-cli --no-auth-warning -a \"$REDIS_PASSWORD\" ping | grep -q PONG"
chk "Backend liveness"    "docker exec nabdah-backend wget -qO- http://127.0.0.1:8002/api/v1/health/liveness"
chk "Backend readiness"   "docker exec nabdah-backend wget -qO- http://127.0.0.1:8002/api/v1/health/readiness"
chk "FastAPI docs"        "docker exec nabdah-fastapi wget -qO- http://127.0.0.1:8001/docs"
chk "Admin web"           "docker exec nabdah-admin-web wget -qO- http://127.0.0.1:3000/"
chk "LiveKit port"        "docker exec nabdah-livekit wget -qO- http://127.0.0.1:7880/"
chk "Coturn STUN port"    "docker exec nabdah-coturn sh -c 'nc -z 127.0.0.1 3478' || nc -z localhost 3478"
chk "Nginx healthz"       "curl -fsS http://127.0.0.1/healthz | grep -q ok"

echo ""
echo "═══ Public endpoints (requires DNS) ═══"
chk "HTTPS api liveness"   "curl -fsS --max-time 10 https://api.nabd.plus/api/v1/health/liveness"
chk "HTTPS api versioned"  "curl -fsS --max-time 10 https://api.nabd.plus/api/v1/medicines?limit=1"
chk "Admin dashboard"      "curl -fsS --max-time 10 https://admin.nabd.plus/ -o /dev/null"
chk "Provider landing"     "curl -fsS --max-time 10 https://provider.nabd.plus/ -o /dev/null"
chk "LiveKit wss page"     "curl -fsS --max-time 10 https://live.nabd.plus/ -o /dev/null || curl -s --max-time 10 -o /dev/null -w '%{http_code}' https://live.nabd.plus/ | grep -qE '200|404|426'"

echo ""
echo "═══ SSL status ═══"
for d in api.nabd.plus admin.nabd.plus provider.nabd.plus live.nabd.plus turn.nabd.plus; do
  if [ -f "certs/live/$d/fullchain.pem" ]; then
    EXP=$(openssl x509 -enddate -noout -in "certs/live/$d/fullchain.pem" | cut -d= -f2)
    echo "  ✅ $d — expires $EXP"
  else
    echo "  ⚠️  $d — not issued yet (run scripts/issue-certs.sh after DNS)"
  fi
done

echo ""
echo "═══ WebSocket / TURN ═══"
chk "Socket.IO handshake" "curl -fsS --max-time 10 'https://api.nabd.plus/socket.io/?EIO=4&transport=polling' | grep -q '0{'"
if command -v turnutils_uclient &>/dev/null; then
  chk "TURN allocation" "turnutils_uclient -y -u test -w test turn.nabd.plus 2>&1 | grep -q 'relay'"
else
  echo "  ℹ️  turnutils_uclient not installed — TURN verified via coturn container port check above"
fi

echo ""
echo "RESULT: $PASS passed · $FAIL failed"
[ "$FAIL" -eq 0 ]
