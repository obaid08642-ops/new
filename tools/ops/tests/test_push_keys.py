"""97-push-keys-check.sh (Firebase file section) and 97d-fcm-wire.sh with a real temp tree and a fake sudo/docker: names and paths only, never a value; the wire task never overwrites and always backs up."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

T = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks")
def _throwaway_pem():
    """A private key made for this test run only, in a temp dir that is removed at once. It is never written to the repository and is used by nothing else."""
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, "k.pem")
        subprocess.run(["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", out], check=True, capture_output=True)
        return open(out).read()


SECRET = _throwaway_pem()
BODY = [l for l in SECRET.splitlines() if l and not l.startswith("-----")]


def sa(project="napd-plus", email="fcm@napd-plus.iam.gserviceaccount.com"):
    return json.dumps({"type": "service_account", "project_id": project, "client_email": email, "private_key": SECRET})


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name; self.root = os.path.join(self.d, "srv"); os.makedirs(self.root)
        self.deploy = os.path.join(self.d, "deploy"); os.makedirs(self.deploy)
        self.envf = os.path.join(self.deploy, ".env.production")
        open(self.envf, "w").write("DB_NAME=x\n")
        b = os.path.join(self.d, "bin"); os.makedirs(b); self.bin = b
        for name, body in (("sudo", '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'), ("docker", '#!/bin/bash\n[ "$1" = exec ] && exit 1\nexit 0\n')):
            p = os.path.join(b, name); open(p, "w").write(body); os.chmod(p, 0o755)

    def put(self, rel, text):
        p = os.path.join(self.root, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "w").write(text); return p

    def run_task(self, name, env=None):
        e = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], OPS_FIREBASE_ROOTS=self.root, OPS_DEPLOY_DIR=self.deploy, OPS_ENV_FILE=self.envf, **(env or {}))
        return subprocess.run(["bash", os.path.join(T, name)], env=e, capture_output=True, text=True, timeout=60, stdin=subprocess.DEVNULL)


class Check(Base):
    def test_reports_the_json_and_the_build_files_and_says_it_is_not_wired(self):
        self.put("secrets/firebase-admin.json", sa()); self.put("secrets/other.json", '{"a":1}'); self.put("node_modules/x/sa.json", sa())
        self.put("app/google-services.json", "{}"); self.put("app/GoogleService-Info.plist", "<plist/>")
        p = self.run_task("97-push-keys-check.sh")
        out = p.stdout
        self.assertIn("OK       service-account JSON  ", out); self.assertIn("firebase-admin.json", out)
        self.assertNotIn("node_modules", out)                                                 # dependencies are skipped
        self.assertIn("google-services.json", out); self.assertIn("GoogleService-Info.plist", out)
        self.assertIn("FOUND_NOT_WIRED", out)
        self.assertIn("FCM_PROJECT_ID env_file:no running_container:no", out)
        self.assertIn("provider-app/app.json has no googleServicesFile", out)
        self.assertNotIn(BODY[0], out + p.stderr); self.assertNotIn("napd-plus", out)

    def test_no_file_is_reported_as_missing(self):
        self.assertIn("MISSING  service-account JSON", self.run_task("97-push-keys-check.sh").stdout)


class Wire(Base):
    def test_dry_run_changes_nothing_and_apply_writes_the_three_names_with_a_backup(self):
        self.put("secrets/firebase-admin.json", sa())
        before = open(self.envf).read()
        p = self.run_task("97d-fcm-wire.sh")
        self.assertIn("dry run: 3 name(s)", p.stdout); self.assertEqual(open(self.envf).read(), before)
        self.assertNotIn(BODY[0], p.stdout + p.stderr)
        p = self.run_task("97d-fcm-wire.sh", {"APPLY": "yes"})
        self.assertIn("APPLIED: 3 name(s)", p.stdout); self.assertNotIn(BODY[0], p.stdout + p.stderr)
        text = open(self.envf).read()
        self.assertIn("FCM_PROJECT_ID=napd-plus\n", text); self.assertIn("FCM_CLIENT_EMAIL=fcm@napd-plus.iam.gserviceaccount.com\n", text)
        key = [l for l in text.splitlines() if l.startswith("FCM_PRIVATE_KEY=")]
        self.assertEqual(len(key), 1); self.assertIn("-----BEGIN PRIVATE KEY-----\\n" + BODY[0] + "\\n", key[0])   # one line, newlines kept as \n for the backend
        baks = [f for f in os.listdir(self.deploy) if f.startswith(".env.production.bak-")]
        self.assertEqual(len(baks), 1); self.assertEqual(open(os.path.join(self.deploy, baks[0])).read(), before)
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(self.deploy, baks[0])).st_mode), 0o600)

    def test_an_existing_value_is_never_overwritten(self):
        self.put("secrets/firebase-admin.json", sa()); open(self.envf, "a").write("FCM_PROJECT_ID=keep-me\n")
        p = self.run_task("97d-fcm-wire.sh", {"APPLY": "yes"})
        self.assertIn("FCM_PROJECT_ID: already set", p.stdout)
        self.assertEqual(open(self.envf).read().count("FCM_PROJECT_ID="), 1); self.assertIn("FCM_PROJECT_ID=keep-me", open(self.envf).read())

    def test_two_files_need_an_explicit_choice_and_no_file_aborts(self):
        p = self.run_task("97d-fcm-wire.sh"); self.assertIn("ABORT no service-account JSON", p.stdout)
        a = self.put("a.json", sa("proj-a")); b = self.put("b.json", sa("proj-b"))
        p = self.run_task("97d-fcm-wire.sh", {"APPLY": "yes"}); self.assertIn("ABORT 2 service-account files found", p.stdout); self.assertNotIn("FCM_", open(self.envf).read())
        p = self.run_task("97d-fcm-wire.sh", {"APPLY": "yes", "FCM_PRIMARY_FILE": a, "FCM_SECONDARY_FILE": b})
        t = open(self.envf).read(); self.assertIn("FCM_PROJECT_ID=proj-a\n", t); self.assertIn("FCM_PROJECT_ID_2=proj-b\n", t)


if __name__ == "__main__":
    unittest.main()
