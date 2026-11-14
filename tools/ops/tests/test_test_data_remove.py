"""tools/ops/tasks/78-test-data-remove.sh against a fake docker: dry run writes nothing, the apply needs the exact plan hash, only the test_data step is ever passed,
a failed verify rolls back."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "78-test-data-remove.sh")
SHA = "a" * 64
PLAN = ('{"cmd":"plan","plan_sha":"%s","inputs":{"test_data_remove":"x"},"steps":{"test_data":19},"total_changes":19,'
        '"test_data":{"profiles_found":["c142700b-1"],"resolved_ids":{"c142700b":"c142700b-1"},"deletes":{"provider_profiles":8,"provider_accounts":6,"users":4,"orders":1},"total":19}}\n' % SHA)


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class TestDataRemove(unittest.TestCase):
    def run_task(self, expect="", apply_rc=0, health="healthy"):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        b = os.path.join(tmp.name, "bin"); os.makedirs(b)
        log = os.path.join(tmp.name, "docker.log")
        script = open(TASK).read().replace('EXPECT_PLAN_SHA=""', f'EXPECT_PLAN_SHA="{expect}"', 1)
        task = os.path.join(tmp.name, "task.sh")
        write_exec(task, script)
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$@" >> "{log}"
case "$1" in
  inspect) echo {health};;
  cp) echo backup > "$3"; exit 0;;
  exec) shift 2; case "$1" in
      test) exit 0;;
      node) case "$3" in
          plan) printf '%s' '{PLAN.strip()}'; echo; exit 0;;
          apply) echo '{{"cmd":"apply","step":"backup","file_sha256":"6a1e0c4e","changes":19}}'; exit {apply_rc};;
          rollback) echo '{{"cmd":"rollback","ok":true}}'; exit 0;;
        esac;;
    esac;;
esac
''')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_BACKUP_DIR=os.path.join(tmp.name, "bk"))
        p = subprocess.run(["bash", task], env=env, capture_output=True, text=True, timeout=30)
        return p, open(log).read() if os.path.exists(log) else ""

    def test_dry_run_prints_the_counts_and_the_hash_and_writes_nothing(self):
        p, log = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn(f"plan sha={SHA} total_changes=19", p.stdout)
        self.assertIn('"deletes":{"provider_profiles":8,"provider_accounts":6,"users":4', p.stdout)
        self.assertIn(f"set EXPECT_PLAN_SHA={SHA}", p.stdout)
        self.assertNotIn(" apply ", log)
        self.assertIn("--only=test_data --test-data-remove=packaged", log)

    def test_only_the_test_data_step_is_ever_passed(self):
        _, log = self.run_task(expect=SHA)
        for line in log.splitlines():
            if "catalogue-apply.js plan" in line or "catalogue-apply.js apply" in line:
                self.assertIn("--only=test_data", line)

    def test_a_different_hash_aborts_before_anything_is_written(self):
        p, log = self.run_task(expect="b" * 64)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT the plan changed", p.stdout)
        self.assertNotIn("catalogue-apply.js apply", log)

    def test_a_short_or_non_hex_hash_is_refused(self):
        for bad in ("abc123", "zz" * 20):
            p, log = self.run_task(expect=bad)
            self.assertEqual(p.returncode, 1)
            self.assertNotIn("catalogue-apply.js apply", log)

    def test_apply_with_the_right_hash_takes_a_backup_first_and_verifies(self):
        p, log = self.run_task(expect=SHA[:40])
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn(f"catalogue-apply.js apply --expect={SHA} --backup=/tmp/test-data-backup-", log)
        self.assertIn("applied and verified", p.stdout)

    def test_a_failed_verify_rolls_back(self):
        p, log = self.run_task(expect=SHA, apply_rc=3)
        self.assertEqual(p.returncode, 1)
        self.assertIn("catalogue-apply.js rollback --backup=", log)
        self.assertIn("rollback complete", p.stdout)

    def test_aborts_when_the_backend_is_not_healthy(self):
        p, _ = self.run_task(health="starting")
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT", p.stdout)


if __name__ == "__main__":
    unittest.main()
