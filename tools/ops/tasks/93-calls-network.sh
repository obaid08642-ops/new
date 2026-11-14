#!/bin/bash
# Calls on every network (owner 2026-10-30): the server advertised only its IPv6 address for LiveKit (`node_ip`) and for coturn (`external-ip`), because the deploy
# script took `curl ifconfig.me`, which answers the IPv6 address on a dual-stack host. An IPv4-only client (many Wi-Fi and CGNAT networks) had no candidate to connect to.
# This task fixes the two files ON THE SERVER, surgically (the keys, certs and secrets in them are never touched or printed):
#   livekit/livekit.yaml          : the `node_ip:` line is removed, `use_external_ip: true` (STUN discovery of the public IPv4), `udp_port: 7882` (one mux port), the port_range_* lines removed
#   coturn/turnserver.rendered.conf: `external-ip=` lines become the public IPv4 first and the IPv6 second
#   firewall                      : ufw allows 7881/tcp and 7882/udp (idempotent; the old 50000:50100/udp rule is left in place, harmless)
# Two runs of the same task, plus automatic rollback:
#   Run 1 (APPLY empty): DRY RUN. Prints, as `status:` lines, what the two files hold now (names and public addresses only), the public IPv4/IPv6 found, the firewall rules, the health of
#                        livekit and coturn and the number of active calls. Nothing is written or restarted.
#   Run 2 (APPLY=yes, set in this file by the reviewer, at a quiet hour): copies of both files in $B, the edits, ufw, then livekit and coturn are recreated (calls in progress drop: it refuses
#                        while a call is active unless FORCE=yes), both must be healthy, and LiveKit's own log must show the IPv4. Any failure: both files back, both recreated, exit 1.
# TURN over TLS on port 443 is NOT in this task: on this shared server 443 belongs to nginx (see docs/perf/CALLS_NETWORK.md for the two ways to give it its own address).
set -u
APPLY=""
FORCE=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
ENVF=$D/.env.production
LK=$D/livekit/livekit.yaml
TC=$D/coturn/turnserver.rendered.conf
CALL_WINDOW_MIN=${CALL_WINDOW_MIN:-180}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
FILES="-f $D/docker-compose.production.yml"
[ -f "$D/docker-compose.release.yml" ] && FILES="$FILES -f $D/docker-compose.release.yml"
COMPOSE="$DK compose $FILES --project-directory $D --env-file $ENVF"
echo "## calls-network"

say() { echo "status: calls-network: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "${OPS_WAIT_TRIES:-36}"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 health=$s"; return 1; }
is_v4() { printf '%s' "$1" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$' && ! printf '%s' "$1" | grep -Eq '^(10\.|127\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.|203\.0\.113\.)'; }
mongo_eval() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tail -1 | tr -d '\r'; }
active_calls() { mongo_eval "db.getSiblingDB(process.env.DB_NAME || 'nabd_nestjs').callsessions.countDocuments({status:'ACTIVE', updatedAt:{\$gte:new Date(Date.now()-${CALL_WINDOW_MIN}*60000)}})"; }
# the lines of a file that are about addresses and ports (never the keys: livekit.yaml's `keys:` block is not matched)
lk_state() { sudo -n grep -E '^[[:space:]]*(node_ip|use_external_ip|udp_port|tcp_port|port_range_start|port_range_end):' "$LK" 2>/dev/null | sed 's/^[[:space:]]*//' | tr '\n' ' '; }
tc_state() { sudo -n grep -E '^external-ip=' "$TC" 2>/dev/null | tr '\n' ' '; }

