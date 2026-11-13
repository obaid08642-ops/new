"""tools/ops/tasks/98r-disk-guard-cron.sh against a fake sudo and temp dirs: dry run changes nothing, apply installs script + cron with backups, a second schedule aborts, rollback removes only the cron file."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "98r-disk-guard-cron.sh")


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class DiskGuardCron(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup); self.t = t.name
        self.b = os.path.join(self.t, "bin"); os.makedirs(self.b)
        self.cron = os.path.join(self.t, "cron.d"); os.makedirs(self.cron)
        self.script = os.path.join(self.t, "host", "disk-guard.sh")
        self.src = os.path.join(self.t, "repo-disk-guard.sh")
        with open(self.src, "w") as f:
            f.write("#!/bin/bash\necho new\n")
        write_exec(os.path.join(self.b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nif [ "$1" = crontab ]; then exit 1; fi\nexec "$@"\n')

    def run_task(self, **kv):
        src = open(TASK).read()
        for k, v in kv.items():
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        path = os.path.join(self.t, "task.sh")
        write_exec(path, src)
        env = dict(os.environ, PATH=self.b + ":" + os.environ["PATH"], OPS_CRON_DIR=self.cron,
                   OPS_DISK_GUARD_SCRIPT=self.script, OPS_DISK_GUARD_SRC=self.src,
                   OPS_WATCHDOG_LOG=os.path.join(self.t, "log"), OPS_SCHED_PATHS=os.path.join(self.t, "none"))
        return subprocess.run(["bash", path], env=env, capture_output=True, text=True)

    def test_dry_run_changes_nothing(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0)
        self.assertIn("dry run only", p.stdout)
        self.assertIn("scheduled in: NOWHERE", p.stdout)
        self.assertEqual(os.listdir(self.cron), [])
        self.assertFalse(os.path.exists(self.script))

    def test_apply_installs_script_and_cron(self):
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("installed", p.stdout)
        self.assertEqual(open(self.script).read(), "#!/bin/bash\necho new\n")
        self.assertTrue(os.stat(self.script).st_mode & stat.S_IXUSR)
        line = open(os.path.join(self.cron, "nabd-disk-guard")).read()
        self.assertIn("20 5 * * * root " + self.script, line)

    def test_apply_backs_up_the_old_script_and_cron_file(self):
        os.makedirs(os.path.dirname(self.script))
        write_exec(self.script, "#!/bin/bash\necho old\n")
        with open(os.path.join(self.cron, "nabd-disk-guard"), "w") as f:
            f.write("old cron\n")
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        names = os.listdir(self.cron)
        self.assertTrue(any(n.startswith("nabd-disk-guard.bak-") for n in names), names)
        baks = [n for n in os.listdir(os.path.dirname(self.script)) if ".bak-" in n]
        self.assertEqual(len(baks), 1)
        self.assertEqual(open(os.path.join(os.path.dirname(self.script), baks[0])).read(), "#!/bin/bash\necho old\n")
        self.assertEqual(open(self.script).read(), "#!/bin/bash\necho new\n")

    def test_second_schedule_aborts_and_writes_nothing(self):
        with open(os.path.join(self.cron, "nabd-backups"), "w") as f:
            f.write("20 5 * * * root /opt/nabdah/deploy/scripts/disk-guard.sh\n")
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1)
        self.assertIn("already scheduled in: nabd-backups", p.stdout)
        self.assertFalse(os.path.exists(self.script))
        self.assertFalse(os.path.exists(os.path.join(self.cron, "nabd-disk-guard")))

    def test_rollback_removes_only_the_cron_file(self):
        self.run_task(APPLY="yes")
        p = self.run_task(ROLLBACK="yes")
        self.assertEqual(p.returncode, 0)
        self.assertFalse(os.path.exists(os.path.join(self.cron, "nabd-disk-guard")))
        self.assertTrue(os.path.exists(self.script))

    def test_output_is_status_lines_only(self):
        p = self.run_task(APPLY="yes")
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith(("##", "status: disk-guard-cron:")), line)


if __name__ == "__main__":
    unittest.main()
