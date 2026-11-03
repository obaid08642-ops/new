"""R7: tools/ops/mongo_pool_budget.py - the committed pools fit mongod's connection limit; the old defaults and a second API replica without smaller pools do not."""
import copy
import importlib.util
import os
import unittest

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
spec = importlib.util.spec_from_file_location("mongo_pool_budget", os.path.join(ROOT, "tools", "ops", "mongo_pool_budget.py"))
mpb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mpb)


def load():
    with open(os.path.join(ROOT, "deploy", "docker-compose.production.yml")) as fh:
        compose = yaml.safe_load(fh)
    with open(os.path.join(ROOT, "deploy", "mongo", "mongod.conf")) as fh:
        conf = fh.read()
    return compose, conf


class PoolBudget(unittest.TestCase):
    def test_committed_pools_fit(self):
        compose, conf = load()
        limit, total, rows, problems = mpb.analyse(compose, conf)
        self.assertEqual(problems, [])
        self.assertLessEqual(total, limit)
        self.assertEqual({r[0] for r in rows} >= {"backend", "worker"}, True)

    def test_the_old_driver_default_did_not_fit(self):
        compose, conf = load()
        for s in ("backend", "worker"):
            compose["services"][s]["environment"].pop("MONGO_MAX_POOL_SIZE")
        _, total, _, problems = mpb.analyse(compose, conf)
        self.assertGreater(total, 300)
        self.assertTrue(problems)

    def test_a_second_api_replica_needs_smaller_pools(self):
        compose, conf = load()
        self.assertTrue(mpb.analyse(compose, conf, api_replicas=2)[3])
        compose["services"]["backend"]["environment"]["MONGO_MAX_POOL_SIZE"] = "40"
        self.assertEqual(mpb.analyse(compose, conf, api_replicas=2)[3], [])

    def test_a_client_we_cannot_read_counts_with_the_python_default(self):
        compose, conf = load()
        names = [n for n, s in compose["services"].items() if "MONGO_URL" in (s.get("environment") or {}) and n not in ("backend", "worker")]
        if names:
            _, _, rows, _ = mpb.analyse(compose, conf)
            self.assertEqual(dict((r[0], r[1]) for r in rows)[names[0]], mpb.UNKNOWN_CLIENT_POOL)

    def test_memory_ceiling(self):
        compose, conf = load()
        small = copy.deepcopy(compose)
        small["services"]["mongodb"]["mem_limit"] = "512m"
        self.assertTrue(any("% of the mongodb limit" in p for p in mpb.analyse(small, conf)[3]))


if __name__ == "__main__":
    unittest.main()
