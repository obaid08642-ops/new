#!/usr/bin/env bash
# Start the built backend (backend/dist) against local Mongo (replica set) + Redis for live tests.
#   DB_NAME=nabd_live bash tools/live/start-backend.sh      (logs: /tmp/nabd-backend.log)
# Mail goes to tools/live/smtp_sink.py on :2525 so OTP/email flows can be completed end to end.
set -euo pipefail
cd "$(dirname "$0")/../../backend"
ps -eo pid,args | grep "[d]ist/main.js" | awk '{print $1}' | xargs -r kill || true
sleep 1
export NODE_ENV="${NODE_ENV:-development}" PORT="${PORT:-8002}"
export JWT_SECRET="${JWT_SECRET:-live-test-secret-0123456789abcdef-0123456789}"
export MONGO_URL="${MONGO_URL:-mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true}"
export DB_NAME="${DB_NAME:-nabd_live}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}" REDIS_HOST=127.0.0.1 REDIS_PORT=6379
export SES_SMTP_HOST=127.0.0.1 SES_SMTP_PORT=2525 SES_SMTP_USER=live SES_SMTP_PASS=live SES_FROM=no-reply@nabd.test
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:3000,http://localhost:3001,http://localhost:8081,http://localhost:8082}"
export CORS_ORIGINS="$ALLOWED_ORIGINS"
# The live suite drives many logins/OTPs from one IP; the limiter itself is covered by its own test.
export DISABLE_RATE_LIMIT="${DISABLE_RATE_LIMIT:-true}" THROTTLER_LIMIT="${THROTTLER_LIMIT:-1000000}"
nohup node --max-old-space-size=1500 dist/main.js > /tmp/nabd-backend.log 2>&1 &
for i in $(seq 1 90); do
  curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/v1/health/liveness" 2>/dev/null | grep -q 200 && { echo "backend up (db=$DB_NAME)"; exit 0; }
  sleep 2
done
echo "backend did not start"; tail -40 /tmp/nabd-backend.log; exit 1
