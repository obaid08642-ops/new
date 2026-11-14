"""tools/uptime/external-uptime.sh against a fake curl: two failures in a row -> ONE mail, no spam while down, one recovery mail, provider fallback,
a mail that cannot be sent fails the run. No network, no secrets."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uptime", "external-uptime.sh")
FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
url = [a for a in args if a.startswith("http")][-1]
def out(c): sys.stdout.write(str(c))
if "/api/v1/health" in url: out(st["api"]); sys.exit(0)
if url.endswith("/ar"): out(st["page"]); sys.exit(0)
# a mail provider
sys.stdin.read() if "--data" in args else None
name = url.split("//")[1].split("/")[0]
st["mail_calls"].append(name)
json.dump(st, open(st_path, "w"))
out(st["mail_codes"].get(name, 202))
'''


class Uptime(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        self.bin = os.path.join(d, "bin"); os.makedirs(self.bin)
        for name, text in (("curl", FAKE_CURL), ("sleep", "#!/bin/bash\nexit 0\n")):
            p = os.path.join(self.bin, name)
            with open(p, "w") as f: f.write(text)
            os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
        self.state = os.path.join(d, "fake.json")
        self.sd = os.path.join(d, "state")
        self.mails = os.path.join(d, "mails")
        self.now = 1800000000

    def run_check(self, page=200, api=200, mail_cmd=True, mail_codes=None, **env):
        with open(self.state, "w") as f: json.dump({"page": page, "api": api, "mail_calls": [], "mail_codes": mail_codes or {}}, f)
        e = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, STATE_DIR=self.sd, UPTIME_NOW_EPOCH=str(self.now),
                 SITE_URL="https://nabd.plus")
        for k in ("OPS_ALERT_EMAIL", "MAIL_FROM", "RESEND_API_KEY", "BREVO_API_KEY", "MAILJET_API_KEY", "MAILJET_SECRET_KEY"):
            e.pop(k, None)
        if mail_cmd: e["UPTIME_MAIL_CMD"] = f"tee -a {self.mails}"
        e.update(env)
        self.now += 300
        return subprocess.run(["bash", SCRIPT], env=e, capture_output=True, text=True, timeout=60)

    def subjects(self):
        if not os.path.exists(self.mails): return []
        return [l[9:] for l in self.text().splitlines() if l.startswith("SUBJECT: ")]

    def text(self):
        with open(self.mails) as f:
            return f.read()

    def fake(self):
        with open(self.state) as f: return json.load(f)

    def test_healthy_sends_nothing(self):
        p = self.run_check()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(self.subjects(), [])

    def test_one_failure_is_not_an_alert(self):
        p = self.run_check(api=502)
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertEqual(self.subjects(), [])
        self.assertIn("1 in a row", p.stdout)

    def test_two_in_a_row_send_one_mail_and_then_no_more_while_down(self):
        self.run_check(page=522, api=522)
        p = self.run_check(page=522, api=522)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(len(self.subjects()), 1)
        self.assertIn("DOWN", self.subjects()[0])
        body = self.text()
        self.assertIn("/ar: HTTP 522", body)
        for _ in range(6): self.run_check(page=522, api=522)
        self.assertEqual(len(self.subjects()), 1, "no more mails while the outage lasts")

    def test_recovery_sends_one_mail_and_resets(self):
        self.run_check(page=000, api=000); self.run_check(page=000, api=000)
        self.run_check()
        subs = self.subjects()
        self.assertEqual(len(subs), 2)
        self.assertIn("BACK UP", subs[1])
        self.assertIn("down for about", self.text())
        self.run_check(); self.assertEqual(len(self.subjects()), 2)
        # a new outage alerts again after two failures
        self.run_check(api=503); self.run_check(api=503)
        self.assertEqual(len(self.subjects()), 3)

    def test_a_blip_between_good_runs_never_mails(self):
        for code in (200, 503, 200, 503, 200):
            self.run_check(page=code)
        self.assertEqual(self.subjects(), [])

    def test_either_endpoint_failing_counts(self):
        self.run_check(page=200, api=500); self.run_check(page=200, api=500)
        self.assertEqual(len(self.subjects()), 1)

    def test_optional_reminder(self):
        self.run_check(page=522, api=522, REMIND_HOURS="1"); self.run_check(page=522, api=522, REMIND_HOURS="1")
        self.now += 3600
        self.run_check(page=522, api=522, REMIND_HOURS="1")
        self.assertEqual(len(self.subjects()), 2)
        self.assertIn("STILL DOWN", self.subjects()[1])

    def test_provider_fallback_resend_then_brevo_then_mailjet(self):
        env = dict(OPS_ALERT_EMAIL="owner@example.invalid", MAIL_FROM="Nabd <no-reply@nabd.plus>", RESEND_API_KEY="re_x", BREVO_API_KEY="br_x",
                   MAILJET_API_KEY="mj_a", MAILJET_SECRET_KEY="mj_s")
        self.run_check(page=522, mail_cmd=False, **env)
        p = self.run_check(page=522, mail_cmd=False, mail_codes={"api.resend.com": 500, "api.brevo.com": 401}, **env)
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertEqual(self.fake()["mail_calls"], ["api.resend.com", "api.brevo.com", "api.mailjet.com"])
        self.assertIn("mail sent via mailjet", p.stdout)
        for secret in ("re_x", "br_x", "mj_s", "owner@example.invalid"):
            self.assertNotIn(secret, p.stdout + p.stderr)

    def test_a_mail_that_cannot_be_sent_fails_the_run_and_is_retried_next_run(self):
        self.run_check(page=522, mail_cmd=False)
        p = self.run_check(page=522, mail_cmd=False)
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("MAIL NOT SENT", p.stdout)
        # the next run tries again (the outage mail was never recorded as sent)
        env = dict(OPS_ALERT_EMAIL="owner@example.invalid", MAIL_FROM="Nabd <no-reply@nabd.plus>", BREVO_API_KEY="br_x")
        p = self.run_check(page=522, mail_cmd=False, **env)
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("mail sent via brevo", p.stdout)

    def test_api_probe_targets_the_api_host_health_route(self):
        # the site host has no /api route (it answered 404); the real route is GET /api/v1/health/liveness on the API host
        for rel in ("external-uptime.sh", "auto-reboot.sh"):
            src = open(os.path.join(os.path.dirname(SCRIPT), rel)).read()
            self.assertIn("API_URL=${API_URL:-https://api.nabd.plus}", src)
            self.assertIn("$API_URL/api/v1/health/liveness", src)
            self.assertNotIn("$SITE/api/", src)


if __name__ == "__main__":
    unittest.main()
