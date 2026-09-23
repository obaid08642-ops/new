if curl -s -m 3 -o /dev/null http://127.0.0.1:8002/api/v1/health/liveness; then echo already; exit 0; fi
redis-server --daemonize yes --save "" >/dev/null 2>&1
cd /home/claude; ps aux | grep -v grep | grep -q "ferretdb --handler" || (nohup setsid ./ferretdb --handler=sqlite --sqlite-url=file:/home/claude/fdbdata/ --listen-addr=127.0.0.1:27017 --telemetry=disable > /tmp/fdb.log 2>&1 < /dev/null &)
sleep 3; cd /home/claude/repo/backend; set -a; . /home/claude/aud/be.env; set +a
ps aux | grep -v grep | grep -q "dist/main.js" || (nohup setsid node --max-old-space-size=1300 dist/main.js > /tmp/be.log 2>&1 < /dev/null &)
for i in $(seq 1 28); do sleep 8; curl -s -m 3 -o /dev/null http://127.0.0.1:8002/api/v1/health/liveness && { echo "up after $((i*8))s"; exit 0; }; done; echo "not up"
