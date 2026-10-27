"""deploy/scripts/clamav-window.sh: start ClamAV only when uploads wait and the memory is there, stop it after the queue has been empty."""
import os
import stat
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clamav-window.sh")
FAKE_DOCKER = """#!/bin/bash
echo "$@" >> "$FAKE_LOG"
case "$1" in
  inspect) if [ "$2" = "-f" ]; then [ "$FAKE_RUNNING" = 1 ] && echo true || echo false; else [ "$FAKE_EXISTS" = 0 ] && exit 1 || exit 0; fi ;;
esac
exit 0
"""


class ClamavWindow(unittest.TestCase):
    def run_script(self, pending, free_mb, running, now=10_000, idle_since=None, on_demand="1", exists="1"):
        with tempfile.TemporaryDirectory() as d:
            bindir = os.path.join(d, "bin")
            os.mkdir(bindir)
            docker = os.path.join(bindir, "docker")
            with open(docker, "w") as f:
                f.write(FAKE_DOCKER)
            os.chmod(docker, os.stat(docker).st_mode | stat.S_IEXEC)
            meminfo = os.path.join(d, "meminfo")
            with open(meminfo, "w") as f:
                f.write("MemTotal: 4000000 kB\nMemAvailable: %d kB\n" % (free_mb * 1024))
            state = os.path.join(d, "state")
            os.mkdir(state)
            if idle_since is not None:
                with open(os.path.join(state, "idle_since"), "w") as f:
                    f.write(str(idle_since))
            log = os.path.join(d, "docker.log")
            env = dict(os.environ, PATH=bindir + os.pathsep + os.environ["PATH"], NABD_ENV_FILE="/dev/null", CLAMAV_ON_DEMAND=on_demand,
                       CLAMAV_PENDING_COUNT=str(pending), CLAMAV_MEMINFO=meminfo, CLAMAV_STATE_DIR=state, CLAMAV_NOW_EPOCH=str(now),
                       FAKE_LOG=log, FAKE_RUNNING="1" if running else "0", FAKE_EXISTS=exists)
            p = subprocess.run(["bash", SCRIPT], env=env, capture_output=True, text=True, timeout=30)
            calls = ""
            if os.path.exists(log):
                with open(log) as fh:
                    calls = fh.read()
            return p, calls, os.path.exists(os.path.join(state, "idle_since"))

    def test_off_unless_enabled(self):
        p, calls, _ = self.run_script(pending=5, free_mb=4000, running=False, on_demand="0")
        self.assertEqual(p.returncode, 0)
        self.assertEqual(calls, "")

    def test_starts_the_scanner_when_files_wait_and_memory_is_there(self):
        p, calls, _ = self.run_script(pending=3, free_mb=2000, running=False)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("start nabdah-clamav", calls)

    def test_creates_the_container_from_compose_when_it_does_not_exist_yet(self):
        p, calls, _ = self.run_script(pending=3, free_mb=2000, running=False, exists="0")
        self.assertIn("compose", calls)
        self.assertIn("up -d clamav", calls)

    def test_does_not_start_it_when_the_memory_is_not_there(self):
        p, calls, _ = self.run_script(pending=3, free_mb=1300, running=False)
        self.assertEqual(p.returncode, 0)
        self.assertNotIn("start", calls)
        self.assertNotIn("up -d", calls)
        self.assertIn("1300 MB free", p.stdout)
        self.assertIn("quarantine", p.stdout)

    def test_leaves_a_running_scanner_alone_while_files_wait(self):
        p, calls, _ = self.run_script(pending=2, free_mb=100, running=True, idle_since=1)
        self.assertNotIn("start", calls)
        self.assertNotIn("stop", calls)

    def test_stops_the_scanner_only_after_the_queue_has_been_empty_long_enough(self):
        # empty for 5 minutes: keep it; the idle clock starts when it is first seen empty
        p, calls, idle = self.run_script(pending=0, free_mb=100, running=True, now=10_000, idle_since=10_000 - 5 * 60)
        self.assertNotIn("stop", calls)
        self.assertTrue(idle)
        p, calls, idle = self.run_script(pending=0, free_mb=100, running=True, now=10_000, idle_since=None)
        self.assertNotIn("stop", calls)
        self.assertTrue(idle)
        # empty for 10 minutes: stop it and forget the idle clock
        p, calls, idle = self.run_script(pending=0, free_mb=100, running=True, now=10_000, idle_since=10_000 - 10 * 60)
        self.assertIn("stop nabdah-clamav", calls)
        self.assertFalse(idle)

    def test_files_arriving_reset_the_idle_clock(self):
        p, calls, idle = self.run_script(pending=1, free_mb=100, running=True, idle_since=1)
        self.assertFalse(idle)

    def test_an_unreadable_queue_changes_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            env = dict(os.environ, NABD_ENV_FILE="/dev/null", CLAMAV_ON_DEMAND="1", CLAMAV_STATE_DIR=d, PATH="/nonexistent:/usr/bin:/bin")
            env.pop("CLAMAV_PENDING_COUNT", None)
            p = subprocess.run(["bash", SCRIPT], env=env, capture_output=True, text=True, timeout=30)
            self.assertEqual(p.returncode, 0)
            self.assertIn("cannot read the scan queue", p.stdout)


if __name__ == "__main__":
    unittest.main()
