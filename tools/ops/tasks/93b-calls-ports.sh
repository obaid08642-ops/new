#!/bin/bash
# Calls ports, READ-ONLY (owner 2026-10-31, after the network task 93-calls-network): which of the TCP and UDP ports calls need are really open on this server. One run, nothing is
# written, restarted or opened. Prints `status:` lines only: port numbers, ok/fail and counts: no address, no payload.
#   expected: 7881/tcp (LiveKit RTC over TCP), 7882/udp (LiveKit ICE mux), 3478 tcp+udp (coturn), 5349/tcp (coturn TURN over TLS), the coturn relay range (min-port..max-port of its
#             rendered config, udp), 443/tcp and 80/tcp (nginx: wss for LiveKit, the API)
#   per port: listening or not and on which kind of address (all interfaces / loopback only), the ufw rule that covers it, and for the ports Docker publishes (7881, 7882) the packets its NAT
#             rule has counted since boot (non-zero = traffic from outside really arrived there; zero = nothing did, or the packets never got here)
#   probe from this server (loopback): a TCP connect to each tcp port and a STUN binding request to 3478/udp (coturn answers any). 7882/udp is NOT probed: LiveKit's mux answers the ICE checks of a
#   known session only, so a bare request cannot tell open from closed.
# What this CANNOT prove: reachability from the internet. A ufw rule does not govern Docker-published ports (Docker's own iptables rules come first), and the host's provider may filter
# ports in front of the server. The proof from outside is tools/ops/net-probe.py (run it from the CI runner or any other host) for the tcp ports and 3478/udp, and a real call (or the
# TURN-relay-only CI check) for 7882/udp.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
TC=$D/coturn/turnserver.rendered.conf
P_LK_TCP=${OPS_PORT_LK_TCP:-7881}; P_LK_UDP=${OPS_PORT_LK_UDP:-7882}; P_TURN=${OPS_PORT_TURN:-3478}; P_TURNS=${OPS_PORT_TURNS:-5349}; P_HTTPS=${OPS_PORT_HTTPS:-443}; P_HTTP=${OPS_PORT_HTTP:-80}
DK="sudo -n docker"
echo "## calls-ports"
say() { echo "status: calls-ports: $*"; }

UFW=$(sudo -n ufw status 2>/dev/null)
if printf '%s' "$UFW" | grep -qi '^Status: active'; then UFW_ON=yes; else UFW_ON=no; fi
say "ufw: $([ $UFW_ON = yes ] && echo active || echo 'not active or not readable (then the provider firewall and Docker rules decide)')"
SOCK_T=$(sudo -n ss -H -ltn 2>/dev/null); SOCK_U=$(sudo -n ss -H -lun 2>/dev/null)

listen_kind() {   # listen_kind <tcp|udp> <port>: none | all | loopback | other
  local list addr kinds=""
  [ "$1" = tcp ] && list=$SOCK_T || list=$SOCK_U
  while read -r addr; do
    case "$addr" in "0.0.0.0:$2"|"*:$2"|"[::]:$2"|":::$2") kinds="$kinds all";; "127."*":$2"|"[::1]:$2") kinds="$kinds loopback";; *":$2") kinds="$kinds other";; esac
  done < <(printf '%s\n' "$list" | awk '{print $4}')
  case "$kinds" in *all*) echo all;; *other*) echo other;; *loopback*) echo loopback;; *) echo none;; esac
}
ufw_rule() {   # ufw_rule <tcp|udp> <port or lo:hi>: the number of ufw ALLOW rules that cover it
  [ $UFW_ON = yes ] || { echo "n/a"; return; }
  printf '%s\n' "$UFW" | awk -v proto="$1" -v port="$2" '
    /ALLOW/ { split($1, a, "/"); p = a[1]; pr = a[2];
      if (pr != "" && pr != proto) next
      if (p == port) n++; else if (index(p, ":") && index(port, ":") == 0) { split(p, r, ":"); if (port + 0 >= r[1] + 0 && port + 0 <= r[2] + 0) n++ } }
    END { print n + 0 }' | sort -u | head -1
}
nat_packets() {   # nat_packets <tcp|udp> <port>: packets counted by Docker's DNAT rule, "n/a" when there is none
  local n
  n=$(sudo -n iptables -t nat -nvxL DOCKER 2>/dev/null | awk -v proto="$1" -v dpt="dpt:$2" '$0 ~ proto && $0 ~ dpt && $0 ~ /DNAT/ {s += $1; f = 1} END {if (f) print s; else print "n/a"}')
  echo "${n:-n/a}"
}

