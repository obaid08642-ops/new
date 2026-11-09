"""tools/ops/tasks/93b-calls-ports.sh (read-only, fake ss/ufw/iptables/docker, real loopback sockets) and tools/ops/net-probe.py (real local TCP and STUN servers)."""
import os
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "93b-calls-ports.sh")
PROBE = os.path.join(HERE, "..", "net-probe.py")
WORKFLOW = os.path.join(HERE, "..", "..", "..", ".github", "workflows", "server-inspect.yml")


class Servers:
    """TCP listeners and a STUN responder on ephemeral loopback ports: `tcp_port` alone (LiveKit-like), and `turn_port` with TCP and UDP on the SAME number (coturn-like)."""
    def __init__(self):
        self.stop = False
        self.tcp = self.listener(); self.tcp_port = self.tcp.getsockname()[1]
        while True:
            self.turn_tcp = self.listener(); self.turn_port = self.turn_tcp.getsockname()[1]
            self.udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                self.udp.bind(("127.0.0.1", self.turn_port)); break
            except OSError:
                self.turn_tcp.close(); self.udp.close()
        self.udp_port = self.turn_port
        self.udp.settimeout(0.2)
        self.threads = [threading.Thread(target=self.serve, daemon=True)] + [threading.Thread(target=self.accept, args=(l,), daemon=True) for l in (self.tcp, self.turn_tcp)]
        for t in self.threads:
            t.start()

    def listener(self):
        while True:   # never inside the relay range 40000-49999 (see free_port)
            s = socket.socket(); s.bind(("127.0.0.1", 0))
            if not 40000 <= s.getsockname()[1] <= 49999:
                break
            s.close()
        s.listen(8); s.settimeout(0.2); return s

    def accept(self, lst):
        while not self.stop:
            try:
                c, _ = lst.accept(); c.close()
            except (socket.timeout, OSError):
                pass

    def serve(self):
        while not self.stop:
            try:
                data, addr = self.udp.recvfrom(2048)
            except (socket.timeout, OSError):
                continue
            if len(data) == 20 and struct.unpack("!H", data[:2])[0] == 1:
                self.udp.sendto(struct.pack("!HHI", 0x0101, 0, 0x2112A442) + data[8:20], addr)

    def close(self):
        self.stop = True
        for t in self.threads:
            t.join(1)
        for s in (self.tcp, self.turn_tcp, self.udp):
            s.close()


def free_port():
    # never inside the coturn relay range 40000-49999: the fixture's ufw has a range rule there, so a random port in it would match TWO rules and the
    # "ufw_allow_rules=1" assertions failed on about one run in five (CI, 2026-10-31)
    while True:
        s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close()
        if not 40000 <= p <= 49999:
            return p


