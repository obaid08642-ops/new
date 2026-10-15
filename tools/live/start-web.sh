#!/usr/bin/env bash
# Start the built admin panel (:3001) and patient website (:3000) against the local backend.
# patient-web runs behind its production entry (server/nonce-server.mjs, the Next server on the port + 999), as in the Docker
# image: without it the static public pages carry no script nonce and the browser refuses their scripts.
#   bash tools/live/start-web.sh [admin|patient-web|all]     (build first: next build / pnpm build)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API="${NABD_BACKEND:-http://127.0.0.1:8002}"
what="${1:-all}"
# PATIENT_WEB_PORT: the live gate serves the website on :3100 for the j_web_* journeys (see run_gate.sh); :3000 by default.
PW_PORT="${PATIENT_WEB_PORT:-3000}"; PW_INTERNAL="$((PW_PORT + 999))"; PW_ORIGIN="${PATIENT_WEB_ORIGIN:-http://localhost:$PW_PORT}"
# Next renames its process to "next-server", so stop whatever listens on the port.
# /proc does not exist on macOS, so match on the listening port (lsof) as well;
# without this a "restart" silently left the old build running and every change
# appeared to have no effect.
stop() { local port="$1"; local pids; pids="$(lsof -ti "tcp:${port}" 2>/dev/null; fuser "${port}/tcp" 2>/dev/null)"; [[ -n "$pids" ]] && kill $pids 2>/dev/null; for pid in $(pgrep -f 'next-server|next start|server.js' 2>/dev/null); do cwd="$(readlink /proc/$pid/cwd 2>/dev/null)"; [[ -n "$cwd" && "${cwd% (deleted)}" == "$2" ]] && kill "$pid" 2>/dev/null; done; sleep 2; }
if [[ $what == admin || $what == all ]]; then
  stop 3001 "$ROOT/admin"
  (cd "$ROOT/admin" && ADMIN_BACKEND_URL=$API ADMIN_GATE_TOKEN="${ADMIN_GATE_TOKEN:-live-gate-token}" NODE_ENV=production nohup npx next start -p 3001 -H 127.0.0.1 > /tmp/admin-server.log 2>&1 &)
fi
if [[ $what == patient-web || $what == all ]]; then
  stop "$PW_PORT" "$ROOT/patient-web/.next/standalone"; stop "$PW_INTERNAL" "$ROOT/patient-web/.next/standalone"
  cd "$ROOT/patient-web" && rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/server && cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/ && cp -r server .next/standalone/server
  (cd "$ROOT/patient-web/.next/standalone" && PORT=$PW_PORT HOSTNAME=127.0.0.1 NEXT_INTERNAL_PORT=$PW_INTERNAL NABD_API_BASE_URL=$API/api/v1 NEXT_PUBLIC_SITE_ORIGIN=$PW_ORIGIN NODE_ENV=production nohup node server/nonce-server.mjs > /tmp/pw-server.log 2>&1 &)
fi
for port in 3001 "$PW_PORT"; do
  for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 1; done
done
echo "web up"