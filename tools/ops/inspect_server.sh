#!/bin/bash
# Read-only server inspection. Runs ON the server over SSH; changes nothing.
# Prints secret NAMES only (never values). Output is encrypted before it leaves the CI runner.
set +e
sec() { echo; echo "## $1"; }
sec "identity"; id; uname -srm; uptime
sec "sudo without password"; sudo -n true 2>/dev/null && echo yes || echo no
sec "disk / memory / cpu"; df -h / /opt 2>/dev/null; free -m; nproc
sec "docker"; docker --version 2>&1
(docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || sudo -n docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1)
sec "compose projects"; (docker compose ls 2>/dev/null || sudo -n docker compose ls 2>&1)
sec "candidate app dirs"
for d in /opt/nabdah /opt/nabd /opt/new /root/new /home/*/new /srv/*; do
  [ -d "$d" ] || continue
  echo "-- $d"; ls -la "$d" 2>&1 | head -30
  if [ -d "$d/.git" ]; then
    git -C "$d" log -1 --format='commit %H %ci %s' 2>&1
    git -C "$d" remote -v 2>&1 | head -2
    git -C "$d" status --short 2>&1 | head -20
  fi
  for e in "$d/deploy/.env.production" "$d/.env.production" "$d/deploy/.env.staging" "$d/.env"; do
    [ -f "$e" ] || continue
    echo "env file $e (names only):"
    (cut -d= -f1 "$e" 2>/dev/null || sudo -n cut -d= -f1 "$e" 2>/dev/null) | grep -E '^[A-Z_][A-Z0-9_]*$' | sort | tr '\n' ' '; echo
    for n in COTURN_SECRET LIVEKIT_API_KEY LIVEKIT_API_SECRET MOYASAR_SECRET_KEY JWT_SECRET; do
      v=$( (grep -E "^$n=" "$e" 2>/dev/null || sudo -n grep -E "^$n=" "$e" 2>/dev/null) | cut -d= -f2-)
      [ -n "$v" ] && echo "  $n: set" || echo "  $n: EMPTY/missing"
    done
  done
done
sec "nginx"
ls /etc/nginx/conf.d /etc/nginx/sites-enabled 2>&1
for d in /opt/*/deploy/nginx; do [ -d "$d" ] && grep -rnE 'proxy_cache |proxy_cache_path|server_name' "$d" 2>/dev/null | head -40; done
sec "listening ports"; (ss -ltnp 2>/dev/null || sudo -n ss -ltnp 2>&1) | head -40
sec "local health"
for u in http://127.0.0.1:3000/api/v1/health http://127.0.0.1:3000/health http://127.0.0.1/api/v1/health; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$u")"
done
sec "deploy log tail"; tail -5 /var/log/nabdah-deploy.log 2>/dev/null
echo; echo "## done"
