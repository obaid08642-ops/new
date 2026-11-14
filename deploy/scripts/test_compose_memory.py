"""deploy/docker-compose.production.yml: the memory plan of the 3.8 GB host (owner decision 2026-10-30: no RAM upgrade, so it must fit).
Pins that every container has a limit, the sum of what they reserve fits the host, mongod and redis are the last to be killed and never swap,
the clamd scanner is the first, and every Node heap cap sits under its container limit."""
import os
import re
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
HOST_MB = 3800
OS_RESERVE_MB = 500          # kernel, docker, sshd, page cache the system needs
ON_DEMAND = {"clamav"}       # runs in a window only when memory is free (clamav-window.sh), not counted in the steady total
NO_LIMIT = {"certbot"}       # runs for seconds, twice a day


def mb(v):
    m = re.fullmatch(r"(\d+(?:\.\d+)?)([mg])b?", v.strip().lower())
    assert m, v
    return float(m.group(1)) * (1024 if m.group(2) == "g" else 1)


def services():
    text = open(os.path.join(ROOT, "docker-compose.production.yml")).read()
    body = text.split("\nservices:\n", 1)[1].split("\nvolumes:\n", 1)[0]
    out = {}
    parts = re.split(r"^  ([a-z][a-z0-9_-]*):[ \t]*$", body, flags=re.M)   # [before, name, block, name, block, ...]
    for name, block in zip(parts[1::2], parts[2::2]):
        def field(key):
            m = re.search(r"^    %s: (.+?)\s*(?:#.*)?$" % key, block, re.M)
            return m.group(1).strip() if m else None
        heap = re.search(r"NODE_OPTIONS: --max-old-space-size=(\d+)", block)
        out[name] = dict(limit=field("mem_limit"), reservation=field("mem_reservation"), swap=field("memswap_limit"),
                         adj=int(field("oom_score_adj")) if field("oom_score_adj") is not None else None, heap=int(heap.group(1)) if heap else None)
    return out


class ComposeMemory(unittest.TestCase):
    def test_every_container_has_a_limit_a_reservation_and_an_oom_priority(self):
        for name, s in services().items():
            if name in NO_LIMIT:
                continue
            self.assertIsNotNone(s["limit"], f"{name}: mem_limit")
            self.assertIsNotNone(s["reservation"], f"{name}: mem_reservation")
            self.assertIsNotNone(s["adj"], f"{name}: oom_score_adj")
            self.assertLessEqual(mb(s["reservation"]), mb(s["limit"]), name)

    def test_what_the_containers_reserve_fits_the_host(self):
        total = sum(mb(s["reservation"]) for n, s in services().items() if n not in NO_LIMIT | ON_DEMAND)
        self.assertLessEqual(total, HOST_MB - OS_RESERVE_MB - 700, f"reservations add up to {total:.0f} MB")

    def test_mongod_and_redis_are_killed_last_and_never_swap(self):
        sv = services()
        for name in ("mongodb", "redis"):
            self.assertLessEqual(sv[name]["adj"], -800, name)
            self.assertEqual(sv[name]["swap"], sv[name]["limit"], f"{name}: memswap_limit equals mem_limit (no swap)")
        others = [s["adj"] for n, s in sv.items() if n not in ("mongodb", "redis") and s["adj"] is not None]
        self.assertGreater(min(others), max(sv["mongodb"]["adj"], sv["redis"]["adj"]))

    def test_the_scanner_goes_first_then_the_workers_and_web(self):
        sv = services()
        self.assertEqual(max(s["adj"] for s in sv.values() if s["adj"] is not None), sv["clamav"]["adj"])
        for name in ("worker", "patient-web", "admin-web", "redis-cache", "meilisearch", "fastapi"):
            self.assertGreater(sv[name]["adj"], sv["backend"]["adj"], name)

    def test_a_node_heap_cap_leaves_room_in_its_container(self):
        for name, s in services().items():
            if s["heap"] is not None:
                self.assertLessEqual(s["heap"], 0.8 * mb(s["limit"]), name)
        for name in ("backend", "worker", "patient-web", "admin-web"):
            self.assertIsNotNone(services()[name]["heap"], f"{name}: --max-old-space-size")

    def test_mongo_and_redis_settings_fit_their_limits(self):
        sv = services()
        conf = open(os.path.join(ROOT, "mongo", "mongod.conf")).read()
        cache_mb = float(re.search(r"cacheSizeGB:\s*([\d.]+)", conf).group(1)) * 1024
        self.assertLessEqual(cache_mb + 400, mb(sv["mongodb"]["limit"]), "WiredTiger cache + 400 MB of connections, sorts and index builds")
        redis_conf = open(os.path.join(ROOT, "redis", "redis.conf")).read()
        redis_max = mb(re.search(r"^maxmemory\s+(\S+)", redis_conf, re.M).group(1))
        self.assertLessEqual(redis_max, 0.7 * mb(sv["redis"]["limit"]), "maxmemory leaves room for the AOF rewrite and snapshots")


if __name__ == "__main__":
    unittest.main()
