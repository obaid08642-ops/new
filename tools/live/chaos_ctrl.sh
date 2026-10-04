#!/usr/bin/env bash
# P15.11 chaos control: pause/resume one dependency at a time for the live-gate
# chaos drills (tools/live/j_chaos.py). One dependency per drill, always resumed
# afterwards — the drills assert the app degrades gracefully and never loses data.
#
# Mechanisms match how the harness actually runs each dependency:
#   redis   CI: a `services: redis:7` container; local: `redis-server` daemon
#           (see tools/live/up_stack.sh). Pause = `docker pause`, else SIGSTOP.
#   mongo   CI: `docker run --name mongo ... --replSet rs0`; local: `p5mongo`
#           container (see tools/live/up_stack.sh). Step-down via mongosh
#           `rs.stepDown()` — works even on the single-node rs0 CI set.
#   moyasar Card payments go to tools/live/fake_moyasar.py (:9100); its
#           POST /__mode flips an in-memory 500 failure mode (P15.11a).
#   slowapi No latency switch exists in the backend (DEFERRED-OUT-OF-SCOPE for a
#           server-side flag); the drill routes the journey's own client through
#           tools/live/slow_proxy.py, which adds the +2 s delay hop-by-hop.
#   sms     No fake SMS provider exists in the harness (DEFERRED-OUT-OF-SCOPE);
#           the drill asserts the fallback that does exist (SMS disabled by
#           default -> OTP still arrives via the smtp_sink email).
#   livekit The live gate does not start LiveKit at all; the drill asserts the
#           F37 contract (call buttons hidden when LiveKit env is absent, and a
#           clear error — never a hang — when a call is attempted anyway).
#
# Usage: bash tools/live/chaos_ctrl.sh <redis-pause|redis-resume|mongo-stepdown|
#        moyasar-fail|moyasar-ok|status>
set -uo pipefail

redis_container() {
  # A container publishing 6379 (CI service or production redis).
  docker ps --format '{{.Names}}' 2>/dev/null | head -1 >/dev/null 2>&1 || return 1
  docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep '6379' | head -1 | awk '{print $1}'
}

mongo_container() {
  for name in mongo p5mongo nabdah-mongodb; do
    docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$name" && { echo "$name"; return 0; }
  done
  return 1
}

mongosh() {
  local c
  c=$(mongo_container) || return 1
  docker exec "$c" mongosh --quiet --eval "$1" 2>/dev/null
}

case "${1:-status}" in
  redis-pause)
    c=$(redis_container) || c=""
    if [[ -n "$c" ]]; then
      docker pause "$c" && echo "redis paused (container $c)"
    elif pgrep -f 'redis-server' >/dev/null 2>&1; then
      pkill -STOP -f 'redis-server' && echo "redis paused (SIGSTOP redis-server)"
    else
      echo "BLOCKED: no redis container or redis-server process found" >&2; exit 1
    fi
    ;;
  redis-resume)
    c=$(redis_container) || c=""
    if [[ -n "$c" ]]; then
      docker unpause "$c" && echo "redis resumed (container $c)"
    elif pgrep -f 'redis-server' >/dev/null 2>&1; then
      pkill -CONT -f 'redis-server' && echo "redis resumed (SIGCONT redis-server)"
    else
      echo "BLOCKED: no redis container or redis-server process found" >&2; exit 1
    fi
    ;;
  mongo-stepdown)
    # 30 s step-down: the old primary steps aside, clients must retry/reconnect.
    if mongosh 'rs.stepDown(30)'; then
      echo "mongo primary stepped down for 30s"
    else
      echo "BLOCKED: no reachable mongo container with a replica set (need rs0; see live-gate.yml 'MongoDB replica set' step)" >&2; exit 1
    fi
    ;;
  moyasar-fail)
    curl -s -X POST http://127.0.0.1:9100/__mode -H 'content-type: application/json' -d '{"payments_fail":true}' && echo && echo "fake_moyasar: 500 failure mode ON"
    ;;
  moyasar-ok)
    curl -s -X POST http://127.0.0.1:9100/__mode -H 'content-type: application/json' -d '{"payments_fail":false}' && echo && echo "fake_moyasar: 500 failure mode OFF"
    ;;
  status)
    echo "redis: $(redis-cli -p 6379 ping 2>/dev/null || echo DOWN)"
    if c=$(mongo_container); then
      echo "mongo ($c primary): $(mongosh 'rs.isMaster().ismaster' 2>/dev/null || echo UNKNOWN)"
    else
      echo "mongo: no container"
    fi
    echo "moyasar mode: $(curl -s -m 3 http://127.0.0.1:9100/__mode 2>/dev/null || echo UNREACHABLE)"
    ;;
  *)
    echo "usage: $0 <redis-pause|redis-resume|mongo-stepdown|moyasar-fail|moyasar-ok|status>" >&2; exit 2
    ;;
esac
