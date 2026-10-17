import unittest

from dr_plan import plan

NOW = 1_000_000


def sl(f, t, modified, fi=0, ti=0):
    return {"key": "oplog/oplog_%d.%d_%d.%d.bson.gz.enc" % (f, fi, t, ti), "modified": modified}


class DrPlan(unittest.TestCase):
    def test_unbroken_chain_gives_worst_gap_as_rpo(self):
        # uploads every 10 min except one 12 min gap, newest 5 min ago
        s = [sl(100, 200, NOW - 3000), sl(200, 300, NOW - 2400), sl(300, 400, NOW - 1680), sl(400, 500, NOW - 300)]
        # gaps: 600, 720, 1380 (1680->300), 300 since newest
        r = plan({"now": NOW, "dumps": [{"key": "mongodb/a.gz", "base": "150 3"}], "slices": s})
        self.assertTrue(r["ok"])
        self.assertEqual(r["dump"], "mongodb/a.gz")
        self.assertEqual(len(r["slices"]), 4)
        self.assertEqual(r["end"], "500 0")
        self.assertEqual(r["rpo_seconds"], 1380)

    def test_gap_in_chain_stops_replay_there(self):
        s = [sl(100, 200, NOW - 900), sl(300, 400, NOW - 300)]
        r = plan({"now": NOW, "dumps": [{"key": "mongodb/a.gz", "base": "100 0"}], "slices": s})
        self.assertEqual(r["end"], "200 0")
        self.assertEqual(len(r["slices"]), 1)

    def test_newest_dump_without_cover_falls_back_to_older(self):
        s = [sl(100, 200, NOW - 600), sl(200, 300, NOW - 300)]
        d = [{"key": "mongodb/2.gz", "base": "150 0"}, {"key": "mongodb/9.gz", "base": "999 0"}]
        # 9.gz sorts last but starts after the chain, 2.gz is not newer by key: key order decides, so 9 is tried first
        r = plan({"now": NOW, "dumps": d, "slices": s})
        self.assertTrue(r["ok"])
        self.assertEqual(r["dump"], "mongodb/2.gz")

    def test_no_chain_fails_with_reason(self):
        r = plan({"now": NOW, "dumps": [{"key": "mongodb/a.gz", "base": "10 0"}], "slices": []})
        self.assertFalse(r["ok"])
        self.assertIn("no dump has an unbroken oplog chain", r["error"])

    def test_target_time_cuts_the_chain(self):
        s = [sl(100, 200, NOW - 900), sl(200, 300, NOW - 600), sl(300, 400, NOW - 300)]
        r = plan({"now": NOW, "dumps": [{"key": "mongodb/a.gz", "base": "100 0"}], "slices": s, "target": 250})
        self.assertEqual(r["end"], "300 0")

    def test_old_uploads_are_outside_the_rpo_window(self):
        s = [sl(100, 200, NOW - 200000), sl(200, 300, NOW - 100)]
        r = plan({"now": NOW, "dumps": [{"key": "mongodb/a.gz", "base": "100 0"}], "slices": s})
        self.assertEqual(r["rpo_seconds"], 100)


if __name__ == "__main__":
    unittest.main()