# --- 0. pre-checks and what is there now
sudo -n test -r "$LK" || { say "ABORT $LK is not readable"; exit 1; }
sudo -n test -r "$TC" || { say "ABORT $TC is not readable"; exit 1; }
for c in nabdah-livekit nabdah-coturn; do [ "$(health $c)" = healthy ] || { say "ABORT $c is not healthy ($(health $c))"; exit 1; }; done
V4=${OPS_PUBLIC_IPV4:-$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || curl -4 -fsS --max-time 10 https://ifconfig.me 2>/dev/null)}
V6=${OPS_PUBLIC_IPV6-$(curl -6 -fsS --max-time 8 https://api64.ipify.org 2>/dev/null || true)}
is_v4 "$V4" || { say "ABORT no public IPv4 found (got '${V4:-nothing}')"; exit 1; }
printf '%s' "$V6" | grep -q ':' || V6=""
say "public IPv4=$V4 IPv6=${V6:-none}"
say "livekit.yaml now: $(lk_state)"
say "coturn now: $(tc_state)"
sudo -n grep -q 'external-ip=203.0.113.1' "$TC" 2>/dev/null && { say "ABORT the coturn file still has the documentation placeholder"; exit 1; }
for rule in '7881/tcp' '7882/udp'; do say "ufw $rule: $(sudo -n ufw status 2>/dev/null | grep -c "^$rule ") rule(s)"; done
CALLS=$(active_calls); say "active calls (window ${CALL_WINDOW_MIN} min): ${CALLS:-unknown}"
NEED=""
sudo -n grep -qE '^[[:space:]]*node_ip:' "$LK" && NEED="$NEED livekit.node_ip"
sudo -n grep -qE '^[[:space:]]*use_external_ip:[[:space:]]*true' "$LK" || NEED="$NEED livekit.use_external_ip"
sudo -n grep -qE '^[[:space:]]*udp_port:[[:space:]]*7882' "$LK" || NEED="$NEED livekit.udp_port"
sudo -n grep -qE '^[[:space:]]*port_range_(start|end):' "$LK" && NEED="$NEED livekit.port_range"
[ "$(sudo -n grep -E '^external-ip=' "$TC" | head -1)" = "external-ip=$V4" ] || NEED="$NEED coturn.external-ip"
say "to change:${NEED:- nothing}"
if [ "$APPLY" != yes ]; then say "dry run only: nothing was written or restarted. To apply, set APPLY=yes in this task (a quiet hour: calls in progress drop)"; exit 0; fi
if [ -z "$NEED" ]; then say "nothing to change"; exit 0; fi
if [ "${CALLS:-x}" != 0 ] && [ "$FORCE" != yes ]; then say "ABORT active calls=${CALLS:-unknown}: run at a quiet time, or set FORCE=yes"; exit 1; fi

# --- 1. copies, then the edits (on temp copies first, installed only when they check out)
sudo -n mkdir -p "$B"
sudo -n cp -p "$LK" "$B/livekit.yaml.pre-calls-network.$TS" && sudo -n cp -p "$TC" "$B/turnserver.rendered.conf.pre-calls-network.$TS" || { say "ABORT cannot save the copies"; exit 1; }
restore() {
  say "FAILED at '$1', putting the files back"
  sudo -n sh -c "cat '$B/livekit.yaml.pre-calls-network.$TS' > '$LK'"
  sudo -n sh -c "cat '$B/turnserver.rendered.conf.pre-calls-network.$TS' > '$TC'"
  $COMPOSE up -d --no-deps --force-recreate livekit >/dev/null 2>&1; $COMPOSE up -d --no-deps --force-recreate coturn >/dev/null 2>&1
  if wait_healthy nabdah-livekit && wait_healthy nabdah-coturn; then say "rollback complete: both files back, livekit and coturn healthy"; else say "ROLLBACK INCOMPLETE - needs attention (copies in $B, *.pre-calls-network.$TS)"; fi
  exit 1
}
TL=$(mktemp); TT=$(mktemp)
sudo -n cat "$LK" > "$TL"; sudo -n cat "$TC" > "$TT"
sed -i -E '/^[[:space:]]*(node_ip|port_range_start|port_range_end):/d' "$TL"
grep -qE '^[[:space:]]*use_external_ip:' "$TL" && sed -i -E 's/^([[:space:]]*)use_external_ip:.*/\1use_external_ip: true/' "$TL" || sed -i -E 's/^rtc:[[:space:]]*$/rtc:\n  use_external_ip: true/' "$TL"
grep -qE '^[[:space:]]*udp_port:' "$TL" && sed -i -E 's/^([[:space:]]*)udp_port:.*/\1udp_port: 7882/' "$TL" || sed -i -E 's/^rtc:[[:space:]]*$/rtc:\n  udp_port: 7882/' "$TL"
sed -i -E '/^external-ip=/d' "$TT"
if grep -q '^realm=' "$TT"; then sed -i -E "s|^realm=(.*)|realm=\1\nexternal-ip=$V4${V6:+\\nexternal-ip=$V6}|" "$TT"; else printf 'external-ip=%s\n' "$V4" >> "$TT"; [ -n "$V6" ] && printf 'external-ip=%s\n' "$V6" >> "$TT"; fi
keys_before=$(sudo -n awk '/^keys:/{f=1;next} f&&/^  [^ ]/{n++} f&&!/^  /{f=0} END{print n+0}' "$LK"); keys_after=$(awk '/^keys:/{f=1;next} f&&/^  [^ ]/{n++} f&&!/^  /{f=0} END{print n+0}' "$TL")
if [ "$keys_before" = "$keys_after" ] && [ -s "$TL" ] && ! grep -qE '^[[:space:]]*node_ip:' "$TL" && grep -qE '^[[:space:]]*use_external_ip:[[:space:]]*true' "$TL" && grep -qE '^[[:space:]]*udp_port:[[:space:]]*7882' "$TL" \
   && [ "$(grep -c '^external-ip=' "$TT")" -ge 1 ] && [ "$(grep -m1 '^external-ip=' "$TT")" = "external-ip=$V4" ] && [ "$(sudo -n grep -vcE '^external-ip=' "$TC")" = "$(grep -vcE '^external-ip=' "$TT")" ]; then
  sudo -n sh -c "cat '$TL' > '$LK'"; sudo -n sh -c "cat '$TT' > '$TC'"; rm -f "$TL" "$TT"
else
  rm -f "$TL" "$TT"; restore "file edit check (keys $keys_before -> $keys_after)"
fi
say "files edited: livekit.yaml now: $(lk_state); coturn now: $(tc_state)"

# --- 2. firewall (idempotent)
for rule in 7881/tcp 7882/udp; do sudo -n ufw allow "$rule" >/dev/null 2>&1 || restore "ufw allow $rule"; done
say "ufw: 7881/tcp and 7882/udp allowed"

# --- 3. recreate livekit, then coturn
$COMPOSE up -d --no-deps --force-recreate livekit >/dev/null 2>&1 || restore "livekit recreate"
wait_healthy nabdah-livekit || restore "livekit health"
$COMPOSE up -d --no-deps --force-recreate coturn >/dev/null 2>&1 || restore "coturn recreate"
wait_healthy nabdah-coturn || restore "coturn health"
sleep "${OPS_WAIT_SLEEP:-5}"
# LiveKit's own log names the address it advertises: the IPv4 must be there
if $DK logs nabdah-livekit 2>&1 | grep -q "$V4"; then say "livekit advertises the IPv4 ($V4)"; else restore "livekit does not log the IPv4"; fi
say "applied: livekit and coturn healthy; IPv4-only clients now have a candidate (mux UDP 7882, TCP 7881)"
exit 0
