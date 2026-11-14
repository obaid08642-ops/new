"""tools/ops/tasks/96k-cloudinary-orphans.sh against a fake docker: dry-run command shape (never --apply), memory refusal, masked counts-only output."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96k-cloudinary-orphans.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo "${FAKE_STATE:-running}";;
  stats) echo "${FAKE_PCT:-55.20%}";;
  exec) printf '%s\n' "$FAKE_OUT"; exit "${FAKE_RC:-0}";;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
OUT = "cloudinary-orphans: 5 assets under nabd/ (12.0 MB): 2 referenced (3.0 MB), 3 orphans (9.0 MB)\nnoise that is not a status line\nfailed: connect mongodb://user:secret@db:27017 refused"


def run(**extra):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f:
            f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    log = os.path.join(d, "log")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_LOG": log, "FAKE_OUT": OUT, **extra}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    calls = ""
    if os.path.exists(log):
        with open(log) as f:
            calls = f.read()
    return r.stdout + r.stderr, calls


class Orphans(unittest.TestCase):
    def test_prints_the_counts_as_status_lines_and_masks_a_connection_string(self):
        out, _ = run()
        self.assertIn("status: cloudinary-orphans: 5 assets under nabd/ (12.0 MB): 2 referenced (3.0 MB), 3 orphans (9.0 MB)", out)
        self.assertNotIn("noise that is not a status line", out)
        self.assertNotIn("secret", out)

    def test_runs_the_compiled_cli_without_apply(self):
        _, calls = run()
        self.assertIn("node dist/scripts/cloudinary-orphans.js", calls)
        self.assertNotIn("--apply", calls)
        self.assertNotIn("CLOUDINARY_ORPHAN_CONFIRM", calls)

    def test_refuses_when_the_backend_is_busy_and_runs_nothing(self):
        out, calls = run(FAKE_PCT="91.0%")
        self.assertIn("REFUSE", out)
        self.assertNotIn("exec", calls)

    def test_refuses_when_the_container_is_not_running(self):
        out, calls = run(FAKE_STATE="exited")
        self.assertIn("REFUSE", out)
        self.assertNotIn("exec", calls)


if __name__ == "__main__":
    unittest.main()
