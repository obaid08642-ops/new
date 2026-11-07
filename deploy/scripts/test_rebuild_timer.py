"""deploy/scripts/rebuild-timer.sh: phases are timed, failures are reported, the verdict follows the 30-minute target (fake clock, no server)."""
import json
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TIMER = os.path.join(HERE, "rebuild-timer.sh")


class Timer(unittest.TestCase):
    def go(self, phases, target=None):
        with tempfile.TemporaryDirectory() as d:
            clock = os.path.join(d, "clock")
            with open(clock, "w") as f:
                f.write("0")
            lines = ['source "%s"' % TIMER]
            t = 0
            for name, secs, rc in phases:
                # the clock is read before and after the step; the step moves it from t to t+secs
                lines.append(f'echo {t} > "{clock}"; phase {name} bash -c \'echo {t + secs} > "{clock}"; exit {rc}\'')
                t += secs
            lines.append("rebuild_report; echo rc=$?")
            env = dict(os.environ, REBUILD_FAKE_CLOCK=clock, REBUILD_REPORT_DIR=os.path.join(d, "out"), REBUILD_BUDGET_FILE=os.path.join(HERE, "rebuild-budget.tsv"))
            if target:
                env["REBUILD_TARGET_SEC"] = str(target)
            r = subprocess.run(["bash", "-c", "\n".join(lines)], env=env, capture_output=True, text=True, timeout=30)
            out = os.path.join(d, "out")
            files = os.listdir(out) if os.path.isdir(out) else []
            with open(os.path.join(out, files[0])) as fh:
                rep = json.load(fh)
            return r, rep

    def test_within_budget_is_within_target(self):
        r, rep = self.go([("setup-server", 280, 0), ("images", 420, 0), ("restore-database", 300, 0)])
        self.assertIn("WITHIN TARGET", r.stdout); self.assertIn("rc=0", r.stdout)
        self.assertEqual(rep["total_seconds"], 1000)
        self.assertEqual([p["status"] for p in rep["phases"]], ["ok", "ok", "ok"])
        self.assertNotIn("OVER BUDGET", r.stdout)

    def test_a_phase_over_its_budget_is_named_and_the_total_decides_the_verdict(self):
        r, rep = self.go([("setup-server", 300, 0), ("images", 2000, 0)])
        self.assertIn("OVER BUDGET by 1580s", r.stdout)
        self.assertIn("OVER TARGET by 500s", r.stdout)
        self.assertNotIn("rc=0", r.stdout)
        r, rep = self.go([("setup-server", 300, 0), ("images", 1500, 0)])             # exactly 1800 s in total is still within the target
        self.assertEqual(rep["total_seconds"], 1800)
        self.assertIn("WITHIN TARGET", r.stdout)

    def test_a_failed_phase_means_the_rebuild_did_not_complete(self):
        r, rep = self.go([("setup-server", 100, 0), ("restore-database", 50, 3)])
        self.assertIn("DID NOT COMPLETE", r.stdout)
        self.assertEqual(rep["phases"][1]["status"], "FAILED")
        self.assertNotIn("rc=0", r.stdout)

    def test_the_budget_adds_up_to_the_target(self):
        with open(os.path.join(HERE, "rebuild-budget.tsv")) as f:
            total = sum(int(l.split("\t")[1]) for l in f if l.strip())
        self.assertLessEqual(total, 1800)


if __name__ == "__main__":
    unittest.main()