class CallsPorts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        d = self.d = self.tmp.name
        self.bin = os.path.join(d, "bin"); self.deploy = os.path.join(d, "deploy"); os.makedirs(self.bin); os.makedirs(os.path.join(self.deploy, "coturn"))
        self.calls = os.path.join(d, "calls.log")
        with open(os.path.join(self.deploy, "coturn", "turnserver.rendered.conf"), "w") as f:
            f.write("realm=x\nmin-port=40000\nmax-port=49999\nstatic-auth-secret=do-not-print\n")
        self.srv = Servers(); self.addCleanup(self.srv.close)
        self.ports = dict(lk_tcp=self.srv.tcp_port, lk_udp=free_port(), turn=self.srv.turn_port, turns=free_port(), https=free_port(), http=free_port())
        self.listen = None
        self.ufw = "Status: active\n\nTo   Action   From\n7881/tcp ALLOW Anywhere\n7882/udp ALLOW Anywhere\n3478 ALLOW Anywhere\n5349/tcp ALLOW Anywhere\n443/tcp ALLOW Anywhere\n80/tcp ALLOW Anywhere\n40000:49999/udp ALLOW Anywhere\n"
        self.nat = "0 0 DNAT tcp -- !br0 * 0.0.0.0/0 0.0.0.0/0 tcp dpt:7881 to:172.18.0.9:7881\n0 0 DNAT udp -- !br0 * 0.0.0.0/0 0.0.0.0/0 udp dpt:7882 to:172.18.0.9:7882\n"
        self.pub = True

    def w(self, path, text):
        with open(path, "w") as f:
            f.write(text)

    def script(self, name, body):
        p = os.path.join(self.bin, name); self.w(p, body); os.chmod(p, 0o755)

    def run_task(self):
        P = self.ports
        listen = self.listen if self.listen is not None else (
            f"LISTEN 0 4096 0.0.0.0:{P['lk_tcp']} 0.0.0.0:*\nLISTEN 0 4096 [::]:{P['turns']} [::]:*\nLISTEN 0 4096 0.0.0.0:{P['https']} 0.0.0.0:*\nLISTEN 0 4096 0.0.0.0:{P['http']} 0.0.0.0:*\n")
        listen_u = f"UNCONN 0 0 0.0.0.0:{P['lk_udp']} 0.0.0.0:*\nUNCONN 0 0 0.0.0.0:{P['turn']} 0.0.0.0:*\n"
        self.script("sudo", '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        self.script("ss", f'#!/bin/bash\necho "ss $*" >> "{self.calls}"\ncase "$*" in *-ltn*) cat <<E\n{listen}E\n;; *-lun*) cat <<E\n{listen_u}E\n;; esac\n')
        self.script("ufw", f'#!/bin/bash\necho "ufw $*" >> "{self.calls}"\ncat <<E\n{self.ufw}E\n')
        self.script("iptables", f'#!/bin/bash\necho "iptables $*" >> "{self.calls}"\ncat <<E\nChain DOCKER (2 references)\n    pkts bytes target prot opt in out source destination\n{self.nat}E\n')
        self.script("docker", f'#!/bin/bash\necho "docker $*" >> "{self.calls}"\n' + (f'[ "$1" = port ] && echo "0.0.0.0:${{3%%/*}}"\n' if self.pub else '') + 'exit 0\n')
        env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", OPS_DEPLOY_DIR=self.deploy, OPS_PORT_LK_TCP=str(P["lk_tcp"]), OPS_PORT_LK_UDP=str(P["lk_udp"]),
                   OPS_PORT_TURN=str(P["turn"]), OPS_PORT_TURNS=str(P["turns"]), OPS_PORT_HTTPS=str(P["https"]), OPS_PORT_HTTP=str(P["http"]))
        return subprocess.run(["bash", TASK], capture_output=True, text=True, env=env, timeout=60)

    def test_everything_open_reports_no_warning_and_each_port_with_its_rule_and_counter(self):
        P = self.ports
        self.ufw = self.ufw.replace("7881/tcp", f"{P['lk_tcp']}/tcp").replace("7882/udp", f"{P['lk_udp']}/udp").replace("3478 ", f"{P['turn']} ").replace("5349/tcp", f"{P['turns']}/tcp").replace("443/tcp", f"{P['https']}/tcp").replace("80/tcp", f"{P['http']}/tcp")
        self.nat = self.nat.replace("dpt:7881", f"dpt:{P['lk_tcp']}").replace("dpt:7882", f"dpt:{P['lk_udp']}").replace("0 0 DNAT tcp", "1234 99000 DNAT tcp")
        r = self.run_task(); out = r.stdout
        self.assertEqual(r.returncode, 0, out + r.stderr)
        self.assertIn("ufw: active", out)
        self.assertRegex(out, rf"tcp/{P['lk_tcp']} LiveKit RTC over TCP: listening=all ufw_allow_rules=1 docker_nat_packets_since_boot=1234")
        self.assertRegex(out, rf"udp/{P['lk_udp']} LiveKit ICE mux: listening=all ufw_allow_rules=1 docker_nat_packets_since_boot=0")
        self.assertIn("coturn relay range 40000-49999/udp: ufw_allow_rules=1", out)
        self.assertIn(f"loopback probe tcp/{P['lk_tcp']}: ok", out)
        self.assertIn(f"loopback probe udp/{P['turn']} STUN: ok", out)
        self.assertIn(f"loopback probe tcp/{P['turns']}: fail", out)           # nothing listens there in this fixture: reported, not hidden
        self.assertIn("not probed (it answers ICE checks of a known session only)", out)
        self.assertIn("reachability from the internet is NOT proved here", out)
        self.assertIn("livekit publishes 7881/tcp: all interfaces ; 7882/udp: all interfaces", out)

    def test_a_port_that_does_not_listen_or_listens_on_loopback_only_is_a_warning(self):
        P = self.ports
        self.listen = f"LISTEN 0 4096 127.0.0.1:{P['lk_tcp']} 0.0.0.0:*\n"
        out = self.run_task().stdout
        self.assertIn(f"WARNING tcp/{P['lk_tcp']} listens on loopback only", out)
        self.assertIn(f"WARNING tcp/{P['https']} is not listening on this host", out)

    def test_without_ufw_it_says_the_provider_firewall_and_docker_decide_and_no_rule_count_is_invented(self):
        self.ufw = "Status: inactive\n"
        out = self.run_task().stdout
        self.assertIn("ufw: not active or not readable", out)
        self.assertIn("ufw_allow_rules=n/a", out)

    def test_a_missing_nat_rule_is_not_counted_as_zero_and_an_unpublished_port_is_visible(self):
        self.nat = ""; self.pub = False
        out = self.run_task().stdout
        self.assertIn("docker_nat_packets_since_boot=n/a", out)
        self.assertRegex(out, r"livekit publishes 7881/tcp:  ; 7882/udp:  \(empty = not published\)")

    def test_it_only_reads_and_prints_no_secret_and_only_status_lines(self):
        r = self.run_task()
        calls = open(self.calls).read().splitlines()
        for c in calls:
            self.assertRegex(c, r"^(ss -H -l[tu]n|ufw status|iptables -t nat -nvxL DOCKER|docker port nabdah-livekit \d+/(tcp|udp))$", c)
        self.assertNotIn("do-not-print", r.stdout + r.stderr)
        for line in r.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)


