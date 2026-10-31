"""tools/ops/tasks/99-translate-resume-cron.sh against a fake docker/sudo and temp dirs: dry run changes nothing, apply is hash-guarded, the installed helper sends nothing when the hash differs and logs counts only."""
import hashlib
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "99-translate-resume-cron.sh")
REQ = b'{"id":"a"}\n{"id":"b"}\n'
SHA = hashlib.sha256(REQ).hexdigest()


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class ResumeCron(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup); self.t = t.name
        self.b = os.path.join(self.t, "bin"); os.makedirs(self.b)
        self.w = os.path.join(self.t, "work"); os.makedirs(self.w)
        self.cron = os.path.join(self.t, "cron.d"); os.makedirs(self.cron)
        self.helper = os.path.join(self.t, "opt", "resume.sh")
        self.log = os.path.join(self.t, "docker.log")
        with open(os.path.join(self.w, "requests.jsonl"), "wb") as f:
            f.write(REQ)
        write_exec(os.path.join(self.b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(self.b, "chown"), "#!/bin/bash\nexit 0\n")
        write_exec(os.path.join(self.b, "docker"), f'#!/bin/bash\necho "$@" >> "{self.log}"\ncase "$1" in\n  inspect) echo healthy;;\n  exec) case "$*" in *"cat >"*) cat >/dev/null;; *"cat /tmp"*) echo \'{{"id":"a"}}\';; esac;;\nesac\nexit 0\n')

    def run_task(self, **kv):
        src = open(TASK).read()
        for k, v in kv.items():
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.t, "task.sh")
        write_exec(script, src)
        env = dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"], OPS_TRANSLATE_DIR=self.w, OPS_CRON_DIR=self.cron,
                   OPS_RESUME_HELPER=self.helper, OPS_RESUME_LOG=os.path.join(self.t, "r.log"))
        return subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=30)

    def test_dry_run_installs_nothing(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn(f"sha256={SHA}", p.stdout)
        self.assertEqual(os.listdir(self.cron), [])
        self.assertFalse(os.path.exists(self.helper))

    def test_apply_needs_the_matching_hash(self):
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1); self.assertIn("at least 32 hex", p.stdout)
        p = self.run_task(APPLY="yes", REQUESTS_SHA="0" * 32)
        self.assertEqual(p.returncode, 1); self.assertIn("requests changed", p.stdout)
        self.assertEqual(os.listdir(self.cron), [])

    def test_apply_installs_cron_at_0030_utc_and_the_helper_logs_counts_only(self):
        p = self.run_task(APPLY="yes", REQUESTS_SHA=SHA[:40])
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        cron = open(os.path.join(self.cron, "nabd-translate-resume")).read()
        self.assertIn("30 0 * * * root", cron)
        h = subprocess.run(["bash", self.helper], env=dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"]), capture_output=True, text=True, timeout=30)
        self.assertEqual(h.returncode, 0, h.stdout + h.stderr)
        self.assertRegex(h.stdout.strip(), r"^\S+ translate-resume: exit=0 answers=\d+$")
        self.assertIn("run --requests=", open(self.log).read())

    def test_helper_sends_nothing_when_the_requests_changed(self):
        self.run_task(APPLY="yes", REQUESTS_SHA=SHA)
        with open(os.path.join(self.w, "requests.jsonl"), "ab") as f:
            f.write(b'{"id":"c"}\n')
        h = subprocess.run(["bash", self.helper], env=dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"]), capture_output=True, text=True, timeout=30)
        self.assertIn("nothing sent", h.stdout)
        self.assertNotIn("run --requests=", open(self.log).read() if os.path.exists(self.log) else "")

    def test_rollback_removes_cron_and_helper(self):
        self.run_task(APPLY="yes", REQUESTS_SHA=SHA)
        p = self.run_task(ROLLBACK="yes")
        self.assertEqual(p.returncode, 0)
        self.assertEqual(os.listdir(self.cron), []); self.assertFalse(os.path.exists(self.helper))


if __name__ == "__main__":
    unittest.main()
