#!/bin/bash
# #1603: what does coturn write? Runs coturn 4.6.2 with the production config (verbose, log-file=stdout) under load and
# reports its writable layer and `docker diff`; then the same hardened (read-only root, small tmpfs) to see whether it
# starts and relays. The load is turnutils_uclient allocating relays with REST-API credentials.
#   coturn-writes.sh <plain|hardened>
set -u
MODE=${1:-plain}
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../.." && pwd)
SECRET=$(openssl rand -hex 16)   # a throw-away value made per run (a literal here is a Gitleaks finding)
D=$ROOT/deploy
mkdir -p "$D/certs/turn/turn.nabd.plus"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=turn.nabd.plus -keyout "$D/certs/turn/turn.nabd.plus/privkey.pem" -out "$D/certs/turn/turn.nabd.plus/fullchain.pem" 2>/dev/null
chmod -R a+rX "$D/certs/turn"
# the production template with the secret rendered; CI-only: no external-ip (the production address is not this runner's)
# and loopback peers allowed (the load generator relays to 127.0.0.1)
COTURN_STATIC_AUTH_SECRET=$SECRET OUTPUT=$D/coturn/turnserver.rendered.conf bash "$D/scripts/render-coturn-config.sh" >/dev/null
sed -i '/^external-ip=/d' "$D/coturn/turnserver.rendered.conf"
echo "allow-loopback-peers" >> "$D/coturn/turnserver.rendered.conf"
chmod a+r "$D/coturn/turnserver.rendered.conf"

NAME=nabdah-coturn
docker rm -f $NAME >/dev/null 2>&1
HARD=()
[ "$MODE" = hardened ] && HARD=(--read-only --tmpfs /tmp:size=16m --tmpfs /var/tmp:size=16m)
docker run -d --name $NAME --network host "${HARD[@]}" --log-driver json-file --log-opt max-size=20m --log-opt max-file=3 \
  -v "$D/coturn/turnserver.rendered.conf:/etc/coturn/turnserver.conf:ro" -v "$D/certs/turn:/etc/coturn/certs:ro" \
  coturn/coturn:4.6.2 -c /etc/coturn/turnserver.conf >/dev/null
sleep 5
echo "== coturn ($MODE): running=$(docker inspect -f '{{.State.Running}}' $NAME) exit=$(docker inspect -f '{{.State.ExitCode}}' $NAME)"
docker logs $NAME 2>&1 | tail -5 | cut -c1-200

# load: 60 s of allocations with time-limited REST credentials
docker run --rm --network host --entrypoint turnutils_uclient coturn/coturn:4.6.2 \
  -W "$SECRET" -u ci -m 20 -n 200 -l 170 -e 127.0.0.1 -p 3478 127.0.0.1 2>&1 | tail -6 | cut -c1-200
for i in 1 2 3; do
  docker run --rm --network host --entrypoint turnutils_uclient coturn/coturn:4.6.2 -W "$SECRET" -u ci -m 20 -n 300 -l 170 -e 127.0.0.1 -p 3478 127.0.0.1 >/dev/null 2>&1
done

echo "running after load: $(docker inspect -f '{{.State.Running}}' $NAME)"
echo "writable layer: $(docker inspect --size -f '{{.SizeRw}}' $NAME) bytes"
echo "docker diff ($(docker diff $NAME | wc -l) paths):"; docker diff $NAME | head -20
echo "json log file: $(sudo ls -l $(docker inspect -f '{{.LogPath}}' $NAME) | awk '{print $5}') bytes"
echo "largest files in the layer:"; docker exec $NAME sh -c 'find / -xdev -type f -size +100k -newer /etc/coturn/turnserver.conf 2>/dev/null | head; du -xk /var 2>/dev/null | sort -rn | head -5'
STUN=$(docker run --rm --network host --entrypoint turnutils_stunclient coturn/coturn:4.6.2 127.0.0.1 2>&1 | grep -c "0.0.0.0\|127.0.0.1\|mapped")
echo "STUN binding answered: $([ $STUN -gt 0 ] && echo yes || echo no)"
docker rm -f $NAME >/dev/null 2>&1
[ $STUN -gt 0 ]
