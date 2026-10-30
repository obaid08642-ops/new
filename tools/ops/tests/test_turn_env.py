"""tools/ops/tasks/70b-turn-env.sh against fake docker/sudo/curl: the Cloudflare TURN keys reach .env.production by NAME from a mode-600 key file, nothing secret is printed or
passed as an argument, a rejected key is never written, only the backend is recreated, and a backend that does not come back gets the old env back."""
import os
import stat
import unittest

import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_ops_tasks import Harness, write_exec  # noqa: E402

KEY, TOKEN = "0123456789abcdef0123456789abcdef", "cf-secret-token-7788"
FAKE_CURL = r"""#!/bin/bash
case "$*" in
  *--config*) read -r CFG; echo "$CFG" >> "$FAKE_CF_STDIN"; echo "$*" >> "$FAKE_CF_ARGS"; printf '%s' "${FAKE_CF_CODE:-200}";;
  *) printf '200';;
esac
"""


class TurnEnv(unittest.TestCase):
    def setUp(self):
        self.h = Harness(self)
        write_exec(os.path.join(self.h.bin, "curl"), FAKE_CURL)
        self.creds = os.path.join(self.h.tmp.name, "ops-turn.env")
        self.stdin_log = os.path.join(self.h.tmp.name, "cf.stdin")
        self.args_log = os.path.join(self.h.tmp.name, "cf.args")
        for f in ("docker-compose.production.yml", "docker-compose.release.yml"):
            open(os.path.join(self.h.deploy, f), "w").write("services: {}\n")

    def write_creds(self, body=None):
        with open(self.creds, "w") as f:
            f.write(body if body is not None else f"CF_TURN_KEY_ID={KEY}\nCF_TURN_API_TOKEN={TOKEN}\nOTHER=ignored\n")
        os.chmod(self.creds, 0o600)

    def run_task(self, settings=None, **extra):
        return self.h.run("70b-turn-env.sh", settings, OPS_TURN_CREDS=self.creds, FAKE_CF_STDIN=self.stdin_log, FAKE_CF_ARGS=self.args_log, **extra)

    def env_text(self):
        return open(self.h.envf).read()

    def test_dry_run_checks_the_key_writes_nothing_and_shreds_the_key_file(self):
        self.write_creds()
        before = self.env_text()
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("cloudflare credential request: http=200", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(self.env_text(), before)
        self.assertNotIn("force-recreate", self.h.docker_calls())
        self.assertFalse(os.path.exists(self.creds))
        self.assertNotIn(TOKEN, p.stdout + p.stderr + self.h.docker_calls())
        self.assertNotIn(TOKEN, open(self.args_log).read())                      # the token was on curl's stdin, not its arguments
        self.assertIn(f"Bearer {TOKEN}", open(self.stdin_log).read())

    def test_apply_writes_the_names_and_recreates_only_the_backend(self):
        self.write_creds()
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        env = self.env_text()
        self.assertIn(f"CF_TURN_KEY_ID={KEY}\n", env); self.assertIn(f"CF_TURN_API_TOKEN={TOKEN}\n", env)
        self.assertNotIn("OTHER=ignored", env)
        self.assertIn("JWT_SECRET=", env)                                          # the rest of the env is kept
        self.assertEqual(stat.S_IMODE(os.stat(self.h.envf).st_mode), 0o600)
        up = [l for l in self.h.docker_calls().splitlines() if " up " in l]
        self.assertEqual(len(up), 1); self.assertTrue(up[0].endswith("--no-deps --force-recreate backend"), up[0])
        self.assertIn("names set: CF_TURN_KEY_ID CF_TURN_API_TOKEN", p.stdout)
        self.assertNotIn(TOKEN, p.stdout + p.stderr + self.h.docker_calls())
        self.assertTrue(any(n.startswith("env-pre-turn-") for n in os.listdir(self.h.backups)))   # the copy before the change
        self.assertFalse(os.path.exists(self.creds))

    def test_a_rejected_key_is_never_written(self):
        self.write_creds()
        before = self.env_text()
        p = self.run_task({"APPLY": "yes"}, FAKE_CF_CODE=401)
        self.assertEqual(p.returncode, 1)
        self.assertIn("Cloudflare did not accept the key (http=401)", p.stdout)
        self.assertEqual(self.env_text(), before)
        self.assertNotIn("force-recreate", self.h.docker_calls())

    def test_missing_keys_abort_and_a_key_with_odd_characters_is_ignored(self):
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 1); self.assertIn("is missing", p.stdout)
        self.write_creds(f"CF_TURN_KEY_ID={KEY}\nCF_TURN_API_TOKEN=bad token with spaces\n")
        q = self.run_task({"APPLY": "yes"})
        self.assertEqual(q.returncode, 1); self.assertIn("key file found with 1 of 2 names", q.stdout)

    def test_the_provider_switch_is_written_and_validated(self):
        self.write_creds()
        p = self.run_task({"APPLY": "yes", "PROVIDER": "coturn"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("CALLS_TURN_PROVIDER=coturn\n", self.env_text())
        bad = self.run_task({"PROVIDER": "aws"})
        self.assertEqual(bad.returncode, 1); self.assertIn("PROVIDER must be", bad.stdout)

    def test_a_backend_that_does_not_come_back_gets_the_old_env_and_a_second_recreate(self):
        self.write_creds()
        before = self.env_text()
        p = self.run_task({"APPLY": "yes"}, FAKE_HEALTH="unhealthy")
        self.assertEqual(p.returncode, 1)
        self.assertIn("putting the env copy back", p.stdout)
        self.assertEqual(self.env_text(), before)
        self.assertEqual(len([l for l in self.h.docker_calls().splitlines() if " up " in l]), 2)

    def test_output_is_status_lines_only(self):
        self.write_creds()
        for line in self.run_task().stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)


if __name__ == "__main__":
    unittest.main()