check_port() {   # check_port <proto> <port> <what> [docker]
  local proto=$1 port=$2 what=$3 k u line
  k=$(listen_kind "$proto" "$port"); u=$(ufw_rule "$proto" "$port")
  line="$proto/$port $what: listening=$k ufw_allow_rules=$u"
  [ "${4:-}" = docker ] && line="$line docker_nat_packets_since_boot=$(nat_packets "$proto" "$port")"
  say "$line"
  [ "$k" = none ] && say "WARNING $proto/$port is not listening on this host"
  [ "$k" = loopback ] && say "WARNING $proto/$port listens on loopback only: the outside cannot reach it"
  return 0
}
# docker publishes 7881 and 7882 through NAT: `ss` may show docker-proxy (or nothing, with the userland proxy off); the published mapping is the evidence then
pub() { $DK port nabdah-livekit "$1" 2>/dev/null | head -1 | sed -E 's/:[0-9]+$//' | sed -E 's/^(0\.0\.0\.0|\[::\])$/all interfaces/'; }
say "livekit publishes 7881/tcp: ${P1:=$(pub "$P_LK_TCP/tcp")} ; 7882/udp: ${P2:=$(pub "$P_LK_UDP/udp")} (empty = not published)"
check_port tcp "$P_LK_TCP" "LiveKit RTC over TCP" docker
check_port udp "$P_LK_UDP" "LiveKit ICE mux" docker
check_port tcp "$P_TURN" "coturn"
check_port udp "$P_TURN" "coturn"
check_port tcp "$P_TURNS" "coturn TURN over TLS"
check_port tcp "$P_HTTPS" "nginx (wss for LiveKit, the API)"
check_port tcp "$P_HTTP" "nginx"
MIN=$(sudo -n grep -m1 '^min-port=' "$TC" 2>/dev/null | cut -d= -f2); MAX=$(sudo -n grep -m1 '^max-port=' "$TC" 2>/dev/null | cut -d= -f2)
if [ -n "$MIN" ] && [ -n "$MAX" ]; then say "coturn relay range $MIN-$MAX/udp: ufw_allow_rules=$(ufw_rule udp "$MIN:$MAX")  (a relay needs this range open to the outside)"; else say "coturn relay range: not found in the rendered config"; fi

# loopback probe: the server's own services answer
PROBE=$(python3 - "$P_LK_TCP" "$P_TURN" "$P_TURNS" "$P_HTTPS" "$P_TURN" <<'PY' 2>/dev/null
import os, socket, struct, sys
lk, turn, turns, https, turn_udp = (int(x) for x in sys.argv[1:6])
def tcp(p):
    try:
        socket.create_connection(("127.0.0.1", p), timeout=3).close(); return "ok"
    except OSError:
        return "fail"
def stun(p):
    tx = os.urandom(12); req = struct.pack("!HHI", 1, 0, 0x2112A442) + tx
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(3)
    try:
        for _ in range(2):
            s.sendto(req, ("127.0.0.1", p))
            try:
                d, _ = s.recvfrom(2048)
            except socket.timeout:
                continue
            if len(d) >= 20 and struct.unpack("!H", d[:2])[0] == 0x0101 and d[8:20] == tx: return "ok"
        return "fail"
    except OSError:
        return "fail"
for name, port in (("tcp", lk), ("tcp", turn), ("tcp", turns), ("tcp", https)):
    print(f"tcp/{port}: {tcp(port)}")
print(f"udp/{turn_udp} STUN: {stun(turn_udp)}")
PY
)
if [ -n "$PROBE" ]; then printf '%s\n' "$PROBE" | while read -r l; do say "loopback probe $l"; done; else say "loopback probe: not run (python3 missing on the host)"; fi
say "udp/$P_LK_UDP LiveKit ICE mux: not probed (it answers ICE checks of a known session only); the packet counter above is the evidence from this host"
say "reachability from the internet is NOT proved here: run tools/ops/net-probe.py from another host (the workflow step 'net-probe') and, for 7882/udp, a real call"
