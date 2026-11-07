"""tools/ops/cf/52-admin-access.sh against a fake curl (Cloudflare zone, Zero Trust organisation, Access apps and policies, and the dashboard host). No network, no secrets."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

CF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cf")
FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
sys.stdin.read() if "--config" in args else None
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
body = json.loads(args[args.index("--data") + 1]) if "--data" in args else None
ok = lambda r=None: print(json.dumps({"success": True, "result": r}))
if "api.cloudflare.com" in url:
    path = url.split("/client/v4")[1]
    if path.endswith("/user/tokens/verify"): ok({"status": "active"})
    elif path == "/zones/zone1": ok({"account": {"id": "acc1"}})
    elif path.endswith("/access/organizations"):
        ok({"auth_domain": "nabd.cloudflareaccess.com"} if st["org"] else {})
    elif path.endswith("/access/apps") and method == "GET": ok(st["apps"])
    elif path.endswith("/access/apps") and method == "POST":
        st["calls"].append("create_app " + json.dumps(body, sort_keys=True))
        app = {"id": "app1", "name": body["name"]}; st["apps"].append(app); st["created"] = True; save(); ok(app)
    elif path.endswith("/policies") and method == "POST":
        st["calls"].append("create_policy " + json.dumps(body, sort_keys=True)); save()
        if st["refuse_policy"]: print(json.dumps({"success": False, "errors": [{"message": "policy refused"}]}))
        else: ok({"id": "pol1"})
    elif method == "DELETE":
        st["calls"].append("delete_app"); st["apps"] = [a for a in st["apps"] if a["id"] != "app1"]; st["created"] = False; save(); ok({"id": "app1"})
    else: ok({})
    sys.exit(0)
# the dashboard host
if "-w" in args:
    print(st["code_after"] if st.get("created") else st["code_before"]); sys.exit(0)
'''


class AdminAccess(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        self.bin = os.path.join(d, "bin"); os.makedirs(self.bin)
        for name, text in (("curl", FAKE_CURL), ("sleep", "#!/bin/bash\nexit 0\n")):
            p = os.path.join(self.bin, name)
            with open(p, "w") as f:
                f.write(text)
            os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
        self.state = os.path.join(d, "state.json")

    def run_task(self, name, org=True, apps=None, emails="owner@example.org, second@example.org", code_after="302", refuse_policy=False):
        st = {"org": org, "apps": apps or [], "calls": [], "created": False, "code_before": "200", "code_after": code_after, "refuse_policy": refuse_policy}
        with open(self.state, "w") as f:
            json.dump(st, f)
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="", ACCESS_ALLOW_EMAILS=emails)
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=60)

    def calls(self):
        with open(self.state) as f:
            return json.load(f)["calls"]

    def test_check_reads_only_and_counts_addresses_without_printing_them(self):
        p = self.run_task("52-admin-access-check.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("with no login now: HTTP 200", p.stdout)
        self.assertIn("would create application 'nabd-admin-ui'", p.stdout)
        self.assertIn("2 address(es)", p.stdout)
        self.assertEqual(self.calls(), [])
        self.assertNotIn("owner@example.org", p.stdout + p.stderr)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_creates_the_app_and_one_allow_policy_and_proves_the_dashboard_is_closed(self):
        p = self.run_task("52-admin-access-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        c = self.calls()
        self.assertEqual(len(c), 2)
        app = json.loads(c[0].split(" ", 1)[1]); pol = json.loads(c[1].split(" ", 1)[1])
        self.assertEqual((app["domain"], app["type"], app["session_duration"]), ("admin.nabd.plus", "self_hosted", "8h"))
        self.assertEqual(pol["decision"], "allow")
        self.assertEqual(sorted(i["email"]["email"] for i in pol["include"]), ["owner@example.org", "second@example.org"])
        self.assertIn("with no login AFTER: HTTP 302", p.stdout)
        self.assertNotIn("owner@example.org", p.stdout)

    def test_refuses_an_empty_or_invalid_allow_list_it_would_lock_everyone_out(self):
        for emails in ("", "not-an-email, also bad"):
            p = self.run_task("52-admin-access-apply.sh", emails=emails)
            self.assertEqual(p.returncode, 1, p.stdout)
            self.assertIn("lock everyone out", p.stdout)
            self.assertEqual(self.calls(), [])

    def test_blocked_without_a_zero_trust_organisation(self):
        p = self.run_task("52-admin-access-apply.sh", org=False)
        self.assertEqual(p.returncode, 1)
        self.assertIn("no Zero Trust organisation", p.stdout)
        self.assertEqual(self.calls(), [])

    def test_an_existing_application_is_left_alone(self):
        p = self.run_task("52-admin-access-apply.sh", apps=[{"id": "x9", "name": "nabd-admin-ui"}])
        self.assertEqual(p.returncode, 0)
        self.assertIn("already exists", p.stdout)
        self.assertEqual(self.calls(), [])

    def test_deletes_the_application_again_when_the_dashboard_is_still_open(self):
        p = self.run_task("52-admin-access-apply.sh", code_after="200")
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("an unauthenticated request still gets HTTP 200", p.stdout)
        self.assertEqual(self.calls()[-1], "delete_app")

    def test_deletes_the_application_again_when_the_policy_is_refused(self):
        p = self.run_task("52-admin-access-apply.sh", refuse_policy=True)
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("rollback success=true", p.stdout)
        self.assertEqual(self.calls()[-1], "delete_app")


if __name__ == "__main__":
    unittest.main()
