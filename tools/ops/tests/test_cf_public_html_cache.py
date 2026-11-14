"""tools/ops/cf/46-public-html-cache.sh and 47-public-assets-api-cache.sh against a fake curl (Cloudflare API + origin + edge simulator)
and a no-op sleep. No network, no secrets."""
import json
import os
import re
import stat
import subprocess
import tempfile
import unittest

CF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cf")
FAKE_SLEEP = "#!/bin/bash\nexit 0\n"
FAKE_CURL = r'''#!/usr/bin/env python3
import base64, hashlib, json, os, sys
args = sys.argv[1:]
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
hdrs = [args[i + 1] for i, a in enumerate(args) if a == "-H"]
lower = [h.lower() for h in hdrs]
env = os.environ.get

def api():
    if "/rulesets/phases/" in url:
        return {"success": True, "result": {"id": "rs1", "rules": st["rules"]}}
    if "/rulesets/rs1" in url and method == "PUT":
        if env("FAKE_PUT_FAIL"): return {"success": False, "errors": [{"message": "denied"}]}
        data = json.loads(args[args.index("--data") + 1]); n = 0
        for r in data["rules"]:
            if "id" not in r: r["id"] = "rule-%d" % len(st.get("ids", [])); st.setdefault("ids", []).append(r["id"])
        st["rules"] = data["rules"]; save()
        return {"success": True, "result": {"rules": st["rules"]}}
    if url.endswith("/purge_cache"):
        st["cache"] = {}; save(); return {"success": True}
    return {"success": True}
if "cloudflare.com" in url:
    print(json.dumps(api())); sys.exit(0)

# ---- origin + edge
host = url.split("//")[1].split("/")[0]
path = url.split(host, 1)[1]
bare = path.split("?")[0]
private_req = any(h.startswith("authorization") or h.startswith("rsc") or h.startswith("next-router") or ("cookie" in h and ("nabd_access" in h or "nabd_refresh" in h or "nabd.theme" in h)) for h in lower) or "_rsc=" in path
HTML_PUBLIC = {"/ar", "/ar/c", "/ar/consultations/doctors"}
inline = ["self.__next_f=[]", "window.x=1"]
def hash_of(s): return "sha256-" + base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()
page = "<html><head>" + "".join("<script>%s</script>" % s for s in inline) + '</head><body><script src="/_next/a.js" async></script>page %s</body></html>' % bare
csp = "default-src 'self'; script-src 'self' 'strict-dynamic' " + " ".join("'%s'" % hash_of(s) for s in inline) + "; object-src 'none'"
if env("FAKE_NONCE"): csp = csp.replace("'strict-dynamic'", "'strict-dynamic' 'nonce-abc'")
out_headers = []; body = ""; kind = "other"
if host in ("nabd.plus", "www.nabd.plus"):
    if bare in HTML_PUBLIC and not private_req and not env("FAKE_ORIGIN_PRIVATE"):
        kind = "html"; body = page
        out_headers = ["cache-control: public, max-age=0, s-maxage=60, stale-while-revalidate=31535940, stale-if-error=31536000", "content-security-policy: " + csp]
        if env("FAKE_COOKIE"): out_headers.append("set-cookie: NEXT_LOCALE=ar")
    else:
        body = "private page"
        pub = env("FAKE_CART_PUBLIC") and bare == "/ar/cart"
        out_headers = ["cache-control: " + ("public, s-maxage=60" if pub else "private, no-cache, no-store, max-age=0, must-revalidate"), "content-security-policy: default-src 'self'; script-src 'self' 'nonce-xyz'"]
        if pub: kind = "html"
elif host == "api.nabd.plus":
    if bare.startswith("/api/v1/public/categories/ar/items"):
        body = '{"items":[{"image":"https://cdn.nabd.plus/p/a.jpg"}]}'; out_headers = ["cache-control: public, s-maxage=300"]
    elif bare == "/api/v1/doctors" and not private_req and not env("FAKE_DOCTORS_PRIVATE"):
        body = '{"doctors":[]}'; out_headers = ["cache-control: public, s-maxage=60"]; kind = "api"
    else:
        body = "x"; out_headers = ["cache-control: private, no-store"]
elif host == "cdn.nabd.plus":
    body = "IMG"; out_headers = ["cache-control: max-age=14400"]; kind = "img"
rules = [r for r in st["rules"] if r.get("enabled")]
def rule_for(desc_start): return any(r.get("description", "").startswith(desc_start) for r in rules)
cacheable = False
if kind == "html" and rule_for("Public HTML") and not private_req and (bare in HTML_PUBLIC) and not env("FAKE_NEVER_HIT"): cacheable = True
if kind == "api" and rule_for("Public read API") and not private_req and not env("FAKE_NEVER_HIT"): cacheable = True
if kind == "img" and rule_for("Images CDN") and not env("FAKE_NEVER_HIT"): cacheable = True
if env("FAKE_CART_PUBLIC") and bare == "/ar/cart" and rule_for("Public HTML") and not private_req: cacheable = True
status = "DYNAMIC"
cache = st.setdefault("cache", {})
if cacheable:
    key = host + path
    if key in cache:
        status = "HIT"
        if env("FAKE_EDGE_REWRITES") and kind == "html": body = body.replace("page ", "page  ")
    else:
        status = "MISS"; cache[key] = 1
save()
out_headers.append("cf-cache-status: " + status)
if "-w" in args:
    print("0.0%d" % (11 if status == "HIT" else 89)); sys.exit(0)
text = "HTTP/2 200\r\n" + "\r\n".join(out_headers) + "\r\n\r\n"
if "-D" in args:
    dest = args[args.index("-D") + 1]
    if dest == "-": sys.stdout.write(text)
    else: open(dest, "w").write(text)
if "-o" in args and args[args.index("-o") + 1] not in ("/dev/null", "-"):
    open(args[args.index("-o") + 1], "w").write(body)
elif "-o" not in args:
    sys.stdout.write(body)
'''


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class Base(unittest.TestCase):
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
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=120)

    def rules(self):
        with open(self.state) as f:
            return json.load(f)["rules"]


