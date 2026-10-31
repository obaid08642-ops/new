"""tools/ops/tasks/97c-retention.sh on a real temporary backup directory and a fake docker: what stays, what goes, the dry run deletes nothing."""
import os
import re
import subprocess
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "97c-retention.sh")
MB = 1024 * 1024


class Retention(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name
        self.b = os.path.join(self.d, "backups"); os.makedirs(self.b)
        self.bin = os.path.join(self.d, "bin"); os.makedirs(self.bin)
        self.calls = os.path.join(self.d, "docker.log")
        self.now = time.time()

    def make(self, name, age_minutes, size=2 * MB):
        p = os.path.join(self.b, name)
        with open(p, "wb") as f:
            f.truncate(size)
        t = self.now - age_minutes * 60
        os.utime(p, (t, t))
        return p

    def fixture(self):
        day = 24 * 60
        # pre-deploy: one young (never touched, counts), 5 old, one empty
        self.make("pre-deploy-aaaa1111-20261031-120000.gz", 10)
        for i in range(1, 6):
            self.make(f"pre-deploy-bbbb000{i}-2026103{i}-000000.gz", i * day)
        self.make("pre-deploy-cccc2222-empty.gz", 180, size=0)
        # pre-mongo-recreate: 3, each with its compose file; pre-recreate: 1
        for i, ts in ((1, "20261030-010101"), (2, "20261029-010101"), (3, "20261028-010101")):
            self.make(f"pre-mongo-recreate-{ts}.gz", i * day)
            self.make(f"mongo-recreate-{ts}-docker-compose.production.yml", i * day, size=2048)
        self.make("pre-recreate-20261027-000000.gz", 4 * day)
        # nightly: 10 encrypted dumps with their oplog marks, and an orphan mark
        for i in range(1, 11):
            self.make(f"nabd_nabd_nestjs_2026102{i % 10}-030000.gz.gpg", i * day)
            self.make(f"nabd_nabd_nestjs_2026102{i % 10}-030000.gz.gpg.oplogts", i * day, size=64)
        self.make("nabd_nabd_nestjs_20260901-030000.gz.gpg.oplogts", 60 * day, size=64)   # its dump is long gone
        for i in (1, 2, 3):
            self.make(f"old-checkout-patient-web-{i}.tar.gz", i * day)

    def run_task(self, apply=False):
        script = os.path.join(self.d, "task.sh")
        text = open(TASK).read()
        if apply:
            text = re.sub(r'(?m)^APPLY=""$', 'APPLY="yes"', text)
        open(script, "w").write(text)
        for name, body in (
            ("sudo", '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'),
            ("docker", f'''#!/bin/bash
echo "$*" >> "{self.calls}"
case "$1" in
  ps) printf 'c1\\nc2\\n';;
  inspect) printf 'sha256:49aaaaaaaaaa1111\\nsha256:99999999bbbb2222\\n';;
  images) printf '50bbbbbbbbbb\\tnabdah-patient-web\\tv50\\n49aaaaaaaaaa\\tnabdah-patient-web\\tv49\\n48cccccccccc\\tnabdah-patient-web\\tv48\\n47dddddddddd\\tnabdah-patient-web\\tv47\\n7eeeeeeeeeee\\tmongo\\t7.0\\n0fffffffffff\\t<none>\\t<none>\\n';;
  image) case "$4" in 48cccccccccc|47dddddddddd) echo 524288000;; 0fffffffffff) echo 209715200;; *) echo 1048576000;; esac;;
  rmi) ;;
  system) echo "Build Cache=1.2GB";;
  builder) ;;
esac
'''),
        ):
            p = os.path.join(self.bin, name); open(p, "w").write(body); os.chmod(p, 0o755)
        jp = os.path.join(self.bin, "journalctl"); open(jp, "w").write('#!/bin/bash\necho "$*" >> "%s"\n[ "$1" = --disk-usage ] && echo "Archived and active journals take up 480.0M in the file system."\n' % self.calls); os.chmod(jp, 0o755)
        rel = os.path.join(self.d, "releases")
        for i, name in enumerate(("r1", "r2", "r3")):
            os.makedirs(os.path.join(rel, name), exist_ok=True); open(os.path.join(rel, name, "deploy.tgz"), "w").write("x")
            tt = self.now - (3 - i) * 3600; os.utime(os.path.join(rel, name), (tt, tt))
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], HOME=self.d, OPS_BACKUP_DIR=self.b, OPS_RELEASE_DIR=rel,
                   OPS_PRUNE_RELEASES=os.path.join(HERE, "..", "release", "prune-releases.sh"))
        p = subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=90, stdin=subprocess.DEVNULL)
        return p

    def left(self):
        return sorted(os.listdir(self.b))

    def test_dry_run_prints_counts_and_mb_and_deletes_nothing(self):
        self.fixture(); before = self.left()
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        out = p.stdout
        self.assertEqual(self.left(), before)                                                    # nothing deleted
        calls = open(self.calls).read()
        self.assertNotIn("rmi", calls); self.assertNotIn("builder prune", calls); self.assertNotIn("vacuum", calls)
        self.assertIn("pre-deploy dumps: files=7 stay=2", out); self.assertIn("delete=5 (of which empty: 1) frees 8388608 bytes = 8 MB", out)   # the young one + the newest finished one
        self.assertIn("pre-mongo-recreate dumps: files=3 stay=1", out); self.assertIn("delete=2", out)
        self.assertIn("pre-recreate dumps: files=1 stay=1", out)
        self.assertIn("nightly dumps: files=10 stay=2", out); self.assertIn("delete=8", out)
        self.assertIn("old-checkout archives: files=3 stay=1", out)
        self.assertIn("docker images: total=6 stay=3", out); self.assertIn("delete=3 (dangling: 1)", out)
        self.assertIn("release dirs (current + previous stay): release: 3 release dir(s), kept 2, would remove 1", out)
        self.assertIn("docker build cache reclaimable: Build Cache=1.2GB", out); self.assertIn("systemd journal: 480.0M (vacuum to 100M)", out)
        self.assertIn("dry run only: nothing was deleted", out)
        self.assertTrue(os.path.isdir(os.path.join(self.d, "releases", "r1")))

    def test_apply_keeps_one_running_one_backup_and_the_companions_follow_their_dump(self):
        self.fixture()
        p = self.run_task(apply=True)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        left = self.left()
        self.assertEqual([f for f in left if f.startswith("pre-deploy-")], ["pre-deploy-aaaa1111-20261031-120000.gz", "pre-deploy-bbbb0001-20261031-000000.gz"])
        self.assertEqual([f for f in left if f.startswith("pre-mongo-recreate-")], ["pre-mongo-recreate-20261030-010101.gz"])
        self.assertEqual([f for f in left if f.startswith("mongo-recreate-")], ["mongo-recreate-20261030-010101-docker-compose.production.yml"])
        self.assertEqual([f for f in left if f.startswith("pre-recreate-")], ["pre-recreate-20261027-000000.gz"])
        self.assertEqual([f for f in left if f.startswith("old-checkout-")], ["old-checkout-patient-web-1.tar.gz"])   # the newest archive
        nightly = [f for f in left if f.startswith("nabd_") and f.endswith(".gpg")]
        self.assertEqual(len(nightly), 2)
        for f in nightly:
            self.assertIn(f + ".oplogts", left)                                                  # each kept dump keeps its mark
        self.assertEqual(len([f for f in left if f.endswith(".oplogts")]), 2)
        self.assertIn("3 of 3 image(s)", p.stdout)
        calls = open(self.calls).read()
        self.assertIn("rmi nabdah-patient-web:v48", calls); self.assertIn("rmi nabdah-patient-web:v47", calls); self.assertIn("rmi 0fffffffffff", calls)
        self.assertNotIn("rmi nabdah-patient-web:v50", calls); self.assertNotIn("rmi nabdah-patient-web:v49", calls)   # the running release and one previous stay
        self.assertNotIn("mongo", calls.replace("mongo-recreate", ""))                           # third-party images are not touched
        self.assertIn("builder prune -f", calls); self.assertIn("--vacuum-size=100M", calls)
        self.assertFalse(os.path.isdir(os.path.join(self.d, "releases", "r1")))                  # only the current and the previous release dir stay
        self.assertTrue(os.path.isdir(os.path.join(self.d, "releases", "r2"))); self.assertTrue(os.path.isdir(os.path.join(self.d, "releases", "r3")))

    def test_a_file_changed_in_the_last_30_minutes_is_never_touched_and_never_counts_as_the_copy_that_stays(self):
        day = 24 * 60
        self.make("pre-deploy-new-empty.gz", 40, size=0)                                          # newest, empty: not a restore point
        self.make("pre-deploy-good1.gz", 1 * day); self.make("pre-deploy-good2.gz", 2 * day)
        self.make("pre-deploy-writing.gz", 5)                                                     # being written right now: may be incomplete
        p = self.run_task(apply=True)
        left = self.left()
        self.assertIn("pre-deploy-writing.gz", left)
        self.assertIn("pre-deploy-good1.gz", left)                                                # the last FINISHED dump stays next to the one being written
        self.assertNotIn("pre-deploy-good2.gz", left); self.assertNotIn("pre-deploy-new-empty.gz", left)
        self.assertIn("pre-deploy dumps: files=4 stay=2", p.stdout)

    def test_the_task_never_prints_the_environment_and_names_only_backup_files(self):
        self.fixture()
        p = self.run_task()
        self.assertNotRegex(p.stdout, r"(PASSWORD|SECRET|TOKEN|KEY)=")
        self.assertTrue(all(l.startswith(("status: retention:", "## retention")) for l in p.stdout.splitlines() if l.strip()))


if __name__ == "__main__":
    unittest.main()
