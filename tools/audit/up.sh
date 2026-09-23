redis-server --daemonize yes --save "" >/dev/null
cd /home/claude; pgrep -x ferretdb >/dev/null || (nohup setsid ./ferretdb --handler=sqlite --sqlite-url=file:/home/claude/fdbdata/ --listen-addr=127.0.0.1:27017 --telemetry=disable > /tmp/fdb.log 2>&1 < /dev/null &)
sleep 3
cd /home/claude/repo/backend; set -a; . /home/claude/aud/be.env; set +a
pgrep -f "^node .*dist/main.js" >/dev/null || (nohup setsid node --max-old-space-size=1300 dist/main.js > /tmp/be.log 2>&1 < /dev/null &)
cd /home/claude/repo/admin; pgrep -f "^node .*next dev -p 3001" >/dev/null || (NODE_OPTIONS=--max-old-space-size=1000 nohup setsid npx next dev -p 3001 > /tmp/admin.log 2>&1 < /dev/null &)
echo up
