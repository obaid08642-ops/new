"""99c-db-counts.sh against a fake docker: read-only, the app database name is found even when mongosh quotes a returned string (run 75), names and numbers only."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "99c-db-counts.sh")


def wx(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class DbCounts(unittest.TestCase):
    def run_task(self):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b); bk = os.path.join(d, "backups"); os.makedirs(bk)
        with open(os.path.join(bk, "nabd_x_1.gz"), "wb") as f:
            f.write(b"x" * 2048)
        calls = os.path.join(d, "calls.log")
        wx(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        wx(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$1 $2" >> "{calls}"
a="$*"
case "$a" in
  *"filter(d=>"*) echo "'nabd_nestjs'";;                       # an old mongosh prints a returned string in quotes
  *"getSiblingDB('nabd_nestjs')"*) printf 'orders=50 (2MB)\\nusers=120 (5MB)\\n';;
  *listDatabases*) echo "admin=1MB nabd_nestjs=601MB nabd_staging=259MB";;
esac
''')
        e = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_BACKUP_DIR=bk)
        p = subprocess.run(["bash", TASK], env=e, capture_output=True, text=True, timeout=60, stdin=subprocess.DEVNULL)
        with open(calls) as f:
            return p, f.read()

    def test_prints_databases_the_app_database_its_collections_and_the_dumps(self):
        p, calls = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        o = p.stdout
        self.assertIn("databases: admin=1MB nabd_nestjs=601MB nabd_staging=259MB", o)
        self.assertIn("largest app database: nabd_nestjs\n", o)           # the quotes are stripped
        self.assertIn("orders=50 (2MB)", o); self.assertIn("users=120 (5MB)", o)
        self.assertIn("nabd_x_1.gz 2048", o)

    def test_is_read_only(self):
        p, calls = self.run_task()
        verbs = {l.split(" ", 1)[0] for l in calls.splitlines() if l}
        self.assertEqual(verbs, {"exec"}, calls)                               # no start, stop, rm, run, compose


if __name__ == "__main__":
    unittest.main()
