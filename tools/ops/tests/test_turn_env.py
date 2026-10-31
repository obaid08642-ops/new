"""tools/ops/tasks/70b-turn-env.sh with a fake curl, docker and sudo on a temporary deploy dir, and the workflow step that hands the keys over: no value is ever printed or put on a command line."""
import os
import re
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "70b-turn-env.sh")
WORKFLOW = os.path.join(HERE, "..", "..", "..", ".github", "workflows", "server-inspect.yml")
KEY_ID = "keyid-3f9c1a77"
TOKEN = "tok-SECRET-8d21b4e0c5"


class TurnEnv(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        d = self.d = self.tmp.name
        self.deploy = os.path.join(d, "deploy"); self.backups = os.path.join(d, "backups"); self.bin = os.path.join(d, "bin")
        for p in (self.deploy, self.backups, self.bin):
            os.makedirs(p)
        self.envf = os.path.join(self.deploy, ".env.production")
        self.w(self.envf, "NODE_ENV=production\nJWT_SECRET=do-not-print-me\n")
        self.creds = os.path.join(d, "ops-turn.env")
        self.w(self.creds, f"CF_TURN_KEY_ID={KEY_ID}\nCF_TURN_API_TOKEN={TOKEN}\n")
        self.calls = os.path.join(d, "calls.log"); self.curl_in = os.path.join(d, "curl.stdin")
        self.w(os.path.join(self.deploy, "docker-compose.production.yml"), "services: {}\n")
        self.script("sudo", '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        self.script("docker", f'''#!/bin/bash
echo "docker $*" >> "{self.calls}"
case "$1" in inspect) echo healthy;; esac
exit 0
''')

    def w(self, path, text):
        with open(path, "w") as f:
            f.write(text)

    def script(self, name, body):
        p = os.path.join(self.bin, name); self.w(p, body); os.chmod(p, 0o755)

    def curl(self, code):
        self.script("curl", f'''#!/bin/bash
echo "curl $*" >> "{self.calls}"
case "$*" in
  *credentials/generate*) cat > "{self.curl_in}"; printf '{code}';;
  *) printf '200';;
