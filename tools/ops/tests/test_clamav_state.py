"""tools/ops/tasks/96m-clamav-state.sh against a fake docker and sudo: container state, mode words, memory short-fall, queue count, read-only."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96m-clamav-state.sh")

FAKE_DOCKER = r"""#!/bin/bash
case "$1" in
  inspect) echo "running=false status=exited restarts=0 limit_mb=1500 started=2026-11-09T10:00:00Z";;
  stats) echo "0B / 0B";;
  exec)
    case "$*" in
      *"printenv UPLOAD_SCAN"*) echo defer;;
      *"printenv CLAMAV_ON_DEMAND"*) echo 1;;
      *"printenv CLAMD_HOST"*) echo 10.0.0.9;;
      *mongosh*) echo 3;;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run():
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"]}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class Check(unittest.TestCase):
    def test_container_mode_queue(self):
        out = run()
        self.assertIn("running=false status=exited", out)
        self.assertIn("UPLOAD_SCAN=defer CLAMAV_ON_DEMAND=1", out)
        self.assertIn("files waiting for a scan: 3", out)

    def test_window_line_compares_memory_with_the_minimum(self):
        out = run()
        self.assertTrue("short of CLAMAV_MIN_FREE_MB 1700" in out or "is at least CLAMAV_MIN_FREE_MB 1700" in out)

    def test_no_address_or_secret_and_read_only(self):
        out = run()
        self.assertNotIn("10.0.0.9", out)
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in ("$DK restart", "$DK stop", "$DK start", "$DK kill", "$DK rm ", "$DK run", "tee ", " > /"):
            self.assertNotIn(bad, code)


if __name__ == "__main__":
    unittest.main()
