#!/bin/bash
# READ-ONLY. Where the memory goes, what images/backups/caches exist, how the stack is built.
# Secret VALUES are never printed (names only); credentials in URLs are masked.
set +e
sec() { echo; echo "## $1"; }
mask() { sed -E 's#(://)[^:@/ ]+:[^@/ ]+@#\1***:***@#g; s#(SECRET|PASSWORD|TOKEN|KEY|PASS)([A-Z_]*)=[^ ]+#\1\2=***#g'; }
D=/opt/nabdah/deploy
T() { timeout 25 "$@"; }

sec "memory per container"; T sudo -n docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' 2>&1
sec "top processes by memory"; T ps -eo pid,user,rss,etime,comm --sort=-rss | head -20
sec "logged-in users"; T who
sec "docker disk"; T sudo -n docker system df 2>&1
sec "images"; T sudo -n docker images --format '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedSince}}' 2>&1
sec "all containers (incl. stopped)"; T sudo -n docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>&1
sec "volumes"; T sudo -n docker volume ls 2>&1
sec "sizes"; T sudo -n du -sh --max-depth=0 /opt/nabdah/backups /opt/nabdah/deploy /var/log 2>/dev/null; T sudo -n ls -la /opt/nabdah/backups | tail -15
sec "journal"; T journalctl --disk-usage 2>&1
sec "nginx api cache size"; T sudo -n docker exec nabdah-nginx sh -c 'du -sh /var/cache/nginx/api 2>/dev/null; ls /var/cache/nginx' 2>&1

sec "compose file in use (masked)"; mask < $D/docker-compose.production.yml
sec "compose overrides"; ls -la $D/*.yml $D/*.yaml 2>/dev/null
sec "dockerfiles"; ls -la $D/docker 2>&1

sec "source dirs: git?"
for d in /opt/nabdah/nabdah-backend /opt/nabdah/patient-web /opt/nabdah/nabdah-patient-web /opt/nabdah/nabdah-admin /opt/nabdah/Napd-admin; do
  echo "-- $d: $( [ -d $d/.git ] && git -C $d log -1 --format='%h %ci %s' || echo 'no git')"
  [ -f $d/package.json ] && grep -E '"(name|version)"' $d/package.json | head -2
done

sec "running containers: image, created, compose labels, env NAMES"
for c in nabdah-backend nabdah-staging-backend nabdah-patient-web nabdah-admin-web; do
  echo "-- $c"
  sudo -n docker inspect $c --format 'image={{.Config.Image}} created={{.Created}} wd={{index .Config.Labels "com.docker.compose.project.working_dir"}} svc={{index .Config.Labels "com.docker.compose.service"}} files={{index .Config.Labels "com.docker.compose.project.config_files"}}' 2>&1
  sudo -n docker inspect $c --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | cut -d= -f1 | sort | tr '\n' ' '; echo
  sudo -n docker inspect $c --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -E '^(DB_NAME|NODE_ENV|PORT|APP_ENV|MONGO_URL)=' | mask
  sudo -n docker inspect $c --format '{{json .State.Health.Log}}' 2>/dev/null | tail -c 600; echo
done
sec "staging backend: recent logs (last 15 lines, masked)"; T sudo -n docker logs --tail 15 nabdah-staging-backend 2>&1 | mask | cut -c1-300

sec "nginx files actually loaded"; T sudo -n docker exec nabdah-nginx nginx -T 2>/dev/null | grep -E '^# configuration file'
sec "nginx mounts"; T sudo -n docker inspect nabdah-nginx --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
sec "nabd.plus.conf lines 50-125"; sed -n '50,125p' $D/nginx/conf.d/nabd.plus.conf
sec "mcp.conf"; sed -n '1,60p' $D/nginx/conf.d/mcp.conf
sec "staging.conf upstream"; grep -nE 'proxy_pass|upstream|server ' $D/nginx/conf.d/staging.conf
sec "livekit keys (masked)"; sudo -n grep -nA3 '^keys' $D/livekit/livekit.yaml 2>&1 | sed -E 's/(:\s*)\S{6,}/\1***/'
sec "cron"; crontab -l 2>&1; sudo -n crontab -l 2>&1
sec "health via nginx"; for p in /api/v1/health /health /api/health; do echo "$p -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 -H 'Host: api.nabd.plus' https://127.0.0.1$p)"; done
echo; echo "## inspect-deep done"
