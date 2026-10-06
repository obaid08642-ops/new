#!/bin/bash
# READ-ONLY. Facts needed to write the deploy task for main (2026-10-06).
# Secret VALUES are never printed: env files are reduced to variable NAMES.
set +e
sec() { echo; echo "## $1"; }
T() { timeout 25 "$@"; }
D=/opt/nabdah/deploy
sec "disk"; T df -h / /opt 2>&1 | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g'
sec "memory"; T free -m
sec "docker / compose versions"; T sudo -n docker version --format '{{.Server.Version}}' 2>&1; T sudo -n docker compose version 2>&1
sec "env file variable NAMES (no values)"
for f in $D/.env.production $D/.env; do [ -f $f ] && { echo "-- $f"; sudo -n grep -oE '^[A-Z_][A-Z0-9_]*=' $f | tr -d = | sort | tr '\n' ' '; echo; }; done
sec "social sign-in config present? (yes/no only)"
for n in GOOGLE_OAUTH_CLIENT_IDS APPLE_SIGNIN_CLIENT_IDS X_CLIENT_ID SNAPCHAT_CLIENT_ID NABD_CSP_EDGE_NONCE ADMIN_GATE_TOKEN; do
  v=$(sudo -n grep -cE "^$n=.+" $D/.env.production 2>/dev/null); echo "$n: $([ "${v:-0}" -gt 0 ] && echo yes || echo no)"; done
sec "compose services and build contexts"; T sudo -n docker compose -f $D/docker-compose.production.yml config --services 2>&1
T sudo -n grep -nE '^\s{2}[a-z0-9-]+:$|build:|context:|dockerfile:|image:' $D/docker-compose.production.yml 2>&1 | head -60
sec "running images (id, created)"; T sudo -n docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>&1
for c in $(sudo -n docker ps --format '{{.Names}}'); do echo "$c $(sudo -n docker inspect $c --format '{{.Image}} {{.Created}}' 2>/dev/null | cut -c1-90)"; done
sec "source dirs"; T sudo -n ls -la /opt/nabdah 2>&1
for d in /opt/nabdah/*/; do [ -d "$d.git" ] && echo "git: $d $(git -C $d log -1 --format='%h %ci' 2>/dev/null) remote=$(git -C $d remote get-url origin 2>/dev/null | sed -E 's#://[^@/]+@#://***@#')"; done
sec "backups (newest 6)"; T sudo -n ls -lt /opt/nabdah/backups 2>&1 | head -7
sec "outbound to GitHub (code download)"; for u in https://codeload.github.com https://github.com https://registry.npmjs.org; do echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 8 $u)"; done
sec "node in images"; for c in nabdah-backend nabdah-patient-web nabdah-admin-web; do echo "$c: $(T sudo -n docker exec $c node -v 2>&1 | head -1)"; done
sec "health via nginx"; for h in api.nabd.plus nabd.plus admin.nabd.plus; do echo "$h -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 6 -H "Host: $h" https://127.0.0.1/ )"; done
echo; echo "## inspect-deploy done"
