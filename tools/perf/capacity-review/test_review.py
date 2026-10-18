import os
import tempfile
import unittest

import review

T0 = 1_790_000_000 - (1_790_000_000 % 86400)  # a UTC midnight


def rows(days, cpu=lambda i: 20.0, ws=lambda i: 10, cache=lambda i: (i * 10, i * 1000), p95bucket=lambda i: "100", step=900):
    out, req, cum = [], 0, 0
    for i in range(days * 96):
        req += 200
        r, q = cache(i)
        out.append({"ts": T0 + i * step, "cpu_busy_pct": cpu(i), "mem_used_pct": 50.0, "disk_used_pct": 40.0,
                    "api": {"buckets": {"100": req * 0.5 if p95bucket(i) == "100" else 0, "500": req * 0.99, "1000": req, "+Inf": req},
                            "requests": req, "errors": 0, "uptime_s": i * step + 1, "event_loop_ms": 5.0, "ws": ws(i)},
                    "mongo": {"cache_read": r, "cache_req": q, "conns": 5}, "redis": {"evicted_keys": 0}})
    return out


class Review(unittest.TestCase):
    def test_quiet_month_triggers_nothing(self):
        a = review.analyse(rows(14))
        self.assertEqual(a["status"], "none")
        self.assertEqual(a["steps"], [])

    def test_thin_data_is_not_reported_as_fine(self):
        a = review.analyse(rows(3))
        self.assertEqual(a["status"], "insufficient")

    def test_sustained_cpu_on_three_days_triggers_step_2(self):
        # 70 %+ from 10:00 to 14:00 (16 samples) on days 2, 3, 4
        cpu = lambda i: 85.0 if i // 96 in (2, 3, 4) and 40 <= i % 96 < 56 else 20.0
        a = review.analyse(rows(14, cpu=cpu))
        self.assertEqual(a["status"], "triggered")
        self.assertEqual(a["steps"][0][0], 2)

    def test_a_short_cpu_spike_does_not(self):
        cpu = lambda i: 95.0 if i % 96 in (10, 11) else 20.0
        self.assertEqual(review.analyse(rows(14, cpu=cpu))["status"], "none")

    def test_rising_mongo_miss_ratio_triggers_step_2(self):
        # miss ratio 0.5 % in the first week, 2 % in the last
        state = {"r": 0, "q": 0}
        def cache(i):
            frac = 0.005 if i < 7 * 96 else (0.005 + (0.015 * (i - 7 * 96) / (7 * 96))) if i < 14 * 96 else 0.02
            state["q"] += 1000
            state["r"] += 1000 * frac
            return state["r"], state["q"]
        a = review.analyse(rows(21, cache=cache))
        self.assertTrue(a["mongo_miss"]["rising"])
        self.assertEqual(a["status"], "triggered")

    def test_p95_over_400_needs_step_2_done(self):
        slow = lambda i: "slow"  # half the requests land above 500 ms
        a = review.analyse(rows(14, p95bucket=slow), step2_done=False)
        self.assertEqual(len(a["p95"]["days_over_400"]) >= 3, True)
        self.assertEqual(a["steps"], [])
        self.assertTrue(any("step 2 is not done" in w for w in a["warnings"]))
        b = review.analyse(rows(14, p95bucket=slow), step2_done=True)
        self.assertEqual([s for s, _ in b["steps"]], [3])

    def test_sockets_over_50000_trigger_step_4(self):
        a = review.analyse(rows(14, ws=lambda i: 60000 if i == 500 else 10))
        self.assertEqual([s for s, _ in a["steps"]], [4])

    def test_note_and_exit_codes(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "s.jsonl")
            import json
            open(p, "w").write("\n".join(json.dumps(r) for r in rows(14)) + "\n")
            out = os.path.join(d, "n.md")
            self.assertEqual(review.main([p, "--out", out, "--month", "2026-10"]), 0)
            text = open(out).read()
            self.assertIn("# Capacity and cost review, 2026-10", text)
            self.assertIn("No scale-out step is triggered", text)
            costs = os.path.join(d, "c.json")
            open(costs, "w").write(json.dumps({"2026-09": {"server": 100}, "2026-10": {"server": 150}}))
            review.main([p, "--out", out, "--month", "2026-10", "--costs", costs])
            self.assertIn("+50 % (over 20 %: explain)", open(out).read())


if __name__ == "__main__":
    unittest.main()