esac
''')

    def run_task(self, apply=False, provider=None, creds=True, code="200"):
        self.curl(code)
        text = open(TASK).read()
        if apply:
            text = re.sub(r'(?m)^APPLY=""$', 'APPLY="yes"', text)
        if provider is not None:
            text = re.sub(r'(?m)^PROVIDER="[a-z]*"$', f'PROVIDER="{provider}"', text)
        script = os.path.join(self.d, "task.sh"); self.w(script, text)
        if not creds and os.path.exists(self.creds):
            os.remove(self.creds)
        env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", HOME=self.d, OPS_DEPLOY_DIR=self.deploy, OPS_BACKUP_DIR=self.backups, OPS_TURN_CREDS=self.creds,
                   OPS_CF_TURN_API="https://cf.invalid/v1/turn/keys", OPS_WAIT_TRIES="2", OPS_WAIT_SLEEP="0")
        return subprocess.run(["bash", script], capture_output=True, text=True, env=env, timeout=60)

    def everything(self, r):
        return r.stdout + r.stderr + open(self.calls).read() if os.path.exists(self.calls) else r.stdout + r.stderr

    def test_the_provider_is_cloudflare_by_default_and_the_dry_run_prints_ok_only(self):
        self.assertRegex(open(TASK).read(), r'(?m)^PROVIDER="cloudflare"$')
        r = self.run_task()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("cloudflare credential request (10-minute credential): ok", r.stdout)
        self.assertNotRegex(r.stdout, r"http=|200")                              # no status code, no body
        self.assertIn("names that would be set: CF_TURN_KEY_ID CF_TURN_API_TOKEN CALLS_TURN_PROVIDER", r.stdout)
        self.assertIn("dry run only", r.stdout)

    def test_the_dry_run_writes_and_restarts_nothing_and_shreds_the_key_file(self):
        before = open(self.envf).read()
        r = self.run_task()
        self.assertEqual(open(self.envf).read(), before)
        self.assertEqual(os.listdir(self.backups), [])
        self.assertFalse(os.path.exists(self.creds))                              # read once, then shredded whatever happens
        self.assertNotIn("compose", open(self.calls).read())                      # nothing recreated
        self.assertEqual(r.returncode, 0)

    def test_no_value_is_ever_printed_or_put_on_a_command_line_and_the_token_goes_to_curl_on_stdin(self):
        for apply in (False, True):
            self.w(self.creds, f"CF_TURN_KEY_ID={KEY_ID}\nCF_TURN_API_TOKEN={TOKEN}\n")
            r = self.run_task(apply=apply)
            allout = r.stdout + r.stderr
            self.assertNotIn(TOKEN, allout)
            self.assertNotIn("do-not-print-me", allout)
            calls = open(self.calls).read()
            self.assertNotIn(TOKEN, calls)                                        # not an argument of any command
        self.assertIn(TOKEN, open(self.curl_in).read())                           # it reached curl through --config - on stdin
        for line in r.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_a_key_cloudflare_refuses_is_never_written(self):
        before = open(self.envf).read()
        r = self.run_task(apply=True, code="403")
        self.assertEqual(r.returncode, 1)
        self.assertIn("credential request (10-minute credential): fail", r.stdout)
        self.assertIn("ABORT Cloudflare did not accept the key", r.stdout)
        self.assertEqual(open(self.envf).read(), before)
        self.assertNotIn("compose", open(self.calls).read())
        self.assertNotIn("403", r.stdout)

    def test_apply_writes_the_names_with_the_provider_and_recreates_only_the_backend(self):
        r = self.run_task(apply=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        env = open(self.envf).read()
        self.assertIn(f"CF_TURN_KEY_ID={KEY_ID}", env)
        self.assertIn(f"CF_TURN_API_TOKEN={TOKEN}", env)
        self.assertIn("CALLS_TURN_PROVIDER=cloudflare", env)
        self.assertIn("JWT_SECRET=do-not-print-me", env)                          # the rest of the file is kept
        self.assertEqual(oct(os.stat(self.envf).st_mode & 0o777), "0o600")
        up = [l for l in open(self.calls).read().splitlines() if " up -d " in l]
        self.assertEqual(len(up), 1)
        self.assertIn("--no-deps --force-recreate backend", up[0])
        self.assertTrue(any(f.startswith("env-pre-turn-") for f in os.listdir(self.backups)))   # the copy saved first
        self.assertIn("names set: CF_TURN_KEY_ID CF_TURN_API_TOKEN CALLS_TURN_PROVIDER", r.stdout)
        self.assertIn("backend recreated: healthy, API ready", r.stdout)

    def test_the_provider_can_be_switched_back_to_coturn_without_the_keys(self):
        r = self.run_task(apply=True, provider="coturn", creds=False)
        self.assertEqual(r.returncode, 1)                                          # no keys anywhere: stops
        self.assertIn("CF_TURN_KEY_ID or CF_TURN_API_TOKEN is missing", r.stdout)
        self.w(self.envf, f"NODE_ENV=production\nCF_TURN_KEY_ID={KEY_ID}\nCF_TURN_API_TOKEN={TOKEN}\nCALLS_TURN_PROVIDER=cloudflare\n")
        r = self.run_task(apply=True, provider="coturn", creds=False)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("CALLS_TURN_PROVIDER=coturn", open(self.envf).read())


class WorkflowHandover(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import yaml
        cls.wf = yaml.safe_load(open(WORKFLOW))
        cls.text = open(WORKFLOW).read()
        cls.steps = cls.wf["jobs"]["ops"]["steps"]

    def step(self, prefix):
        return next(s for s in self.steps if str(s.get("name", "")).startswith(prefix))

    def test_the_secrets_are_read_only_by_the_handover_step_and_only_when_the_task_is_listed(self):
        hand = self.step("Hand the Cloudflare TURN keys")
        self.assertEqual(hand["env"]["CF_TURN_KEY_ID"], "${{ secrets.CF_TURN_KEY_ID }}")
        self.assertEqual(hand["env"]["CF_TURN_API_TOKEN"], "${{ secrets.CF_TURN_API_TOKEN }}")
        self.assertEqual(self.text.count("secrets.CF_TURN_KEY_ID"), 1)
        self.assertEqual(self.text.count("secrets.CF_TURN_API_TOKEN"), 1)
        self.assertIn("70b-turn-env", hand["run"])
        self.assertTrue(self.wf["jobs"]["ops"]["environment"] == "production")      # the secrets live in the production environment (the owner's approval gate)

    def test_the_values_go_on_ssh_stdin_into_a_mode_600_file_and_are_never_echoed(self):
        run = self.step("Hand the Cloudflare TURN keys")["run"]
        self.assertIn("umask 077; cat > \"$HOME/ops-turn.env\"", run)
        self.assertRegex(run, r"printf 'CF_TURN_KEY_ID=%s\\nCF_TURN_API_TOKEN=%s\\n' \"\$CF_TURN_KEY_ID\" \"\$CF_TURN_API_TOKEN\" \\\n\s+\| ssh")
        for line in run.splitlines():
            if line.strip().startswith("echo"):
                self.assertNotIn("$CF_TURN", line)

    def test_order_hand_over_then_run_then_remove_then_drop_the_ssh_key(self):
        names = [str(s.get("name", "")) for s in self.steps]
        i_hand = next(i for i, n in enumerate(names) if n.startswith("Hand the Cloudflare TURN"))
        i_run = names.index("Run tasks")
        i_rm = next(i for i, n in enumerate(names) if n.startswith("Remove the TURN key file"))
        i_key = names.index("Cleanup key")
        self.assertLess(i_hand, i_run); self.assertLess(i_run, i_rm); self.assertLess(i_rm, i_key)
        self.assertEqual(self.step("Remove the TURN key file")["if"], "${{ always() }}")


if __name__ == "__main__":
    unittest.main()
