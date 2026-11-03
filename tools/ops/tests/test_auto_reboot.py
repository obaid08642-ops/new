"""tools/uptime/auto-reboot.sh against a fake curl: acts only on a hung host, only after enough failures, with a dry-run default, a cooldown and a daily limit; both provider requests."""
import hashlib
import json
import os
import stat
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uptime", "auto-reboot.sh")
FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
cfg = sys.stdin.read() if "--config" in args else ""
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
def save(): json.dump(st, open(st_path, "w"))
if method == "POST":
    st["posts"].append(url); st["config"] = cfg; save()
    sys.stdout.write(str(st["reboot_code"])); sys.exit(0)
if url.endswith("/auth/time"): sys.stdout.write("1800000000"); sys.exit(0)
if "/api/v1/health" in url: sys.stdout.write(str(st["api"])); sys.exit(0)
if url.endswith("/ar"): sys.stdout.write(str(st["page"])); sys.exit(0)
sys.stdout.write("202")
'''


class AutoReboot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        self.bin = os.path.join(d, "bin"); os.makedirs(self.bin)
        p = os.path.join(self.bin, "curl")
        with open(p, "w") as f:
            f.write(FAKE_CURL)
        os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
        self.state = os.path.join(d, "fake.json"); self.sd = os.path.join(d, "state"); os.makedirs(self.sd)
        self.mails = os.path.join(d, "mails"); self.now = 1800000000

    def go(self, fails=3, page=522, api=522, reboot_code=200, **env):
        with open(os.path.join(self.sd, "fails"), "w") as f:
            f.write(str(fails))
        with open(self.state, "w") as f:
            json.dump({"page": page, "api": api, "posts": [], "reboot_code": reboot_code}, f)
        e = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, STATE_DIR=self.sd, AUTO_NOW_EPOCH=str(self.now), SITE_URL="https://nabd.plus",
                 UPTIME_MAIL_CMD=f"tee -a {self.mails}", AUTO_REBOOT="1", PROVIDER="hetzner", HETZNER_API_TOKEN="tok-secret-123", HETZNER_SERVER_ID="42")
        e.update(env)
        return subprocess.run(["bash", SCRIPT], env=e, capture_output=True, text=True, timeout=60)

    def posts(self):
        with open(self.state) as f:
            return json.load(f)["posts"]

    def mail_text(self):
        if not os.path.exists(self.mails):
            return ""
        with open(self.mails) as f:
            return f.read()

    def test_hung_host_after_enough_failures_is_hard_reset_and_the_owner_is_mailed(self):
        r = self.go()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.posts(), ["https://api.hetzner.cloud/v1/servers/42/actions/reset"])
        self.assertIn("AUTO-REBOOT", self.mail_text())
        self.assertNotIn("tok-secret-123", r.stdout + r.stderr + self.mail_text())

    def test_default_is_a_dry_run(self):
        r = self.go(AUTO_REBOOT="0")
        self.assertIn("DRY RUN", r.stdout)
        self.assertEqual(self.posts(), [])

    def test_waits_for_enough_consecutive_failures(self):
        r = self.go(fails=2)
        self.assertIn("needs 3", r.stdout)
        self.assertEqual(self.posts(), [])

    def test_does_not_reboot_for_a_crashed_app_only_for_a_hung_host(self):
        for page, api in ((502, 502), (200, 500), (522, 200), (503, 522), (404, 404)):
            self.go(page=page, api=api)
            self.assertEqual(self.posts(), [], (page, api))
        self.assertEqual(self.go(page="000", api="000").returncode, 0)
        self.assertEqual(len(self.posts()), 1)           # no answer at all (000) counts as hung

    def test_cooldown_and_daily_limit(self):
        self.go()
        self.assertEqual(len(self.posts()), 1)
        r = self.go()                                       # same moment again
        self.assertIn("cooldown", r.stdout); self.assertEqual(self.posts(), [])
        self.now += 7 * 3600
        self.assertEqual(self.go().returncode, 0); self.assertEqual(len(self.posts()), 1)      # 7 h later: second reboot of the day allowed
        self.now += 7 * 3600
        r = self.go()
        self.assertIn("already 2 reboot(s) in 24 h", r.stdout); self.assertEqual(self.posts(), [])
        self.now += 20 * 3600
        self.assertEqual(self.go().returncode, 0); self.assertEqual(len(self.posts()), 1)      # the oldest left the 24 h window

    def test_a_failed_request_exits_1_and_is_not_counted_as_a_reboot(self):
        r = self.go(reboot_code=403)
        self.assertEqual(r.returncode, 1)
        self.assertFalse(os.path.exists(os.path.join(self.sd, "reboots")))

    def test_missing_secrets_block_without_a_request(self):
        r = self.go(HETZNER_API_TOKEN="")
        self.assertEqual(r.returncode, 1)
        self.assertIn("BLOCKED", r.stdout)
        self.assertEqual(self.posts(), [])

    def test_ovh_request_is_signed_as_ovh_documents(self):
        r = self.go(PROVIDER="ovh", OVH_APP_KEY="ak", OVH_APP_SECRET="as-secret", OVH_CONSUMER_KEY="ck", OVH_SERVICE_NAME="vps-1.example.net", OVH_API="https://eu.api.ovh.com/1.0")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.posts(), ["https://eu.api.ovh.com/1.0/vps/vps-1.example.net/reboot"])
        self.assertNotIn("as-secret", r.stdout + r.stderr)
        want = "$1$" + hashlib.sha1("as-secret+ck+POST+https://eu.api.ovh.com/1.0/vps/vps-1.example.net/reboot++1800000000".encode()).hexdigest()
        with open(self.state) as f:
            cfg = json.load(f)["config"]
        self.assertIn(f'header = "X-Ovh-Signature: {want}"', cfg)
        self.assertIn('header = "X-Ovh-Application: ak"', cfg)
        self.assertIn('header = "X-Ovh-Consumer: ck"', cfg)
        self.assertIn('header = "X-Ovh-Timestamp: 1800000000"', cfg)

    def test_unknown_provider_is_blocked(self):
        r = self.go(PROVIDER="")
        self.assertEqual(r.returncode, 1); self.assertEqual(self.posts(), [])


if __name__ == "__main__":
    unittest.main()
