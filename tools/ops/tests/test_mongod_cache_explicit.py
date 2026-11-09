"""The WiredTiger cache of mongod is set EXPLICITLY, in one place, and sized to fit the container limit (ops run 108: mongod hit its 1.6 GB cgroup limit 3755 times and is restarted).

Without cacheSizeGB mongod sizes its cache from the HOST's RAM (50 % of RAM minus 1 GB), not from the container limit: on a larger host it would grow past the limit and be killed. The value lives in
deploy/mongo/mongod.conf (read through `--config`); `tools/ops/mem_budget.py check` ties it to the host plan. This test pins the rest: compose must read that file, must not also pass the flag on
the command line (two sources of truth), and the cache plus the connections plus mongod's other memory must stay under 85 % of the limit.
"""
import os
import re
import unittest

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
DEPLOY = os.path.join(HERE, "..", "..", "..", "deploy")

# Measured/derived numbers behind the budget (docs/platform/R7-data-tier.md, "Host RAM is the ceiling"):
CONN_MB = 1          # each connection costs about 1 MB of stack and buffers (the comment in mongod.conf)
OTHER_MB = 350       # tcmalloc free page heap seen at 238 MB in run 81 (98n), plus index/hash/cursor structures and the oplog buffers
MARGIN = 0.85        # the container must keep 15 % free for page cache pressure and spikes


def mb(v):
    m = re.fullmatch(r"(\d+)([mg])", str(v))
    return int(m.group(1)) * (1024 if m.group(2) == "g" else 1)


class Cache(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(DEPLOY, "docker-compose.production.yml")) as f: self.svc = yaml.safe_load(f)["services"]["mongodb"]
        with open(os.path.join(DEPLOY, "mongo", "mongod.conf")) as f: self.conf = yaml.safe_load(f)

    def test_compose_reads_the_config_file_and_does_not_repeat_the_flag(self):
        self.assertEqual(self.svc["command"], ["mongod", "--config", "/etc/mongod.conf"])
        self.assertIn("./mongo/mongod.conf:/etc/mongod.conf:ro", self.svc["volumes"])
        self.assertNotIn("wiredTigerCacheSizeGB", " ".join(map(str, self.svc["command"])))

    def test_the_cache_is_explicit_and_a_sane_number(self):
        gb = self.conf["storage"]["wiredTiger"]["engineConfig"]["cacheSizeGB"]
        self.assertIsInstance(gb, (int, float))
        self.assertTrue(0.25 <= gb <= 1.0, gb)

    def test_cache_plus_connections_plus_overhead_fits_the_container_limit(self):
        gb = self.conf["storage"]["wiredTiger"]["engineConfig"]["cacheSizeGB"]
        conns = self.conf["net"]["maxIncomingConnections"]
        limit = mb(self.svc["mem_limit"])
        need = gb * 1024 + conns * CONN_MB + OTHER_MB
        self.assertLessEqual(need, MARGIN * limit, f"cache {gb} GB + {conns} connections + {OTHER_MB} MB = {need:.0f} MB > {MARGIN:.0%} of the {limit} MB limit")

    def test_the_container_cannot_swap_and_is_protected_from_the_host_oom_killer(self):
        self.assertEqual(mb(self.svc["memswap_limit"]), mb(self.svc["mem_limit"]))   # no swap: a swapped-out mongod is slower than a restart
        self.assertLessEqual(int(self.svc["oom_score_adj"]), -500)

    def test_a_cache_that_does_not_fit_would_fail(self):
        # the guard has teeth: 0.9 GB with the same connections and overhead is over the budget
        limit = mb(self.svc["mem_limit"]); conns = self.conf["net"]["maxIncomingConnections"]
        self.assertGreater(0.9 * 1024 + conns * CONN_MB + OTHER_MB, MARGIN * limit)


if __name__ == "__main__":
    unittest.main()
