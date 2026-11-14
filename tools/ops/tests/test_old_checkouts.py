"""tools/ops/tasks/97d-old-checkouts.sh and tools/ops/release/prune-releases.sh on real temporary directories with a fake docker, sudo and crontab."""
import os
import re
import subprocess
import tarfile
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "97d-old-checkouts.sh")
PRUNE = os.path.join(HERE, "..", "release", "prune-releases.sh")


class OldCheckouts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name
        self.root = os.path.join(self.d, "nabdah")
        self.b = os.path.join(self.root, "backups")
        self.rel = os.path.join(self.root, "releases")
        self.cron = os.path.join(self.d, "cron.d"); self.units = os.path.join(self.d, "units")
        self.bin = os.path.join(self.d, "bin"); self.dklog = os.path.join(self.d, "docker.log")
        for p in (self.root, self.b, self.rel, self.cron, self.units, self.bin, os.path.join(self.root, "deploy", "scripts")):
            os.makedirs(p)
        self.inspect = os.path.join(self.d, "inspect"); os.makedirs(self.inspect)
        self.env_extra = {}

    def checkout(self, name, files=3):
        p = os.path.join(self.root, name)
        os.makedirs(os.path.join(p, "src")); os.makedirs(os.path.join(p, "node_modules", "dep"))
        for i in range(files):
            open(os.path.join(p, "src", f"f{i}.ts"), "w").write("x" * 100)
        open(os.path.join(p, "node_modules", "dep", "big.js"), "w").write("y" * 50000)
        return p

    def write(self, path, text):
        open(path, "w").write(text)

    def run_task(self, apply=False, volume_users="", volume_exists=True, containers=()):
        script = os.path.join(self.d, "task.sh")
        text = open(TASK).read().replace('HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)', f'HERE="{os.path.dirname(PRUNE)}/../tasks"')
        if apply:
            text = re.sub(r'(?m)^APPLY=""$', 'APPLY="yes"', text)
        open(script, "w").write(text)
        self.write(os.path.join(self.bin, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        ids = "\\n".join(containers)
        self.write(os.path.join(self.bin, "docker"), f'''#!/bin/bash
echo "$*" >> "{self.dklog}"
case "$1" in
  ps) if [ "$2" = -aq ]; then printf '{ids}\\n'; else printf '{volume_users}'; fi;;
  inspect) cat "{self.inspect}/$(echo "$@" | awk '{{print $NF}}')" 2>/dev/null;;
  volume) [ "$2" = inspect ] && {'exit 0' if volume_exists else 'exit 1'};;
esac
exit 0
''')
        self.write(os.path.join(self.bin, "crontab"), "#!/bin/bash\nexit 0\n")
        for n in ("sudo", "docker", "crontab"):
            os.chmod(os.path.join(self.bin, n), 0o755)
        env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", OPS_ROOT=self.root, OPS_BACKUP_DIR=self.b, OPS_RELEASE_DIR=self.rel,
                   OPS_CRON_PATHS=self.cron, OPS_SYSTEMD_DIRS=self.units, **self.env_extra)
        return subprocess.run(["bash", script], capture_output=True, text=True, env=env, timeout=120)

    def test_dry_run_proves_each_directory_and_changes_nothing(self):
        for n in ("nabdah-backend", "patient-web", "Napd-admin"):
            self.checkout(n)
        self.write(os.path.join(self.root, "deploy", "docker-compose.production.yml"),
                   "services:\n  backend:\n    build:\n      context: ../nabdah-backend\n")
        self.write(os.path.join(self.cron, "nabd"), f"0 3 * * * root cd {self.root}/Napd-admin && ./job.sh\n")
        r = self.run_task()
        out = r.stdout
        self.assertEqual(r.returncode, 0, out + r.stderr)
        self.assertRegex(out, r"nabdah-backend: IN USE: \d+ reference")
        self.assertRegex(out, r"nabdah-backend: evidence compose: [1-9]")
        self.assertRegex(out, r"Napd-admin: IN USE.*")
        self.assertRegex(out, r"Napd-admin: evidence cron: [1-9]")
        self.assertIn("patient-web: UNREFERENCED", out)
        self.assertIn("dry run only: nothing was changed", out)
        for n in ("nabdah-backend", "patient-web", "Napd-admin"):
            self.assertTrue(os.path.isdir(os.path.join(self.root, n)))
        self.assertEqual(os.listdir(self.b), [])

    def test_a_container_mount_or_a_systemd_unit_or_a_deploy_script_counts(self):
        for n in ("nabdah-backend", "patient-web", "Napd-admin"):
            self.checkout(n)
        self.write(os.path.join(self.inspect, "c1"), f"{self.root}/nabdah-backend/uploads\n\n/app\n")
        self.write(os.path.join(self.units, "x.service"), f"[Service]\nWorkingDirectory={self.root}/patient-web\n")
        self.write(os.path.join(self.root, "deploy", "scripts", "s.sh"), f"cd {self.root}/Napd-admin\n")
        out = self.run_task(containers=("c1",)).stdout
        self.assertIn("nabdah-backend: evidence container: 1", out)
        self.assertIn("patient-web: evidence systemd: 1", out)
        self.assertIn("Napd-admin: evidence script: 1", out)
        self.assertEqual(out.count("IN USE"), 3)
        self.assertNotIn("UNREFERENCED", out)

    def test_apply_archives_without_node_modules_deletes_only_the_unreferenced_one(self):
        for n in ("nabdah-backend", "patient-web", "Napd-admin"):
            self.checkout(n)
        self.write(os.path.join(self.cron, "nabd"), f"0 3 * * * root cd {self.root}/Napd-admin\n")
        self.write(os.path.join(self.root, "deploy", "docker-compose.production.yml"), "context: ../nabdah-backend\n")
        r = self.run_task(apply=True)
        out = r.stdout
        self.assertEqual(r.returncode, 0, out + r.stderr)
        self.assertFalse(os.path.exists(os.path.join(self.root, "patient-web")))
        self.assertTrue(os.path.isdir(os.path.join(self.root, "nabdah-backend")))
        self.assertTrue(os.path.isdir(os.path.join(self.root, "Napd-admin")))
        tgzs = [f for f in os.listdir(self.b) if f.startswith("old-checkout-patient-web-")]
        self.assertEqual(len(tgzs), 1)
        with tarfile.open(os.path.join(self.b, tgzs[0])) as t:
            names = t.getnames()
        self.assertTrue(any(n.endswith("src/f0.ts") for n in names))
        self.assertFalse(any("node_modules" in n for n in names))
        self.assertRegex(out, r"patient-web: deleted; freed about \d+ MB")
        self.assertIn("APPLIED: 1 directory(ies) archived and deleted", out)

    def test_a_symlink_and_a_name_with_a_slash_are_never_candidates(self):
        real = self.checkout("real")
        os.symlink(real, os.path.join(self.root, "patient-web"))
        self.env_extra["OPS_CHECKOUT_DIRS"] = "patient-web ../escape sub/dir"
        out = self.run_task(apply=True).stdout
        self.assertIn("patient-web: is a symlink: left alone", out)
        self.assertIn("../escape: skipped", out)
        self.assertIn("sub/dir: skipped", out)
        self.assertTrue(os.path.isdir(real))

    def test_the_volume_is_only_reported_never_removed(self):
        out = self.run_task(apply=True, volume_users="").stdout
        self.assertIn("volume mongodb_secondary_data: exists; containers using it: none; compose files naming it: none; NOTHING USES IT", out)
        out = self.run_task(volume_users="mongo2 (Up 2 days)").stdout
        self.assertIn("containers using it: mongo2 (Up 2 days)", out)
        self.assertIn("in use, keep", out)
        log = open(self.dklog).read()
        self.assertNotIn("volume rm", log)
        self.assertNotIn("rm ", log.replace("volume inspect", ""))

    def test_releases_keep_current_and_previous_only(self):
        now = time.time()
        for i, sha in enumerate(("aaaa1111", "bbbb2222", "cccc3333", "dddd4444")):
            p = os.path.join(self.rel, sha); os.makedirs(p)
            open(os.path.join(p, "deploy.tgz"), "w").write("x" * 1000)
            t = now - (i + 1) * 3600
            os.utime(p, (t, t))
        os.makedirs(os.path.join(self.rel, "notes")); open(os.path.join(self.rel, "notes", "x"), "w").write("keep")
        dry = subprocess.run(["bash", PRUNE], capture_output=True, text=True, env=dict(os.environ, REL_ROOT=self.rel, SUDO="env"))
        self.assertIn("would remove", dry.stdout)
        self.assertEqual(sorted(os.listdir(self.rel)), ["aaaa1111", "bbbb2222", "cccc3333", "dddd4444", "notes"])
        ap = subprocess.run(["bash", PRUNE], capture_output=True, text=True, env=dict(os.environ, REL_ROOT=self.rel, SUDO="env", APPLY="yes"))
        self.assertEqual(sorted(os.listdir(self.rel)), ["aaaa1111", "bbbb2222", "notes"], ap.stdout)
        self.assertIn("kept 2, removed 2", ap.stdout)

    def test_a_release_dir_written_in_the_last_minutes_is_not_removed(self):
        now = time.time()
        for i, sha in enumerate(("new11111", "new22222", "new33333")):
            p = os.path.join(self.rel, sha); os.makedirs(p)
            open(os.path.join(p, "deploy.tgz"), "w").write("x")
            os.utime(p, (now - i, now - i))
        ap = subprocess.run(["bash", PRUNE], capture_output=True, text=True, env=dict(os.environ, REL_ROOT=self.rel, SUDO="env", APPLY="yes"))
        self.assertEqual(len(os.listdir(self.rel)), 3, ap.stdout)


if __name__ == "__main__":
    unittest.main()
