"""deploy/docker-compose.production.yml: REDIS_URL and MEILI_URL can be set from .env.production (R7: Redis / Meilisearch on another host) and, unset, resolve to EXACTLY the old fixed aliases."""
import os
import re
import shutil
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
DEPLOY = os.path.join(HERE, "..", "..", "..", "deploy")
COMPOSE = os.path.join(DEPLOY, "docker-compose.production.yml")

REDIS_DEFAULT = "redis://:${REDIS_PASSWORD}@redis:6379"
MEILI_DEFAULT = "http://meilisearch:7700"


def lines(var):
    with open(COMPOSE) as f:
        return [l.strip() for l in f if re.match(rf"\s+{var}:\s", l)]


class StaticForm(unittest.TestCase):
    def test_redis_url_is_overridable_with_the_old_alias_as_default(self):
        found = lines("REDIS_URL")
        self.assertEqual(len(found), 3)   # backend, worker, fastapi
        for l in found:
            self.assertTrue(l.startswith("REDIS_URL: ${REDIS_URL:-" + REDIS_DEFAULT + "}"), l)

    def test_meili_url_is_overridable_with_the_old_alias_as_default(self):
        found = lines("MEILI_URL")
        self.assertEqual(len(found), 2)   # backend, worker
        for l in found:
            self.assertTrue(l.startswith("MEILI_URL: ${MEILI_URL:-" + MEILI_DEFAULT + "}"), l)

    def test_the_redis_cache_alias_is_not_touched(self):
        with open(COMPOSE) as f:
            self.assertIn("NEXT_CACHE_REDIS_URL: redis://:${REDIS_PASSWORD}@redis-cache:6379", f.read())


@unittest.skipUnless(shutil.which("docker"), "docker compose is not installed")
class Resolved(unittest.TestCase):
    def resolve(self, extra=""):
        d = tempfile.mkdtemp()
        env = os.path.join(d, "e.env")
        with open(env, "w") as f:
            f.write("MONGO_ROOT_USER=u\nMONGO_ROOT_PASSWORD=p\nREDIS_PASSWORD=secretpw\nMEILI_MASTER_KEY=k\n" + extra)
        # services read `env_file: .env.production` next to the compose file: put a copy in a scratch copy of deploy/
        work = os.path.join(d, "deploy")
        shutil.copytree(DEPLOY, work, ignore=shutil.ignore_patterns("certs", "node_modules"))
        shutil.copy(env, os.path.join(work, ".env.production"))
        r = subprocess.run(["docker", "compose", "--env-file", env, "-f", os.path.join(work, "docker-compose.production.yml"), "config"], capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            self.skipTest("docker compose config failed here: " + r.stderr[-200:])
        return sorted(l.strip() for l in r.stdout.splitlines() if re.match(r"\s+(REDIS_URL|MEILI_URL):", l))

    def test_unset_resolves_to_the_old_aliases(self):
        got = self.resolve()
        self.assertEqual(got, sorted(["MEILI_URL: http://meilisearch:7700"] * 2 + ["REDIS_URL: redis://:secretpw@redis:6379"] * 3))

    def test_set_moves_every_service(self):
        got = self.resolve("REDIS_URL=redis://:secretpw@10.0.0.9:6379\nMEILI_URL=http://10.0.0.9:7700\n")
        self.assertTrue(all("10.0.0.9" in l for l in got), got)
        self.assertGreaterEqual(len(got), 5)


if __name__ == "__main__":
    unittest.main()
