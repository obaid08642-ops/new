"""tools/ops/tasks/79-legacy-withdrawals-remove.sh against a fake docker: dry run by default (nothing is written), apply only with the plan's hash."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "79-legacy-withdrawals-remove.sh")
SHA = "a" * 64


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class LegacyWithdrawalsRemove(unittest.TestCase):
    def run_task(self, expect="", total=2, plan_sha=SHA, apply_rc=0):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        log = os.path.join(d, "calls.log")
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{log}"
case "$1" in
  inspect) echo healthy;;
  cp) exit 1;;
  exec)
    case "$*" in
      *"test -f"*) exit 0;;
      *" plan"*) echo '{{"step":"plan","collection":"withdrawalrequests","plan_sha":"{plan_sha}","total_changes":{total},"ids":["1","2"],"writes":false}}';;
      *" apply "*) echo '{{"step":"backup","ok":true,"documents":{total},"file_sha256":"{SHA}"}}'; echo '{{"step":"apply","ok":true,"deleted":{total},"remaining":0}}'; exit {apply_rc};;
      *" rollback "*) echo '{{"step":"rollback","ok":true,"restored":{total}}}';;
    esac;;
esac
''')
        script = open(TASK).read().replace('EXPECT_PLAN_SHA=""', f'EXPECT_PLAN_SHA="{expect}"', 1)
        task = os.path.join(d, "task.sh")
        write_exec(task, script)
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_BACKUP_DIR=os.path.join(d, "backups"))
        r = subprocess.run(["bash", task], capture_output=True, text=True, env=env)
        calls = open(log).read() if os.path.exists(log) else ""
        return r, calls

    def test_dry_run_by_default_writes_nothing(self):
        r, calls = self.run_task()
        self.assertEqual(r.returncode, 0)
        self.assertIn("dry run only", r.stdout)
        self.assertNotIn(" apply ", calls)
        self.assertNotIn(" rollback ", calls)

    def test_apply_needs_the_hash_of_the_dry_run(self):
        r, calls = self.run_task(expect="b" * 40)
        self.assertEqual(r.returncode, 1)
        self.assertIn("the plan changed", r.stdout)
        self.assertNotIn(" apply ", calls)

    def test_a_short_or_non_hex_hash_is_refused(self):
        for bad in ("abc123", "zz" * 20):
            r, calls = self.run_task(expect=bad)
            self.assertEqual(r.returncode, 1)
            self.assertNotIn(" apply ", calls)

    def test_apply_with_the_right_hash_backs_up_and_deletes(self):
        r, calls = self.run_task(expect=SHA[:40])
        self.assertEqual(r.returncode, 0)
        self.assertRegex(calls, r"apply --expect=" + SHA + r" --backup=/tmp/legacy-withdrawals-backup-")
        self.assertIn("applied and verified", r.stdout)

    def test_a_failed_apply_rolls_back(self):
        r, calls = self.run_task(expect=SHA[:40], apply_rc=1)
        self.assertEqual(r.returncode, 1)
        self.assertIn(" rollback --backup=", calls)
        self.assertIn("rollback complete", r.stdout)

    def test_no_rows_means_nothing_to_apply(self):
        r, calls = self.run_task(expect=SHA[:40], total=0)
        self.assertEqual(r.returncode, 0)
        self.assertIn("nothing to apply", r.stdout)
        self.assertNotIn(" apply ", calls)


if __name__ == "__main__":
    unittest.main()
