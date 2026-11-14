"""tools/ops/cf/51-search-verification.sh against a fake curl (Cloudflare DNS API + DNS-over-HTTPS). No network, no secrets."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

CF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cf")
FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys, urllib.parse
args = sys.argv[1:]
if "--config" in args: sys.stdin.read()
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
if "cloudflare.com/client" in url or "cloudflare-test" in url:
    if "/dns_records/" in url and method == "DELETE":
        rid = url.rsplit("/", 1)[1]
        st["records"] = [r for r in st["records"] if r["id"] != rid]; st["calls"].append("delete " + rid); save()
        print(json.dumps({"success": True})); sys.exit(0)
    if url.endswith("/dns_records") and method == "POST":
        body = json.loads(args[args.index("--data") + 1])
        rec = dict(body, id="rec%d" % (len(st["records"]) + 1)); st["records"].append(rec); st["calls"].append("add " + body["type"] + " " + body["name"]); save()
        print(json.dumps({"success": st.get("post_ok", True), "result": rec, "errors": []})); sys.exit(0)
    if url.endswith("/dns_records"):
        q = dict(urllib.parse.parse_qsl("&".join(urllib.parse.quote(a, safe="=") for a in args if "=" in a and not a.startswith("http") and not a.startswith("-"))))
        out = [r for r in st["records"] if r["type"] == q.get("type") and r["name"] == q.get("name")]
        print(json.dumps({"success": True, "result": out})); sys.exit(0)
    print(json.dumps({"success": True, "result": {"status": "active"}})); sys.exit(0)
if "dns-query" in url:
    q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query))
    ans = [] if st.get("doh_empty") else [{"data": ('"%s"' % r["content"]) if r["type"] == "TXT" else r["content"] + "."} for r in st["records"] if r["type"] == q["type"] and r["name"] == q["name"]]
    print(json.dumps({"Answer": ans})); sys.exit(0)
'''


class SearchVerification(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        self.bin = os.path.join(d, "bin"); os.makedirs(self.bin)
        for name, text in (("curl", FAKE_CURL), ("sleep", "#!/bin/bash\nexit 0\n")):
            p = os.path.join(self.bin, name)
            with open(p, "w") as f: f.write(text)
            os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
        self.state = os.path.join(d, "state.json")

    def run_task(self, name, records=None, gsc="", bing="", **extra):
        st = {"records": records or [], "calls": []}; st.update(extra)
        with open(self.state, "w") as f: json.dump(st, f)
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="",
                   GSC_VERIFICATION_TOKEN=gsc, BING_VERIFICATION_CNAME=bing)
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=60)

    def state_json(self):
        with open(self.state) as f: return json.load(f)

    def test_blocked_without_any_secret_and_names_them(self):
        p = self.run_task("51-search-verification-check.sh")
        self.assertEqual(p.returncode, 1)
        self.assertIn("GSC_VERIFICATION_TOKEN", p.stdout)
        self.assertIn("BING_VERIFICATION_CNAME", p.stdout)

    def test_check_changes_nothing_and_never_prints_the_token(self):
        p = self.run_task("51-search-verification-check.sh", gsc="SECRETTOKEN123", bing="a" * 32)
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("would add 2 record(s)", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])
        self.assertNotIn("SECRETTOKEN123", p.stdout + p.stderr)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_adds_txt_and_cname_dns_only_and_confirms_over_doh(self):
        p = self.run_task("51-search-verification-apply.sh", gsc="google-site-verification=SECRETTOKEN123", bing="B" * 32)
        self.assertEqual(p.returncode, 0, p.stdout)
        recs = {r["type"]: r for r in self.state_json()["records"]}
        self.assertEqual(recs["TXT"]["content"], "google-site-verification=SECRETTOKEN123")
        self.assertEqual(recs["TXT"]["name"], "nabd.plus")
        self.assertEqual(recs["CNAME"]["name"], "b" * 32 + ".nabd.plus")
        self.assertEqual(recs["CNAME"]["content"], "verify.bing.com")
        self.assertFalse(recs["TXT"]["proxied"] or recs["CNAME"]["proxied"])
        self.assertNotIn("SECRETTOKEN123", p.stdout + p.stderr)
        self.assertIn("OK records are live", p.stdout)

    def test_existing_records_are_left_alone_and_a_rerun_adds_nothing(self):
        existing = [{"id": "x1", "type": "TXT", "name": "nabd.plus", "content": "google-site-verification=SECRETTOKEN123"},
                    {"id": "x2", "type": "TXT", "name": "nabd.plus", "content": "v=spf1 include:spf.brevo.com ~all"}]
        p = self.run_task("51-search-verification-apply.sh", records=existing, gsc="SECRETTOKEN123")
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("nothing to add", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])

    def test_a_cname_with_another_target_is_not_touched(self):
        existing = [{"id": "c1", "type": "CNAME", "name": "c" * 32 + ".nabd.plus", "content": "elsewhere.example.com"}]
        p = self.run_task("51-search-verification-apply.sh", records=existing, bing="c" * 32)
        self.assertEqual(p.returncode, 1)
        self.assertIn("another target", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])

    def test_deletes_what_it_added_when_dns_does_not_show_it(self):
        p = self.run_task("51-search-verification-apply.sh", gsc="SECRETTOKEN123", doh_empty=True)
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("NOT confirmed", p.stdout)
        st = self.state_json()
        self.assertEqual(st["records"], [])
        self.assertEqual(st["calls"], ["add TXT nabd.plus", "delete rec1"])


if __name__ == "__main__":
    unittest.main()
