"""tools/ops/tasks/96c-uploads-state.sh against fake docker / curl: read-only, names/counts/minutes only, never an environment value."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "96c-uploads-state.sh")
QUEUE = '{"storage_objects":{"pending_scan":4,"scanning":0,"infected":1,"failed":0,"clean":120,"oldest_waiting_min":950},"media_assets":{"pending_scan":2,"scanning":1,"infected":0,"failed":0,"clean":40,"oldest_waiting_min":35}}'


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class UploadsState(unittest.TestCase):
    def run_task(self, env_text="UPLOAD_SCAN=defer\nCLAMAV_ON_DEMAND=1\nSECRET_VALUE=do-not-print-me\n"):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        deploy = os.path.join(d, "deploy"); os.makedirs(os.path.join(deploy, "scripts")); cron = os.path.join(d, "cron"); os.makedirs(cron)
        with open(os.path.join(deploy, ".env.production"), "w") as f:
            f.write(env_text)
        write_exec(os.path.join(deploy, "scripts", "clamav-window.sh"), "#!/bin/bash\n")
        with open(os.path.join(cron, "nabd-clamav-window"), "w") as f:
            f.write("*/2 * * * * root /x/clamav-window.sh\n")
        logf = os.path.join(d, "nabd-backups.log")
        with open(logf, "w") as f:
            f.write("[t] clamav-window: 3 file(s) waiting but only 915 MB free (need 1700); ClamAV not started, the files stay in quarantine\n" * 5 + "[t] clamav-window: 2 file(s) waiting but only 1100 MB free (need 1700); ClamAV not started, the files stay in quarantine\n")
        calls = os.path.join(d, "calls.log")
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "curl"), '#!/bin/bash\necho \'{"features":{"uploads_enabled":true,"uploads_pending_scan":true}}\'\n')
        write_exec(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{calls}"
case "$1" in
  exec) echo '{QUEUE}';;
  inspect) case "$*" in *State.Status*) echo exited;; *RestartCount*) echo 0;; *HostConfig.Memory*) echo 1610612736;; *) echo;; esac;;
  stats) printf 'nabdah-mongodb=888MiB / 1.5GiB\\nnabdah-backend=388MiB / 768MiB\\n';;
esac
''')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], HOME=d, OPS_DEPLOY_DIR=deploy, OPS_CRON_DIR=cron, OPS_BACKUP_LOG=logf)
        p = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
        return p, open(calls).read()

    def test_says_what_users_get_in_names_and_counts(self):
        p, calls = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("UPLOAD_SCAN=defer", p.stdout)
        self.assertIn("window cron installed: 1 file(s)", p.stdout)
        self.assertIn("uploads_enabled=true uploads_pending_scan=true", p.stdout)
        self.assertIn("scan queue storage_objects: pending_scan=4", p.stdout); self.assertIn("oldest_waiting_min=950", p.stdout)
        self.assertIn("waited_for_memory=6", p.stdout); self.assertIn("lowest free MB it saw: 915", p.stdout)
        self.assertIn("mongodb=888MiB", p.stdout)

    def test_prints_no_environment_value_and_changes_nothing(self):
        p, calls = self.run_task()
        self.assertNotIn("do-not-print-me", p.stdout + p.stderr)
        verbs = {l.split(" ", 1)[0] for l in calls.splitlines() if l and not l.startswith(("const", "inspect -f"))}
        self.assertTrue(verbs <= {"exec", "inspect", "stats"}, verbs)               # only reads: no start, stop, up, rm, compose
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_an_unset_scan_mode_is_reported_as_unset(self):
        p, _ = self.run_task("SOMETHING=1\n")
        self.assertIn("UPLOAD_SCAN=unset (unset behaves as required in production)", p.stdout)


if __name__ == "__main__":
    unittest.main()
