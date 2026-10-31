"""docs/ops/MEMORY_BUDGET.md and deploy/docker-compose.production.yml say the same thing, and the numbers add up: the steady use + the largest one-off + the host fit in MemTotal."""
import os
import re
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
COMPOSE = open(os.path.join(ROOT, "deploy", "docker-compose.production.yml")).read()
DOC = open(os.path.join(ROOT, "docs", "ops", "MEMORY_BUDGET.md")).read()
APPLY = open(os.path.join(ROOT, "tools", "ops", "tasks", "90-catalogue-apply.sh")).read()
DUMP = open(os.path.join(ROOT, "deploy", "scripts", "_mongodump-oneoff.sh")).read()

MEMTOTAL_MB = 3800         # as in deploy/scripts/test_compose_memory.py
HOST_OWN_MB = 500          # its OS_RESERVE_MB: an assumption, see the doc
SWAP_FILE_MB = 2048
NEVER_SWAP = {"mongodb", "redis"}


def mb(v):
    m = re.fullmatch(r"(\d+)([mMgG])", v.strip())
    return int(m.group(1)) * (1024 if m.group(2).lower() == "g" else 1)


def services():
    out = {}
    for m in re.finditer(r"(?ms)^  ([a-z][a-z0-9-]*):\n(.*?)(?=^  [a-z][a-z0-9-]*:\n|^[a-z]|\Z)", COMPOSE):
        name, body = m.group(1), m.group(2)
        if "mem_limit:" not in body:
            continue
        def g(key):
            x = re.search(rf"(?m)^    {key}: *([^\s#]+)", body)
            return x.group(1) if x else None
        heap = re.search(r"--max-old-space-size=(\d+)", body)
        out[name] = dict(limit=mb(g("mem_limit")), res=mb(g("mem_reservation")), swap=mb(g("memswap_limit")) if g("memswap_limit") else None,
                         adj=int(g("oom_score_adj")) if g("oom_score_adj") is not None else None, heap=int(heap.group(1)) if heap else None)
    return out


class MemoryBudget(unittest.TestCase):
    def setUp(self):
        self.s = services()

    def test_every_service_has_a_limit_a_reservation_an_oom_score_and_an_explicit_swap_setting(self):
        self.assertGreaterEqual(len(self.s), 13)
        for name, v in self.s.items():
            self.assertIsNotNone(v["adj"], f"{name}: oom_score_adj")
            self.assertLessEqual(v["res"], v["limit"], name)
            self.assertIsNotNone(v["swap"], f"{name}: memswap_limit must be explicit (the default allows twice the limit in swap)")
            self.assertGreaterEqual(v["swap"], v["limit"], name)

    def test_databases_and_latency_services_are_off_swap_the_others_have_a_small_allowance_that_fits_the_swap_file(self):
        allowance = {n: v["swap"] - v["limit"] for n, v in self.s.items()}
        for n in NEVER_SWAP | {"redis-cache", "livekit", "coturn", "nginx", "clamav"}:
            self.assertEqual(allowance[n], 0, f"{n} must stay off swap")
        self.assertLessEqual(sum(allowance.values()), SWAP_FILE_MB, "the allowances must fit the swap file")
        for n, a in allowance.items():
            self.assertLessEqual(a, self.s[n]["limit"] // 2, f"{n}: swap allowance above half its limit")

    def test_node_heaps_leave_a_quarter_of_the_limit_for_native_memory(self):
        heaps = {n: v for n, v in self.s.items() if v["heap"]}
        self.assertEqual(set(heaps), {"backend", "worker", "admin-web", "patient-web"})
        for n, v in heaps.items():
            self.assertLessEqual(v["heap"], v["limit"] * 0.75, n)

    def test_the_kernel_kills_the_rebuildable_first_and_the_databases_last(self):
        adj = {n: v["adj"] for n, v in self.s.items()}
        self.assertEqual(max(adj, key=adj.get), "clamav")
        self.assertEqual(min(adj, key=adj.get), "mongodb")
        self.assertLessEqual(adj["mongodb"], -900)
        self.assertGreater(adj["meilisearch"], 0)                    # meilisearch is rebuildable: it goes before the API and the databases

    def test_steady_use_plus_the_largest_one_off_plus_the_host_fit_in_memtotal(self):
        steady = sum(v["res"] for n, v in self.s.items() if n != "clamav")
        apply_cap = int(re.search(r"--memory (\d+)m --memory-swap \1m --oom-score-adj 1000", APPLY).group(1))
        dump_cap = int(re.search(r"cap=(\d+); \[ \"\$avail\" -gt 0 \]", DUMP).group(1))
        burst = max(apply_cap, dump_cap)
        self.assertLessEqual(steady + burst + HOST_OWN_MB, MEMTOTAL_MB, f"steady {steady} + burst {burst} + host {HOST_OWN_MB}")
        self.assertEqual(steady, 2560)

    def test_the_doc_table_is_the_compose_file(self):
        rows = re.findall(r"(?m)^\| ([a-z][a-z0-9-]*) \| (\d+)m \| (\d+)m \| ([^|]*?) \|", DOC)
        self.assertEqual({r[0] for r in rows}, set(self.s), "every compose service is in the doc table and the other way round")
        for name, limit, res, swap in rows:
            v = self.s[name]
            self.assertEqual((int(limit), int(res)), (v["limit"], v["res"]), name)
            m = re.match(r"(\d+)m", swap.strip())
            self.assertEqual(int(m.group(1)) if m else 0, v["swap"] - v["limit"], f"{name}: swap allowance")

    def test_the_doc_sums_are_the_computed_ones(self):
        steady = sum(v["res"] for n, v in self.s.items() if n != "clamav")
        self.assertIn(f"| {steady} |", DOC)
        self.assertIn("| **sum** | **3760** |", DOC)
        self.assertIn(f"add up to {sum(v['swap'] - v['limit'] for v in self.s.values())} MB", DOC)


if __name__ == "__main__":
    unittest.main()
