"""deploy/scripts/disk-guard.sh against fake docker/journalctl: acts only below the trigger, only on rebuildable things, never on backups, and tells when it was not enough."""
import os
import stat
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "deploy", "scripts", "disk-guard.sh")
FAKE = '#!/bin/sh\necho "$(basename "$0") $*" >> "$FAKE_LOG"\n'


def df(size_k, avail_k):
    return f"Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/x {size_k} {size_k - avail_k} {avail_k} 0% /\n"


class DiskGuard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.log = os.path.join(self.tmp.name, "calls")
        self.docker = os.path.join(self.tmp.name, "docker"); self.journal = os.path.join(self.tmp.name, "journalctl")
        for p in (self.docker, self.journal):
            with open(p, "w") as f:
                f.write(FAKE)
            os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)

    def run_guard(self, size_k, avail_k, **env):
        e = dict(os.environ, DISK_GUARD_DF_OUTPUT=df(size_k, avail_k), DISK_GUARD_DOCKER=self.docker, DISK_GUARD_JOURNALCTL=self.journal,
                 DISK_GUARD_PRUNE_RELEASES=os.path.join(self.tmp.name, "none.sh"), FAKE_LOG=self.log)
        e.update(env)
        r = subprocess.run(["bash", SCRIPT], capture_output=True, text=True, env=e)
        calls = []
        if os.path.exists(self.log):
            with open(self.log) as f:
                calls = f.read().splitlines()
        return r, calls

    def test_enough_space_does_nothing(self):
        r, calls = self.run_guard(100_000_000, 40_000_000)
        self.assertEqual(r.returncode, 0); self.assertEqual(calls, []); self.assertIn("nothing to do", r.stdout)

    def test_below_trigger_prunes_only_rebuildable_things(self):
        r, calls = self.run_guard(100_000_000, 22_000_000)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertEqual(calls, ["docker builder prune -f", "docker image prune -f", "docker image prune -a -f --filter until=168h", "journalctl --vacuum-size=100M"])
        self.assertTrue(all(w not in " ".join(calls) for w in ("volume", "rm ", "backup", "system prune")))

    def test_exit_2_and_a_message_when_it_is_still_below_the_warning_level(self):
        r, _ = self.run_guard(100_000_000, 15_000_000)
        self.assertEqual(r.returncode, 2); self.assertIn("STILL BELOW 20% free", r.stdout)

    def test_dry_run_runs_nothing(self):
        r, calls = self.run_guard(100_000_000, 22_000_000, DISK_GUARD_DRY="1")
        self.assertEqual(calls, []); self.assertIn("dry: docker build cache", r.stdout)

    def test_a_failing_command_does_not_stop_the_rest(self):
        with open(self.docker, "w") as f:
            f.write('#!/bin/sh\necho "docker $*" >> "$FAKE_LOG"\nexit 1\n')
        r, calls = self.run_guard(100_000_000, 22_000_000)
        self.assertEqual(len(calls), 4); self.assertIn("failed or not available", r.stdout)


if __name__ == "__main__":
    unittest.main()
