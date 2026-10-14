#!/usr/bin/env bash
# Reviewer helper: brings the whole local live stack back after a container restart (idempotent).
# Usage: bash tools/live/up_stack.sh   (expects the p5mongo container, built backend/web/admin, and web exports in /tmp/pa-web6 /tmp/pv-web5)
# Bring the live test stack back after a container restart. Idempotent.
docker info >/dev/null 2>&1 || { rm -f /var/run/docker.pid; (nohup dockerd > /tmp/dockerd.log 2>&1 &); for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 2; done; }
docker start p5mongo >/dev/null 2>&1
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes >/dev/null
for i in $(seq 1 60); do docker exec p5mongo mongosh -quiet --eval 'rs.status().ok' 2>/dev/null | grep -q 1 && break; sleep 3; done
echo "mongo: $(docker exec p5mongo mongosh -quiet --eval 'rs.status().ok' 2>/dev/null)"
cd /home/user/new/backend && DB_NAME=nabd_form2 bash ../tools/live/start-backend.sh 2>&1 | tail -1
curl -s -o /dev/null -m 3 http://127.0.0.1:8081/ || (cd /tmp/spa && nohup python3 spa_server.py /tmp/pa-web6 8081 >/tmp/s1.log 2>&1 &)
curl -s -o /dev/null -m 3 http://127.0.0.1:8082/ || (cd /tmp/spa && nohup python3 spa_server.py /tmp/pv-web5 8082 >/tmp/s2.log 2>&1 &)
curl -s -o /dev/null -m 3 http://127.0.0.1:3000/ || (cd /home/user/new/patient-web && NABD_API_BASE_URL=http://127.0.0.1:8002/api/v1 INTERNAL_API_BASE_URL=http://127.0.0.1:8002/api/v1 NEXT_PUBLIC_SITE_ORIGIN=http://127.0.0.1:3000 PORT=3000 nohup npm run start >/tmp/web.log 2>&1 &)
curl -s -o /dev/null -m 3 http://127.0.0.1:3001/ || (cd /home/user/new/admin && ADMIN_GATE_TOKEN=live-gate-token ADMIN_BACKEND_URL=http://127.0.0.1:8002 NODE_ENV=production nohup npx next start -p 3001 -H 127.0.0.1 >/tmp/admin.log 2>&1 &)
echo stack-up
(exec 3<>/dev/tcp/127.0.0.1/2525) 2>/dev/null || (cd /home/user/new && nohup python3 tools/live/smtp_sink.py 2525 /tmp/nabd-mail.jsonl >/tmp/smtp.log 2>&1 &)
(exec 3<>/dev/tcp/127.0.0.1/9000) 2>/dev/null || (nohup moto_server -p 9000 >/tmp/moto.log 2>&1 &)
for i in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:9000/ && break; sleep 1; done
curl -s -X PUT -o /dev/null http://127.0.0.1:9000/nabd-live   # private uploads bucket (moto keeps it in memory only)
(exec 3<>/dev/tcp/127.0.0.1/9100) 2>/dev/null || (cd /home/user/new && nohup python3 tools/live/fake_moyasar.py >/tmp/fakepay.log 2>&1 &)
echo aux-up
