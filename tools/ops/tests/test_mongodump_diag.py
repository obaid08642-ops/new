"""tools/ops/tasks/96g-mongodump-diag.sh against a fake docker: four small steps, no --quiet in step 3, the password and user never printed, nothing left behind."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96g-mongodump-diag.sh")
PW = "pa'ss\"w0rd$x|y"
USER = "rootuser9"

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  rm) exit 0;;
  info) echo /var/lib/docker;;
  exec) case "$*" in *USERNAME*) echo "$FAKE_USER";; *PASSWORD*) echo "$FAKE_PW";; esac;;
  inspect) case "$*" in
      *State.ExitCode*) echo "$(cat "$FAKE_LOG.ec" 2>/dev/null || echo 0) false";;
      *IPAddress*) echo 172.20.0.5;; *Config.Image*) echo mongo:7.0;; *Networks*) echo "nabdah-prod_internal ";;
      *Health*) echo healthy;; *Status*) echo running;; *Restart*) echo 0;; *StartedAt*) echo 2026-11-08T10:00:00Z;; *OOMKilled*) echo false;; esac;;
  run)
    echo 0 > "$FAKE_LOG.ec"
    case "$*" in *--version*) echo "mongodump version: 100.9.4"; exit 0;; esac
    case "$*" in *--quiet*) [ -n "$FAKE_QUIET_BREAKS" ] && { echo 1 > "$FAKE_LOG.ec"; exit 1; };; esac
    case "$*" in *mongodump.yml*) [ -n "$FAKE_AUTH_FAILS" ] && { echo "Failed: auth error for user $FAKE_USER password $FAKE_PW" >&2; echo 1 > "$FAKE_LOG.ec"; exit 1; }; printf 'archive-bytes'; exit 0;; esac
    echo "Failed: (Unauthorized) command listCollections requires authentication" >&2; echo 1 > "$FAKE_LOG.ec"; exit 1;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run(full=False, **extra):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    log = os.path.join(d, "log")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_LOG": log, "FAKE_PW": PW, "FAKE_USER": USER, "OPS_BACKUP_DIR": d, **extra}
    task = TASK
    if full:
        task = os.path.join(d, "t.sh")
        with open(TASK) as src, open(task, "w") as dst: dst.write(src.read().replace('FULL=""', 'FULL="yes"', 1))
    r = subprocess.run(["bash", task], env=env, capture_output=True, text=True, timeout=60)
    calls = open(log).read() if os.path.exists(log) else ""
    return r.stdout + r.stderr, calls


class Diag(unittest.TestCase):
    def test_four_steps_and_the_noauth_answer_is_shown(self):
        out, calls = run()
        for s in ("step 1 binary", "step 2 network", "step 3 credentials, no --quiet", "step 4 credentials, the production flags"):
            self.assertIn(s, out)
        self.assertIn("requires authentication", out)
        self.assertIn("stdout_bytes=13", out)   # authenticated steps got archive bytes

    def test_step_3_runs_without_quiet_and_step_4_with_it(self):
        _, calls = run()
        runs = [l for l in calls.splitlines() if l.startswith("run ")]
        self.assertEqual(len(runs), 4)
        self.assertNotIn("--quiet", runs[2])
        self.assertIn("--quiet", runs[3])

    def test_quiet_breaking_is_visible_as_empty_stderr_in_step_4_only(self):
        out, _ = run(FAKE_QUIET_BREAKS="1")
        step4 = out[out.index("step 4 prodflags"):]
        self.assertIn("container_exit=1", step4)
        self.assertIn("(stderr is empty)", step4)
        self.assertIn("step 3 auth: docker run rc=0", out)

    def test_password_and_user_never_printed_and_argv_has_no_password(self):
        out, calls = run(FAKE_AUTH_FAILS="1")
        self.assertIn("auth error", out)
        for secret in (PW, USER):
            self.assertNotIn(secret, out)
            self.assertNotIn(secret, calls.replace("--username=" + USER, ""))
        self.assertIn("<hidden>", out)

    def test_every_step_container_is_removed(self):
        _, calls = run()
        self.assertEqual(len([l for l in calls.splitlines() if l.startswith("rm -f")]), 4)

    def test_step_5_is_off_by_default_and_runs_the_production_scope_with_no_quiet(self):
        out, calls = run()
        self.assertNotIn("step 5", out)
        out, calls = run(full=True)
        self.assertIn("step 5 full dump", out)
        run5 = [l for l in calls.splitlines() if l.startswith("run ")][-1]
        self.assertIn("--gzip --archive", run5)
        self.assertNotIn("--quiet", run5)
        self.assertNotIn("--db=", run5)
        self.assertIn("gzip_archive_bytes=13", out)


if __name__ == "__main__":
    unittest.main()
