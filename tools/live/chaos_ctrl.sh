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
#   sms     The backend ships a TEST-ONLY switch (p15-backend
#           backend/src/common/chaos-switches.ts): CHAOS_FAIL_SMS=1 makes
#           SmsService.sendOtp() return false before any provider call, so the
#           OTP email+push fallback is forced. It is process env on the backend,
#           so it is set by RESTARTING the backend with the variable set
#           (`backend-chaos CHAOS_FAIL_SMS`) and removed again afterwards
#           (`backend-nochaos`). start-backend.sh passes the variable straight
#           through to `node dist/main.js` (it only defaults its own variables).
#   livekit Same mechanism: CHAOS_FAIL_LIVEKIT=1 makes
#           LiveKitService.roomService() return null, i.e. every server-side room
#           call answers exactly as if LiveKit were unconfigured.
#
# Usage: bash tools/live/chaos_ctrl.sh <redis-pause|redis-resume|mongo-stepdown|
#        moyasar-fail|moyasar-ok|backend-chaos <VAR>|backend-nochaos <VAR>|status>
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# The only variables this script will ever export into the backend. Anything else
# is refused: this is a fault-injection control, not a generic env editor.
CHAOS_VARS=(CHAOS_FAIL_SMS CHAOS_FAIL_LIVEKIT)

chaos_var_allowed() {
  local v
  for v in "${CHAOS_VARS[@]}"; do [[ "$v" == "$1" ]] && return 0; done
  return 1
}

backend_pids() { pgrep -f 'dist/main.js' | sort | tr '\n' ' '; }

# Best-effort read of a live process environment (Linux /proc, else `ps eww`).
# Prints nothing and returns 1 when the platform exposes no way to look.
backend_env() {
  local pid="$1" dump
  if [[ -r "/proc/$pid/environ" ]]; then
    dump="$(tr '\0' '\n' < "/proc/$pid/environ")"
  elif ps eww -p "$pid" >/dev/null 2>&1; then
    dump="$(ps eww -p "$pid" 2>/dev/null | tr ' ' '\n')"
  else
    return 1
  fi
  # Some platforms accept `ps eww` but print no environment at all. Say so rather
  # than reporting a confident "absent" the drill could misread as a proof.
  grep -qE '^[A-Za-z_][A-Za-z0-9_]*=' <<<"$dump" || return 1
  printf '%s\n' "$dump"
}

# Restart the backend with (VAR=1) or without (VAR absent) a chaos switch and
# report what could be PROVED about the resulting process. A silent no-op here
# would leave the drill asserting against a healthy backend, so every failure
# path exits non-zero with the reason.
backend_switch() {
  local mode="$1" var="$2" old new pid env_state
  chaos_var_allowed "$var" || { echo "BLOCKED: refusing to set '$var' — only ${CHAOS_VARS[*]} are allowed" >&2; exit 2; }
  old="$(backend_pids)"
  case "$mode" in
    on)  CHAOS_ENV=("$var=1") ;;
    off) CHAOS_ENV=() ;;
    *)   echo "usage: $0 backend-chaos|backend-nochaos <VAR>" >&2; exit 2 ;;
  esac
  # `env` (not a shell assignment) so "off" really removes a variable the parent
  # may already export.
  if ! env -u "$var" "${CHAOS_ENV[@]}" bash "$ROOT/tools/live/start-backend.sh" >/tmp/chaos-backend-restart.log 2>&1; then
    echo "BLOCKED: backend restart failed (see /tmp/chaos-backend-restart.log); the drill cannot prove anything" >&2
    tail -5 /tmp/chaos-backend-restart.log >&2 2>/dev/null
    exit 1
  fi
  new="$(backend_pids)"
  pid="$(pgrep -f 'dist/main.js' | head -1)"
  if [[ -z "$new" ]]; then
    echo "BLOCKED: no backend process after the restart (old='$old')" >&2; exit 1
  fi
  if [[ "$new" == "$old" ]]; then
    echo "BLOCKED: the backend process set did not change (old='$old' new='$new') — $var may not have reached the server" >&2; exit 1
  fi
  if [[ "$(wc -w <<<"$new")" != "1" ]]; then
    echo "BLOCKED: expected exactly one backend process after the restart, found '$new'" >&2; exit 1
  fi
  if env_lines="$(backend_env "$pid")"; then
    if grep -qx "$var=1" <<<"$env_lines"; then env_state=set; else env_state=absent; fi
  else
    env_state=unknown
  fi
  echo "var=$var mode=$mode old_pids=[${old% }] new_pids=[${new% }] env_state=$env_state"
}

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
  backend-chaos|backend-nochaos)
    [[ -n "${2:-}" ]] || { echo "usage: $0 $1 <CHAOS_FAIL_SMS|CHAOS_FAIL_LIVEKIT>" >&2; exit 2; }
    if [[ "$1" == "backend-chaos" ]]; then backend_switch on "$2"; else backend_switch off "$2"; fi
    ;;
  status)
    echo "redis: $(redis-cli -p 6379 ping 2>/dev/null || echo DOWN)"
    if c=$(mongo_container); then
      echo "mongo ($c primary): $(mongosh 'rs.isMaster().ismaster' 2>/dev/null || echo UNKNOWN)"
    else
      echo "mongo: no container"
    fi
    echo "moyasar mode: $(curl -s -m 3 http://127.0.0.1:9100/__mode 2>/dev/null || echo UNREACHABLE)"
    for v in "${CHAOS_VARS[@]}"; do
      pid="$(pgrep -f 'dist/main.js' | head -1)"
      if [[ -n "$pid" ]] && env_lines="$(backend_env "$pid")"; then
        echo "backend $v: $(grep -qx "$v=1" <<<"$env_lines" && echo ON || echo off)"
      else
        echo "backend $v: UNKNOWN (no backend process or no env introspection)"
      fi
    done
    ;;
  *)
    echo "usage: $0 <redis-pause|redis-resume|mongo-stepdown|moyasar-fail|moyasar-ok|backend-chaos <VAR>|backend-nochaos <VAR>|status>" >&2; exit 2
    ;;
esac
