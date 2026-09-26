#!/usr/bin/env bash
# Start the built admin panel (:3001) and patient website (:3000) against the local backend.
#   bash tools/live/start-web.sh [admin|patient-web|all]     (build first: next build / pnpm build)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API="${NABD_BACKEND:-http://127.0.0.1:8002}"
what="${1:-all}"
stop() { pgrep -f "$1" | xargs -r kill 2>/dev/null; sleep 1; }
if [[ $what == admin || $what == all ]]; then
  stop "next start -p 300[1]"
  (cd "$ROOT/admin" && ADMIN_BACKEND_URL=$API NODE_ENV=production nohup npx next start -p 3001 -H 127.0.0.1 > /tmp/admin-server.log 2>&1 &)
fi
if [[ $what == patient-web || $what == all ]]; then
  stop "standalone/server[.]js"
  cd "$ROOT/patient-web" && rm -rf .next/standalone/public .next/standalone/.next/static && cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/
  (cd "$ROOT/patient-web/.next/standalone" && PORT=3000 HOSTNAME=127.0.0.1 NABD_API_BASE_URL=$API/api/v1 NEXT_PUBLIC_SITE_ORIGIN=http://localhost:3000 NODE_ENV=production nohup node server.js > /tmp/pw-server.log 2>&1 &)
fi
for port in 3001 3000; do
  for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 1; done
done
echo "web up"
