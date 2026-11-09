"""tools/ops/tasks/96k-mongo-restart-who.sh against a fake docker, sudo, journalctl and last: state, per-hour histogram, lines before starts, read-only."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96k-mongo-restart-who.sh")

FAKE_DOCKER = r"""#!/bin/bash
case "$1" in
  inspect) echo "restarts=359 policy=unless-stopped started=2026-11-09T10:01:02Z last_finished=2026-11-09T10:00:59Z exit_code=137 oom_killed=false error= health=healthy";;
  logs)
    echo '2026-11-09T08:10:00.000Z {"t":{"$date":"x"},"s":"I","c":"NETWORK","id":22943,"msg":"connection accepted"}'
    echo '2026-11-09T08:10:01.000Z {"t":{"$date":"x"},"s":"F","c":"ASSERT","id":23089,"msg":"Fatal assertion"}'
    echo '2026-11-09T08:10:09.000Z {"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4615611,"msg":"initializing"}'
    echo '2026-11-09T09:30:00.000Z {"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4615611,"msg":"initializing"}'
    echo '2026-11-09T09:40:00.000Z {"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4615611,"msg":"initializing"}';;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
FAKE_JOURNAL = '#!/bin/bash\ncase "$*" in *"-u docker"*) echo "Nov 09 09:29:59 host dockerd[1]: container nabdah-mongodb: exit 137";; *"-k"*) ;; esac\n'


def run():
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO), ("journalctl", FAKE_JOURNAL)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"]}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class Check(unittest.TestCase):
    def test_state_line(self):
        self.assertIn("restarts=359 policy=unless-stopped", run())
        self.assertIn("exit_code=137 oom_killed=false", run())

    def test_histogram_per_hour(self):
        out = run()
        self.assertIn("2026-11-09T08=1", out)
        self.assertIn("2026-11-09T09=2", out)
        self.assertIn("total starts=3", out)

    def test_lines_before_the_start_name_the_fatal_assertion(self):
        out = run()
        self.assertIn("id=23089 s=F c=ASSERT msg=Fatal assertion", out)
        self.assertIn("fatal_assertions=1", out)

    def test_docker_journal_line_is_shown(self):
        self.assertIn("docker: Nov 09 09:29:59 host dockerd[1]: container nabdah-mongodb: exit 137", run())

    def test_read_only(self):
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in ("$DK restart", "$DK stop", "$DK kill", "$DK rm ", "$DK run", "$DK exec", "tee ", " > /", "systemctl stop", "systemctl restart"):
            self.assertNotIn(bad, code)


if __name__ == "__main__":
    unittest.main()
