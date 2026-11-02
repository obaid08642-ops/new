"""tools/ops/mem_budget.py (R1): the committed compose + mongod.conf match the plan for deploy/HOST_RAM_MB, the plan fits every host size, and a limit over the budget fails."""
import importlib.util
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TOOL = os.path.join(ROOT, "tools", "ops", "mem_budget.py")
spec = importlib.util.spec_from_file_location("mem_budget", TOOL)
mb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mb)


def run(*args):
    return subprocess.run([sys.executable, TOOL, *args], capture_output=True, text=True)


class CommittedNumbers(unittest.TestCase):
    def test_check_passes_for_the_host_size_in_the_repo(self):
        r = run("check")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_host_file_is_the_documented_host(self):
        with open(os.path.join(ROOT, "deploy", "HOST_RAM_MB")) as fh:
            self.assertEqual(int(fh.read()), 3800)

    def test_baseline_plan_is_exactly_the_compose_file(self):
        f, want, cache = mb.plan(3800)
        self.assertEqual(f, 1.0)
        self.assertEqual(want, mb.current(mb.read_compose()))
        self.assertEqual(cache, mb.mongo_cache())

    def test_every_compose_service_with_a_limit_is_in_the_model(self):
        names = set()
        for m in re.finditer(r"(?ms)^  ([a-z][a-z0-9-]*):\n(.*?)(?=^  [a-z][a-z0-9-]*:\n|^[a-z]|\Z)", mb.read_compose()):
            if "mem_limit:" in m.group(2):
                names.add(m.group(1))
        self.assertEqual(names, set(mb.BASE))


class PlanFitsEveryHost(unittest.TestCase):
    def test_budget_holds_and_scales(self):
        prev = 0
        for host in (3800, 4096, 8192, 16384, 32768, 65536):
            f, want, cache = mb.plan(host)
            steady = sum(v["res"] for n, v in want.items() if n not in mb.NOT_STEADY)
            self.assertLessEqual(steady + mb.ONE_OFF_MB + mb.reserve_mb(host), host, host)
            self.assertGreaterEqual(f, prev)
            prev = f
            for n, v in want.items():
                self.assertLessEqual(v["res"], v["limit"], (host, n))
                if v["heap"]:
                    self.assertLessEqual(v["heap"], v["limit"] * 0.75, (host, n))
            self.assertLessEqual(cache * 1024, 0.40 * want["mongodb"]["limit"], host)
            self.assertGreaterEqual(mb.reserve_mb(host), 512)

    def test_hosts_below_the_baseline_are_refused(self):
        with self.assertRaises(ValueError):
            mb.plan(2048)


class BrokenNumbersFail(unittest.TestCase):
    def problems(self, text, host=3800):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup)
        path = os.path.join(t.name, "c.yml")
        with open(path, "w") as fh:
            fh.write(text)
        old = mb.COMPOSE
        mb.COMPOSE = type(old)(path)
        try:
            return mb.problems(host, mb.current(mb.read_compose()), mb.mongo_cache())
        finally:
            mb.COMPOSE = old

    def test_a_raised_limit_fails(self):
        text = mb.read_compose().replace("mem_limit: 640m", "mem_limit: 2048m")
        self.assertTrue(any("worker" in p for p in self.problems(text)))

    def test_a_raised_reservation_breaks_the_budget(self):
        text = re.sub(r"(?m)^(    mem_reservation: )200m", r"\g<1>900m", mb.read_compose())
        bad = self.problems(text)
        self.assertTrue(any("budget broken" in p for p in bad), bad)

    def test_limits_over_the_ratchet_fail(self):
        text = mb.read_compose().replace("mem_limit: 1024m", "mem_limit: 4096m")
        self.assertTrue(any("ceiling" in p for p in self.problems(text)))

    def test_a_bigger_host_without_rendering_fails(self):
        self.assertTrue(self.problems(mb.read_compose(), host=8192))


class RenderWrites(unittest.TestCase):
    def test_render_write_then_check_passes_for_a_bigger_host(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup)
        for rel in ("deploy/mongo", "tools/ops"):
            os.makedirs(os.path.join(t.name, rel))
        shutil.copy(mb.COMPOSE, os.path.join(t.name, "deploy"))
        shutil.copy(mb.MONGOD_CONF, os.path.join(t.name, "deploy", "mongo"))
        shutil.copy(os.path.join(ROOT, "deploy", "HOST_RAM_MB"), os.path.join(t.name, "deploy"))
        tool = os.path.join(t.name, "tools", "ops", "mem_budget.py")
        shutil.copy(TOOL, tool)
        for args, code in ((["render", "--host-ram-mb", "8192", "--write"], 0), (["check", "--host-ram-mb", "8192"], 0), (["check", "--host-ram-mb", "3800"], 1)):
            r = subprocess.run([sys.executable, tool, *args], capture_output=True, text=True)
            self.assertEqual(r.returncode, code, (args, r.stdout, r.stderr))


if __name__ == "__main__":
    unittest.main()
