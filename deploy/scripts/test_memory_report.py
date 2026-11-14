"""deploy/scripts/memory-report.sh: status lines for the host and the containers; warnings for low memory, swap, OOM kills, restarts and a missing limit."""
import os
import stat
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memory-report.sh")
FAKE_DOCKER = """#!/bin/bash
case "$1" in
  ps) printf 'nabdah-backend\nnabdah-mongodb\nnabdah-clamav\n' ;;
  inspect) case "$4" in
      nabdah-backend) echo "805306368 419430400 0 false 0" ;;
      nabdah-mongodb) echo "1258291200 838860800 4 false -900" ;;
      nabdah-clamav) echo "0 0 0 false 900" ;;
    esac ;;
  stats) case "$5" in
      nabdah-backend) echo "388MiB / 768MiB" ;;
      nabdah-mongodb) echo "708MiB / 1.172GiB" ;;
      *) echo "0B / 0B" ;;
    esac ;;
esac
"""


class MemoryReport(unittest.TestCase):
    def run_report(self, avail_mb, swap_used_mb, dmesg=""):
        with tempfile.TemporaryDirectory() as d:
            docker = os.path.join(d, "docker")
            with open(docker, "w") as f:
                f.write(FAKE_DOCKER)
            os.chmod(docker, os.stat(docker).st_mode | stat.S_IEXEC)
            meminfo = os.path.join(d, "meminfo")
            with open(meminfo, "w") as f:
                f.write("MemTotal: %d kB\nMemAvailable: %d kB\nSwapTotal: %d kB\nSwapFree: %d kB\n" % (3800 * 1024, avail_mb * 1024, 2048 * 1024, (2048 - swap_used_mb) * 1024))
            dm = os.path.join(d, "dmesg")
            with open(dm, "w") as f:
                f.write("#!/bin/bash\nprintf '%s\\n' \"$DMESG_TEXT\"\n")
            os.chmod(dm, os.stat(dm).st_mode | stat.S_IEXEC)
            env = dict(os.environ, MEMREPORT_MEMINFO=meminfo, MEMREPORT_DOCKER=docker, MEMREPORT_DMESG=dm, DMESG_TEXT=dmesg)
            p = subprocess.run(["bash", SCRIPT], env=env, capture_output=True, text=True, timeout=30)
            return p.returncode, p.stdout

    def test_prints_the_host_and_every_container_and_exits_zero(self):
        rc, out = self.run_report(1500, 10)
        self.assertEqual(rc, 0)
        self.assertIn("status: memory host total=3800MB available=1500MB swap_used=10MB of 2048MB", out)
        self.assertIn("container=nabdah-backend use=388MiB limit=768MB reservation=400MB restarts=0 oom_killed=false oom_score_adj=0", out)
        self.assertIn("container=nabdah-mongodb use=708MiB limit=1200MB reservation=800MB restarts=4 oom_killed=false oom_score_adj=-900", out)
        self.assertNotIn("WARN memory available", out)
        self.assertNotIn("WARN memory swap", out)

    def test_warns_about_low_memory_and_swap(self):
        _, out = self.run_report(400, 2000)
        self.assertIn("WARN memory available 400MB is under 700MB", out)
        self.assertIn("WARN memory swap in use 2000MB", out)

    def test_warns_about_restarts_and_a_missing_limit(self):
        _, out = self.run_report(1500, 0)
        self.assertIn("WARN memory container=nabdah-mongodb restarted 4 time(s)", out)
        self.assertIn("WARN memory container=nabdah-clamav has no memory limit", out)

    def test_counts_oom_kills_in_the_kernel_log(self):
        _, out = self.run_report(1500, 0, "Out of memory: Killed process 123 (mongod)\nOut of memory: Killed process 456 (node)")
        self.assertIn("kernel_oom_kills_in_log=2", out)
        self.assertIn("WARN memory the kernel log holds 2 OOM kill line(s)", out)

    def test_prints_no_environment_values(self):
        _, out = self.run_report(1500, 0)
        for word in ("PASSWORD", "SECRET", "TOKEN", "KEY="):
            self.assertNotIn(word, out)


if __name__ == "__main__":
    unittest.main()
