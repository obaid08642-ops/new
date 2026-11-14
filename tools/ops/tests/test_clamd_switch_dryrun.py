"""tools/ops/tasks/96f-clamd-switch-dryrun.sh: read-only, names and yes/no only, never a value."""
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96f-clamd-switch-dryrun.sh")
COMPOSE = "      CLAMD_HOST: ${CLAMD_HOST:-clamav}\n      CLAMD_PORT: ${CLAMD_PORT:-3310}\n" * 2


def run(env_text, new_host="", compose=COMPOSE):
    d = tempfile.mkdtemp()
    open(os.path.join(d, ".env.production"), "w").write(env_text)
    open(os.path.join(d, "docker-compose.production.yml"), "w").write(compose)
    script = open(TASK).read().replace('CLAMD_NEW_HOST=""', 'CLAMD_NEW_HOST="%s"' % new_host, 1)
    p = os.path.join(d, "t.sh"); open(p, "w").write(script)
    r = subprocess.run(["bash", p], env={**os.environ, "OPS_DEPLOY_DIR": d}, capture_output=True, text=True, timeout=30)
    return r.stdout, d


class Dryrun(unittest.TestCase):
    def test_unset_everything_would_be_set_and_nothing_is_written(self):
        out, d = run("OTHER=1\n", "10.77.0.2")
        self.assertIn("CLAMD_HOST: not set today -> would be set", out)
        self.assertIn("UPLOAD_SCAN: not set today -> would be set", out)
        self.assertIn("kind=private", out)
        self.assertIn("compose reads CLAMD_HOST for backend and worker: yes", out)
        self.assertEqual(open(os.path.join(d, ".env.production")).read(), "OTHER=1\n")

    def test_values_are_never_printed(self):
        out, _ = run("CLAMD_HOST=10.9.8.7\nUPLOAD_SCAN=defer\n", "10.77.0.2")
        self.assertNotIn("10.9.8.7", out)
        self.assertNotIn("10.77.0.2", out)
        self.assertIn("UPLOAD_SCAN: set today to another value -> would change", out)

    def test_public_address_is_refused(self):
        out, _ = run("", "203.0.113.5")
        self.assertIn("REFUSE", out)
        self.assertNotIn("203.0.113.5", out)

    def test_already_switched(self):
        out, _ = run("UPLOAD_SCAN=required\nCLAMAV_ON_DEMAND=0\n")
        self.assertIn("UPLOAD_SCAN: already the wanted value -> no change", out)

    def test_compose_that_does_not_read_the_vars_is_reported(self):
        out, _ = run("", "10.77.0.2", compose="nothing\n")
        self.assertIn("compose reads CLAMD_HOST for backend and worker: NO", out)


if __name__ == "__main__":
    unittest.main()
