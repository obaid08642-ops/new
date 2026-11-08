"""tools/ops/tasks/102-data-services-move-dryrun.sh: read-only, names and yes/no only."""
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "102-data-services-move-dryrun.sh")
FIXED = "      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379\n      MEILI_URL: http://meilisearch:7700\n"
OPEN = "      REDIS_URL: ${REDIS_URL:-x}\n      MEILI_URL: ${MEILI_URL:-y}\n"


def run(compose, env="", redis="", meili=""):
    d = tempfile.mkdtemp()
    with open(os.path.join(d, "docker-compose.production.yml"), "w") as f: f.write(compose)
    with open(os.path.join(d, ".env.production"), "w") as f: f.write(env)
    s = open(TASK).read().replace('NEW_REDIS_HOST=""', 'NEW_REDIS_HOST="%s"' % redis, 1).replace('NEW_MEILI_HOST=""', 'NEW_MEILI_HOST="%s"' % meili, 1)
    p = os.path.join(d, "t.sh")
    with open(p, "w") as f: f.write(s)
    r = subprocess.run(["bash", p], env={**os.environ, "OPS_DEPLOY_DIR": d}, capture_output=True, text=True, timeout=30)
    return r.stdout, d


class Dryrun(unittest.TestCase):
    def test_fixed_aliases_are_reported_and_nothing_is_written(self):
        out, d = run(FIXED, "A=1\n", "10.77.0.2", "10.77.0.2")
        self.assertIn("redis: compose fixes REDIS_URL to the Docker alias", out)
        self.assertIn("meilisearch: compose fixes MEILI_URL to the Docker alias", out)
        self.assertIn("candidate address kind=private", out)
        self.assertIn("rollback:", out)
        self.assertEqual(open(os.path.join(d, ".env.production")).read(), "A=1\n")

    def test_overridable_compose(self):
        out, _ = run(OPEN, "MEILI_URL=http://secret-host:7700\n")
        self.assertIn("compose does not fix REDIS_URL", out)
        self.assertIn("meilisearch: MEILI_URL set in .env.production today: yes", out)

    def test_values_and_addresses_never_printed(self):
        out, _ = run(FIXED, "REDIS_URL=redis://:hunter2@h:6379\n", "10.9.9.9", "10.9.9.8")
        for bad in ("hunter2", "10.9.9.9", "10.9.9.8"):
            self.assertNotIn(bad, out)

    def test_public_address_refused(self):
        out, _ = run(FIXED, "", "203.0.113.7")
        self.assertIn("REFUSE", out)
        self.assertNotIn("203.0.113.7", out)

    def test_missing_compose(self):
        d = tempfile.mkdtemp()
        r = subprocess.run(["bash", TASK], env={**os.environ, "OPS_DEPLOY_DIR": d}, capture_output=True, text=True, timeout=30)
        self.assertIn("cannot read the compose file", r.stdout)


if __name__ == "__main__":
    unittest.main()
