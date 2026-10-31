#!/usr/bin/env python3
"""Reachability of the calls ports from OUTSIDE the server (run it from the CI runner or any other host). Read-only: it opens a connection or sends one STUN request per port.
  python3 tools/ops/net-probe.py <host> [--timeout 5]
Prints one `status: net-probe: <proto>/<port> <name>: ok|fail` line per check; exit 1 when a check fails.
  tcp 7881  LiveKit RTC over TCP         connect
  tcp 3478  coturn                       connect
  tcp 5349  coturn TURN over TLS         connect
  tcp 443   nginx (wss for LiveKit, API) connect
  udp 3478  coturn                       STUN binding request answered
  udp 7882  LiveKit ICE mux              NOT probed: LiveKit answers ICE checks of a known session only, so a bare request cannot tell open from closed.
                                         This line says so; the proof for 7882/udp is a call (or the TURN-relay-only CI check), not this probe.
Ports can be changed with NET_PROBE_PORTS (e.g. "tcp:7881,udp:3478") for the tests. Only ok/fail is printed: no address, no payload."""
import os
import socket
import struct
import sys

DEFAULT = [("tcp", 7881, "LiveKit RTC over TCP"), ("tcp", 3478, "coturn"), ("tcp", 5349, "coturn TURN over TLS"), ("tcp", 443, "nginx"), ("udp", 3478, "coturn STUN")]
MAGIC = 0x2112A442


def stun_request():
    txid = os.urandom(12)
    return txid, struct.pack("!HHI", 0x0001, 0, MAGIC) + txid


def check_tcp(host, port, timeout):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def check_stun(host, port, timeout):
    txid, req = stun_request()
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_DGRAM)
        fam, typ, proto, _, addr = infos[0]
        s = socket.socket(fam, typ, proto); s.settimeout(timeout)
        for _ in range(2):                       # UDP: one retry
            s.sendto(req, addr)
            try:
                data, _ = s.recvfrom(2048)
            except socket.timeout:
                continue
            if len(data) >= 20 and struct.unpack("!H", data[:2])[0] == 0x0101 and data[8:20] == txid:
                return True
        return False
    except OSError:
        return False
    finally:
        try:
            s.close()
        except Exception:
            pass


def main(argv):
    if not argv or argv[0].startswith("-"):
        print("usage: net-probe.py <host> [--timeout N]", file=sys.stderr); return 2
    host = argv[0]
    timeout = float(argv[argv.index("--timeout") + 1]) if "--timeout" in argv else 5.0
    checks = DEFAULT
    if os.environ.get("NET_PROBE_PORTS"):
        checks = [(p.split(":")[0], int(p.split(":")[1]), "") for p in os.environ["NET_PROBE_PORTS"].split(",")]
    failed = 0
    for proto, port, name in checks:
        ok = check_tcp(host, port, timeout) if proto == "tcp" else check_stun(host, port, timeout)
        failed += 0 if ok else 1
        print(f"status: net-probe: {proto}/{port} {name}: {'ok' if ok else 'fail'}".replace(" : ", ": "))
    print("status: net-probe: udp/7882 LiveKit ICE mux: not probed (it answers ICE checks of a known session only); proof is a call or the TURN-relay-only check")
    print(f"status: net-probe: {'all probed ports answer' if not failed else str(failed) + ' probed port(s) did not answer'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
