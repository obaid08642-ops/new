"""deploy/docker-compose.staging.yml: the rules of docs/platform/R6-staging-stack.md, checked statically (no docker needed)."""
import os
import re
import unittest

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "..", "..", "..", "deploy", "docker-compose.staging.yml")
OFF = {"clamav", "fastapi", "admin-web", "livekit", "coturn", "certbot"}


def mb(v):
    m = re.fullmatch(r"(\d+)([mg])", str(v))
    return int(m.group(1)) * (1024 if m.group(2) == "g" else 1)


class _Loader(yaml.SafeLoader):
    pass


_Loader.add_multi_constructor("!", lambda loader, suffix, node: loader.construct_sequence(node) if isinstance(node, yaml.SequenceNode) else loader.construct_scalar(node))


class StagingOverride(unittest.TestCase):
    def setUp(self):
        self.text = open(PATH).read()
        self.doc = yaml.load(self.text, Loader=_Loader)
        self.svc = self.doc["services"]

    def test_own_project_name(self):
        self.assertEqual(self.doc["name"], "nabdah-staging")

    def test_heavy_services_are_off_by_profile(self):
        self.assertEqual({k for k, v in self.svc.items() if v.get("profiles") == ["off"]}, OFF)

    def test_memory_sum_fits_a_4gb_vps(self):
        total = sum(mb(v["mem_limit"]) for k, v in self.svc.items() if k not in OFF and "mem_limit" in v)
        self.assertLessEqual(total, 3000, total)

    def test_no_production_env_file_and_no_published_ports(self):
        code = "\n".join(l for l in self.text.splitlines() if not l.lstrip().startswith("#"))
        self.assertNotIn(".env.production", code)
        for v in self.svc.values():
            self.assertNotIn("ports", v)
        for k in ("backend", "worker"):
            self.assertEqual(self.svc[k]["env_file"], [".env.staging"])

    def test_nginx_does_not_wait_for_off_services(self):
        self.assertEqual(self.svc["nginx"]["depends_on"], ["backend"])


if __name__ == "__main__":
    unittest.main()
