#!/bin/bash
# READ-ONLY (2026-10-14). What production runs now vs main, and room for a staging stack on the same host.
# Secret VALUES are never printed.
set +e
sec() { echo; echo "## $1"; }
T() { timeout 25 "$@"; }
D=/opt/nabdah/deploy
sec "host"; T nproc; T free -m; T df -h / /opt /var/lib/docker 2>&1 | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g'; T uptime
sec "docker usage"; T sudo -n docker system df 2>&1
sec "containers"; T sudo -n docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>&1
sec "per-container memory"; T sudo -n docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' 2>&1
sec "source dirs and revisions"; T sudo -n ls -la /opt/nabdah 2>&1
for d in /opt/nabdah/*/; do [ -d "$d.git" ] && echo "git: $d $(sudo -n git -C $d log -1 --format='%h %ci %s' 2>/dev/null | cut -c1-120) branch=$(sudo -n git -C $d rev-parse --abbrev-ref HEAD 2>/dev/null) remote=$(sudo -n git -C $d remote get-url origin 2>/dev/null | sed -E 's#://[^@/]+@#://***@#')"; done
sec "deploy dir"; T sudo -n ls -la $D 2>&1 | head -40
sec "compose services (deployed file)"; T sudo -n docker compose -f $D/docker-compose.production.yml --env-file $D/.env.production config --services 2>&1
sec "deploy scripts present"; T sudo -n ls -la $D/scripts 2>&1 | head -20
sec "env NAMES"; sudo -n grep -oE '^[A-Z_][A-Z0-9_]*=' $D/.env.production 2>/dev/null | tr -d = | sort | tr '\n' ' '; echo
sec "nginx files"; T sudo -n ls -la $D/nginx $D/nginx/conf.d 2>&1
sec "listening ports"; T sudo -n ss -ltnp 2>&1 | awk '{print $4, $6}' | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g' | head -40
sec "outbound"; for u in https://github.com https://codeload.github.com https://registry.npmjs.org https://registry-1.docker.io/v2/; do echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 8 $u)"; done
sec "health"; for h in api.nabd.plus nabd.plus www.nabd.plus admin.nabd.plus; do echo "$h -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 6 -H "Host: $h" https://127.0.0.1/ )"; done
echo "readiness: $(curl -sk --max-time 6 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/readiness | head -c 300)"
echo; echo "## inspect-scale done"
