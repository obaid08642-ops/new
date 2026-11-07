"""R4: deploy/docker-compose.scale-api.yml (a 2nd API replica) and the nginx upstream that balances over it."""
import os
import re
import unittest

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def load(rel):
    with open(os.path.join(ROOT, rel)) as fh:
        return fh.read()


class ScaleApiOverlay(unittest.TestCase):
    def setUp(self):
        self.base = yaml.safe_load(load("deploy/docker-compose.production.yml"))["services"]
        self.overlay = yaml.safe_load(load("deploy/docker-compose.scale-api.yml"))["services"]
        self.nginx = load("deploy/nginx/nginx.conf")

    def test_the_replica_is_the_backend_service_under_another_container_name(self):
        r = self.overlay["backend-2"]
        self.assertEqual(r["extends"], {"file": "docker-compose.production.yml", "service": "backend"})
        self.assertNotEqual(r["container_name"], self.base["backend"]["container_name"])

    def test_both_replicas_answer_to_the_backend_dns_name_on_every_network_nginx_or_the_worker_uses(self):
        for net in self.base["backend"]["networks"]:
            self.assertIn("backend", self.overlay["backend-2"]["networks"][net]["aliases"], net)

    def test_a_replica_does_not_publish_host_ports_or_run_background_work(self):
        self.assertNotIn("ports", self.base["backend"])          # a published port would clash between replicas
        self.assertEqual(self.base["backend"]["environment"]["PROCESS_ROLE"], "api")   # inherited: cron/queues stay in the single worker
        self.assertNotIn("environment", self.overlay["backend-2"])                      # nothing overrides it

    def test_nginx_balances_over_the_resolved_addresses_and_skips_a_failing_replica(self):
        m = re.search(r"upstream backend_pool \{(.*?)\n  \}", self.nginx, re.S)
        self.assertIsNotNone(m)
        self.assertRegex(m.group(1), r"server backend:8002 resolve max_fails=2 fail_timeout=5s;")
        self.assertIn("zone backend_pool", m.group(1))           # `resolve` needs a shared zone
        self.assertNotIn("ip_hash", m.group(1))                  # clients use websocket only: no stickiness needed
        self.assertNotRegex(self.nginx, r"proxy_next_upstream[^;]*non_idempotent")         # a POST must never be retried on another replica


if __name__ == "__main__":
    unittest.main()
