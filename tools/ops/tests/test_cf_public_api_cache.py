"""tools/ops/cf/45-public-api-cache.sh against a fake curl (a Cloudflare API + edge simulator) and a no-op sleep. No network, no secrets."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

CF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cf")
FAKE_SLEEP = "#!/bin/bash\nexit 0\n"
FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
hdrs = [args[i + 1].lower() for i, a in enumerate(args) if a == "-H"]
if "cloudflare.com" in url:
    if "/rulesets/phases/" in url:
        print(json.dumps({"success": True, "result": {"id": "rs1", "rules": st["rules"]}}))
    elif "/rulesets/rs1" in url and method == "PUT":
        data = json.loads(args[args.index("--data") + 1])
        n = 0
        for r in data["rules"]:
            if "id" not in r:
                r["id"] = "new-rule-id-%d" % n; n += 1
        if os.environ.get("FAKE_PUT_FAIL"):
            print(json.dumps({"success": False, "errors": [{"message": "denied"}]})); sys.exit(0)
        st["rules"] = data["rules"]; save()
        print(json.dumps({"success": True, "result": {"rules": st["rules"]}}))
    elif url.endswith("/purge_cache"):
        st["purged"] = True; st["hits"] = 0; save()
        print(json.dumps({"success": True}))
    else:
        print(json.dumps({"success": True}))
    sys.exit(0)
# the edge (headers requested with -D -)
path = url.split("api.nabd.plus")[1]
private = any(h.startswith("authorization") or (h.startswith("cookie") and "nabd_access" in h) for h in hdrs)
public_path = path.startswith("/api/v1/public/")
cache_rule = any(r.get("description", "").startswith("Public catalogue API") and r.get("enabled") for r in st["rules"])
out = ["HTTP/2 200"]
if public_path and not private and not os.environ.get("FAKE_ORIGIN_PRIVATE"):
    out.append("cache-control: public, s-maxage=300, stale-while-revalidate=600")
else:
    out.append("cache-control: private, no-store")
status = "DYNAMIC"
if cache_rule and public_path and not private and not os.environ.get("FAKE_ORIGIN_PRIVATE"):
    status = "HIT" if st.get("hits", 0) > 0 else "MISS"
    st["hits"] = st.get("hits", 0) + 1
    if os.environ.get("FAKE_NEVER_HIT"): status = "MISS"
save()
out.append("cf-cache-status: " + status)
print("\r\n".join(out))
'''


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class PublicApiCache(unittest.TestCase):
    BYPASS = {"id": "bypass1", "action": "set_cache_settings", "description": "Bypass: API + _next/data", "enabled": True,
              "expression": '(starts_with(http.request.uri.path, "/api/"))', "action_parameters": {"cache": False}}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        self.bin = os.path.join(d, "bin"); os.makedirs(self.bin)
        write_exec(os.path.join(self.bin, "curl"), FAKE_CURL)
        write_exec(os.path.join(self.bin, "sleep"), FAKE_SLEEP)
        self.state = os.path.join(d, "state.json")
        with open(self.state, "w") as f:
            json.dump({"rules": [dict(self.BYPASS)]}, f)

    def run_task(self, name, **extra):
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="")
        env.update({k: str(v) for k, v in extra.items()})
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=60)

    def rules(self):
        with open(self.state) as f:
            return json.load(f)["rules"]

    def test_check_changes_nothing_and_prints_rule_ids_only(self):
        p = self.run_task("45-public-api-cache-check.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("would add one rule", p.stdout)
        self.assertIn("rule id bypass1 on", p.stdout)
        self.assertNotIn("Bypass: API", p.stdout)               # no rule text
        self.assertEqual(len(self.rules()), 1)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_adds_one_rule_after_the_bypass_and_the_edge_serves_a_hit(self):
        p = self.run_task("45-public-api-cache-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        rules = self.rules()
        self.assertEqual([r["id"] for r in rules][0], "bypass1")        # the new rule is last: it wins
        self.assertEqual(len(rules), 2)
        r = rules[1]
        self.assertEqual(r["action_parameters"]["edge_ttl"], {"mode": "respect_origin"})
        self.assertIn('starts_with(http.request.uri.path, "/api/v1/public/")', r["expression"])
        self.assertIn('not any(http.request.headers["authorization"][*] ne "")', r["expression"])
        self.assertIn("rule added, id new-rule-id-0", p.stdout)
        self.assertIn("items anonymous: first MISS, then HIT", p.stdout)
        self.assertIn("with Authorization: DYNAMIC; with a session cookie: DYNAMIC", p.stdout)
        self.assertIn("OK the public catalogue API is cached", p.stdout)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_a_second_apply_is_a_no_op(self):
        self.run_task("45-public-api-cache-apply.sh")
        before = self.rules()
        p = self.run_task("45-public-api-cache-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("already there and correct", p.stdout)
        self.assertEqual(self.rules(), before)

    def test_blocked_when_the_origin_does_not_send_public(self):
        p = self.run_task("45-public-api-cache-apply.sh", FAKE_ORIGIN_PRIVATE=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("BLOCKED the origin does not send", p.stdout)
        self.assertEqual(len(self.rules()), 1)

    def test_rolls_back_when_the_edge_never_hits(self):
        p = self.run_task("45-public-api-cache-apply.sh", FAKE_NEVER_HIT=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("putting the previous rules back", p.stdout)
        self.assertEqual([r["id"] for r in self.rules()], ["bypass1"])

    def test_a_refused_write_changes_nothing(self):
        p = self.run_task("45-public-api-cache-apply.sh", FAKE_PUT_FAIL=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("FAILED to add the rule", p.stdout)
        self.assertEqual(len(self.rules()), 1)


if __name__ == "__main__":
    unittest.main()