class PublicHtmlCache(Base):
    def test_the_expression_fits_the_plan_limit_and_excludes_private_traffic(self):
        p = subprocess.run(["bash", os.path.join(CF, "46-public-html-cache.sh")], env=dict(os.environ, PRINT_EXPRESSION="1", CF="x", Z="z", CFE=""), capture_output=True, text=True)
        expr = p.stdout.strip()
        self.assertLess(len(expr), 4096)
        for must in ('"nabd.plus"', 'http.request.method eq "GET"', 'not http.cookie contains "nabd_access="', 'not http.cookie contains "nabd_refresh="',
                     'not http.cookie contains "admin_access="', 'not http.cookie contains "nabd.theme="', 'not http.request.uri.query contains "_rsc="',
                     'http.request.headers["authorization"]', 'http.request.headers["rsc"]', 'http.request.headers["next-router-prefetch"]'):
            self.assertIn(must, expr)
        for private in ("cart", "checkout", "login", "orders", "payments", "profile", "appointments", "admin"):
            self.assertNotIn(f"/{private}", expr)
        self.assertIn('"/ar/c"', expr)
        self.assertIn('starts_with(http.request.uri.path, "/fil/p/")', expr)

    def test_check_changes_nothing(self):
        p = self.run_task("46-public-html-cache-check.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("would add 1 rule", p.stdout)
        self.assertIn("origin copy: 2 inline scripts, all hashed, no nonce", p.stdout)
        self.assertIn("TTFB before", p.stdout)
        self.assertEqual(len(self.rules()), 1)

    def test_apply_adds_the_rule_and_proves_the_cached_copy(self):
        p = self.run_task("46-public-html-cache-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        rules = self.rules()
        self.assertEqual(len(rules), 2)
        self.assertEqual(rules[1]["action_parameters"]["edge_ttl"], {"mode": "respect_origin"})
        for page in ("/ar", "/ar/c", "/ar/consultations/doctors"):
            self.assertIn(f"{page} anonymous: first MISS, then HIT", p.stdout)
            self.assertIn(f"{page} cached copy: 2 inline scripts, all hashed, same bytes and CSP as the first answer, no cookie", p.stdout)
        self.assertIn("hit ratio of 10 repeated GETs of /ar/c: 10/10", p.stdout)
        self.assertRegex(p.stdout, r"TTFB after .*: 11 11 11")
        for case in ("with a session cookie", "with a theme cookie", "with Authorization", "RSC request (query)", "RSC request (header)", "private page /ar/cart", "private page /ar/checkout"):
            self.assertRegex(p.stdout, re.escape(case) + r": DYNAMIC")
        self.assertIn("OK anonymous public HTML is cached", p.stdout)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_idempotent(self):
        self.run_task("46-public-html-cache-apply.sh")
        before = self.rules()
        p = self.run_task("46-public-html-cache-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("rule already there and correct", p.stdout)
        self.assertEqual(self.rules(), before)

    def test_blocked_when_the_origin_copy_is_private_or_has_a_nonce_or_a_cookie(self):
        for flag, text in (("FAKE_ORIGIN_PRIVATE", "does not send 'public, s-maxage'"), ("FAKE_NONCE", "fails the hash-policy check"), ("FAKE_COOKIE", "sets a cookie")):
            self.setUp()
            p = self.run_task("46-public-html-cache-apply.sh", **{flag: 1})
            self.assertEqual(p.returncode, 1, (flag, p.stdout))
            self.assertIn(text, p.stdout)
            self.assertEqual(len(self.rules()), 1)

    def test_rolls_back_when_the_edge_rewrites_the_page(self):
        p = self.run_task("46-public-html-cache-apply.sh", FAKE_EDGE_REWRITES=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("putting the previous rules back", p.stdout)
        self.assertEqual([r["id"] for r in self.rules()], ["bypass1"])

    def test_rolls_back_when_a_private_page_would_be_cached(self):
        p = self.run_task("46-public-html-cache-apply.sh", FAKE_CART_PUBLIC=1)
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertEqual([r["id"] for r in self.rules()], ["bypass1"])

    def test_rolls_back_when_nothing_is_ever_a_hit(self):
        p = self.run_task("46-public-html-cache-apply.sh", FAKE_NEVER_HIT=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("is not served from the cache", p.stdout)
        self.assertEqual([r["id"] for r in self.rules()], ["bypass1"])


class PublicAssetsApiCache(Base):
    def test_apply_adds_both_rules_and_checks_images_and_doctors(self):
        p = self.run_task("47-public-assets-api-cache-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(len(self.rules()), 3)
        img = [r for r in self.rules() if r["description"].startswith("Images CDN")][0]
        self.assertEqual(img["action_parameters"]["edge_ttl"]["default"], 2592000)
        self.assertEqual(img["action_parameters"]["edge_ttl"]["status_code_ttl"][1], {"status_code_range": {"from": 400, "to": 599}, "value": -1})
        api = [r for r in self.rules() if r["description"].startswith("Public read API")][0]
        self.assertIn('starts_with(http.request.uri.path, "/api/v1/doctors")', api["expression"])
        self.assertIn('not any(http.request.headers["authorization"][*] ne "")', api["expression"])
        self.assertIn("image: then HIT", p.stdout)
        self.assertIn("doctors list: then HIT", p.stdout)
        self.assertIn("doctors list with Authorization: DYNAMIC; with a session cookie: DYNAMIC", p.stdout)
        self.assertIn("private route /api/v1/doctors/appointments/mine: DYNAMIC", p.stdout)
        self.assertIn("OK images and the public read API", p.stdout)

    def test_the_api_rule_waits_for_the_release(self):
        p = self.run_task("47-public-assets-api-cache-apply.sh", FAKE_DOCTORS_PRIVATE=1)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("the API rule is NOT added in this run", p.stdout)
        self.assertEqual(len(self.rules()), 2)

    def test_check_changes_nothing(self):
        p = self.run_task("47-public-assets-api-cache-check.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("would add 2 rule(s)", p.stdout)
        self.assertEqual(len(self.rules()), 1)

    def test_rolls_back_when_the_picture_never_hits(self):
        p = self.run_task("47-public-assets-api-cache-apply.sh", FAKE_NEVER_HIT=1)
        self.assertEqual(p.returncode, 1)
        self.assertEqual([r["id"] for r in self.rules()], ["bypass1"])


if __name__ == "__main__":
    unittest.main()