class NetProbe(unittest.TestCase):
    def run_probe(self, ports, host="127.0.0.1"):
        env = dict(os.environ, NET_PROBE_PORTS=ports)
        return subprocess.run([sys.executable, PROBE, host, "--timeout", "1"], capture_output=True, text=True, env=env, timeout=30)

    def test_ok_for_an_open_tcp_port_and_a_stun_responder_and_always_says_7882_is_not_probed(self):
        s = Servers(); self.addCleanup(s.close)
        r = self.run_probe(f"tcp:{s.tcp_port},udp:{s.udp_port}")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn(f"tcp/{s.tcp_port}: ok", r.stdout)
        self.assertIn(f"udp/{s.udp_port}: ok", r.stdout)
        self.assertIn("udp/7882 LiveKit ICE mux: not probed", r.stdout)
        self.assertIn("all probed ports answer", r.stdout)

    def test_fail_and_exit_1_for_a_closed_port_and_a_silent_udp_port(self):
        silent = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); silent.bind(("127.0.0.1", 0)); self.addCleanup(silent.close)
        r = self.run_probe(f"tcp:{free_port()},udp:{silent.getsockname()[1]}")
        self.assertEqual(r.returncode, 1)
        self.assertEqual(r.stdout.count(": fail"), 2)
        self.assertIn("2 probed port(s) did not answer", r.stdout)

    def test_it_prints_no_address_and_only_status_lines(self):
        s = Servers(); self.addCleanup(s.close)
        r = self.run_probe(f"tcp:{s.tcp_port}")
        self.assertNotIn("127.0.0.1", r.stdout)
        for line in r.stdout.splitlines():
            self.assertTrue(line.startswith("status: net-probe: "), line)

    def test_usage_error(self):
        r = subprocess.run([sys.executable, PROBE], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


class WorkflowProbe(unittest.TestCase):
    def test_the_probe_step_runs_only_when_listed_and_reads_no_secret_but_the_host(self):
        import yaml
        wf = yaml.safe_load(open(WORKFLOW))
        step = next(s for s in wf["jobs"]["ops"]["steps"] if str(s.get("name", "")).startswith("External port probe"))
        self.assertEqual(step["env"], {"H": "${{ secrets.DEPLOY_HOST }}"})
        self.assertIn("net-probe", step["run"])
        self.assertIn("python3 tools/ops/net-probe.py", step["run"])


if __name__ == "__main__":
    unittest.main()
