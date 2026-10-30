"""The committed calls configuration: the server must advertise an IPv4 address (owner 2026-10-30: IPv4-only clients could not join a call)."""
import os
import re
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")


def read(*parts):
    with open(os.path.join(ROOT, *parts)) as f:
        return f.read()


class CallsConfig(unittest.TestCase):
    def test_livekit_has_no_fixed_node_ip_and_discovers_the_ipv4(self):
        y = read("deploy", "livekit", "livekit.yaml")
        code = "\n".join(l for l in y.splitlines() if not l.strip().startswith("#"))
        self.assertNotRegex(code, r"(?m)^\s*node_ip:")                         # a fixed node_ip was the IPv6 address
        self.assertRegex(code, r"(?m)^\s*use_external_ip:\s*true")
        self.assertRegex(code, r"(?m)^\s*tcp_port:\s*7881")                    # the TCP fallback
        self.assertRegex(code, r"(?m)^\s*udp_port:\s*7882")                    # one mux port
        self.assertNotRegex(code, r"port_range")

    def test_compose_publishes_exactly_the_ports_livekit_listens_on(self):
        c = read("deploy", "docker-compose.production.yml")
        block = c[c.index("  livekit:"):c.index("  # ── Coturn")]
        ports = re.findall(r'^\s*-\s*"([^"]+)"', block, flags=re.M)
        self.assertIn("7881:7881", ports)
        self.assertIn("7882:7882/udp", ports)
        self.assertFalse([p for p in ports if "50000" in p])                   # no 100-port range any more

    def test_the_firewall_script_opens_the_same_ports(self):
        s = read("deploy", "setup-server.sh")
        self.assertIn("ufw allow 7881/tcp", s)
        self.assertIn("ufw allow 7882/udp", s)
        self.assertNotIn("50000:50100", s)

    def test_coturn_template_leads_with_a_documentation_ipv4_that_deploy_replaces(self):
        t = read("deploy", "coturn", "turnserver.conf")
        lines = [l for l in t.splitlines() if l.startswith("external-ip=")]
        self.assertEqual(lines, ["external-ip=203.0.113.1"])                   # never an IPv6 literal as the only address

    def test_deploy_finds_the_public_ipv4_explicitly(self):
        d = read("deploy", "scripts", "deploy.sh")
        self.assertRegex(d, r"EXTERNAL_IP=\$\(curl -4 ")                       # plain `curl ifconfig.me` answers the IPv6 address on a dual-stack host
        self.assertNotRegex(d, r"EXTERNAL_IP=\$\(curl -fsSL")
        self.assertIn("/^  node_ip: /d", d)                                    # and never writes a node_ip into livekit.yaml again


if __name__ == "__main__":
    unittest.main()
