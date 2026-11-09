"""Edge resilience (owner, 2026-11-02): 52-edge-resilience.sh and 53-edge-warmup.sh against a fake curl, and a public page served with the origin down.

The last class runs a small RFC 5861 shared cache (what a Cloudflare tier does with `stale-if-error`) in front of a real HTTP origin that sends the
Cache-Control value patient-web/server/nonce-server.mjs really produces (sharedCacheControl, called through node), then stops the origin. It proves the
header contract the origin sends is enough for a standards-following cache to keep serving the page. It does NOT prove Cloudflare's own behaviour:
that is checked on the live zone by 53-edge-warmup.sh (cf-cache-status counts) after 52-edge-resilience-apply.sh.
"""
import http.server
import json
import os
import re
import shutil
import stat
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CF = os.path.join(HERE, "..", "cf")
WEB = os.path.join(HERE, "..", "..", "..", "patient-web")

FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
if "--config" in args: sys.stdin.read()
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
if "cloudflare.com" in url:
    if "/user" in url or "tokens/verify" in url:
        print(json.dumps({"success": True, "result": {"status": "active"}})); sys.exit(0)
    key = url.split("/zones/zone1/")[1]
    cur = st["settings"].get(key)
    if cur is None:
        print(json.dumps({"success": False, "errors": [{"message": "not available on this plan"}]})); sys.exit(0)
    if method == "PATCH":
        v = json.loads(args[args.index("--data") + 1])["value"]
        st["calls"].append(f"{key}={v}")
        if st.get("ignore_patch"): save(); print(json.dumps({"success": True, "result": {"value": cur}})); sys.exit(0)
        st["settings"][key] = v; cur = v; save()
    print(json.dumps({"success": True, "result": {"value": cur}})); sys.exit(0)
# the site: sitemap index, one sitemap, pages
if url.endswith("/sitemap.xml"):
    print("<sitemapindex><sitemap><loc>https://nabd.plus/sitemaps/static.xml</loc></sitemap></sitemapindex>"); sys.exit(0)
if url.endswith("/sitemaps/static.xml"):
    print("<urlset><url><loc>https://nabd.plus/ar/p/abc</loc></url><url><loc>https://nabd.plus/ar/cart</loc></url><url><loc>https://nabd.plus/en/articles/x</loc></url></urlset>"); sys.exit(0)
if "-D" in args:
    code = next((c for k, c in st.get("codes_by", {}).items() if k in url), st.get("page_code", "200"))
    print(f"HTTP/2 {code}\ncf-cache-status: {st.get('cache', 'HIT')}\ncode={code}")
    sys.exit(0)
'''


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.bin = os.path.join(self.tmp.name, "bin"); os.makedirs(self.bin)
        for name, text in (("curl", FAKE_CURL), ("sleep", "#!/bin/bash\nexit 0\n")):
            p = os.path.join(self.bin, name)
            with open(p, "w") as f: f.write(text)
            os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
        self.state = os.path.join(self.tmp.name, "state.json")

    def run_task(self, name, settings=None, extra=None, env=None):
        st = {"settings": settings if settings is not None else {}, "calls": []}
        st.update(extra or {})
        with open(self.state, "w") as f: json.dump(st, f)
        e = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="")
        e.update(env or {})
        return subprocess.run(["bash", os.path.join(CF, name)], env=e, capture_output=True, text=True, timeout=60)

    def state_json(self):
        with open(self.state) as f: return json.load(f)


OFF = {"cache/tiered_cache_smart_topology_enable": "off", "cache/cache_reserve": "off", "settings/always_online": "off"}


class EdgeResilience(Base):
    def test_check_reads_only(self):
        p = self.run_task("52-edge-resilience-check.sh", dict(OFF))
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("tiered now: off", p.stdout)
        self.assertIn("reserve would be set to on", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_turns_each_on_and_reads_it_back(self):
        p = self.run_task("52-edge-resilience-apply.sh", dict(OFF))
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        for s in ("tiered", "reserve", "always"):
            self.assertIn(f"{s} is on", p.stdout)
        self.assertEqual(len(self.state_json()["calls"]), 3)

    def test_already_on_changes_nothing(self):
        p = self.run_task("52-edge-resilience-apply.sh", {k: "on" for k in OFF})
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertEqual(self.state_json()["calls"], [])

    def test_a_setting_the_plan_lacks_is_reported_and_the_others_still_applied(self):
        s = dict(OFF); del s["cache/cache_reserve"]
        p = self.run_task("52-edge-resilience-apply.sh", s)
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("reserve now: unknown", p.stdout)
        self.assertIn("NOTE reserve not changed: not available on this plan", p.stdout)
        self.assertIn("tiered is on", p.stdout)
        self.assertIn("always is on", p.stdout)

    def test_a_change_that_does_not_read_back_is_put_back_and_fails(self):
        p = self.run_task("52-edge-resilience-apply.sh", dict(OFF), {"ignore_patch": True}, {"SETTINGS": "tiered"})
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("FAIL tiered reads back as off", p.stdout)
        self.assertIn("rollback tiered success=true", p.stdout)


class Warmup(Base):
    def test_404_sitemap_entries_are_listed_but_do_not_make_a_red_run(self):
        p = self.run_task("53-edge-warmup.sh", extra={"codes_by": {"/ar/p/abc": "404", "/en/articles/x": "404"}})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("answered 2xx: 12 of 14", p.stdout)
        self.assertIn("404 (not counted against the origin): 2 of 14", p.stdout)
        self.assertIn("https://nabd.plus/ar/p/abc", p.stdout)
        self.assertIn("https://nabd.plus/en/articles/x", p.stdout)

    def test_404_does_not_hide_a_down_origin(self):
        p = self.run_task("53-edge-warmup.sh", extra={"page_code": "522", "codes_by": {"/ar/p/abc": "404"}})
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("FAIL fewer than 50% answered 2xx", p.stdout)

    def test_every_request_404_is_a_red_run(self):
        p = self.run_task("53-edge-warmup.sh", extra={"page_code": "404"})
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("FAIL every request answered 404", p.stdout)

    def test_requests_home_pages_and_only_cacheable_sitemap_urls(self):
        p = self.run_task("53-edge-warmup.sh", env={"SITE_URL": "https://nabd.plus"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        # 6 locales x (home + doctors list) + /ar/p/abc + /en/articles/x; /ar/cart is not cacheable and is skipped
        self.assertIn("requesting 14 url(s)", p.stdout)
        self.assertIn("answered 2xx: 14 of 14", p.stdout)
        self.assertIn("cf-cache-status: HIT=14", p.stdout)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_a_down_origin_is_a_red_run(self):
        p = self.run_task("53-edge-warmup.sh", extra={"page_code": "522", "cache": "DYNAMIC"})
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("status codes: 522=14", p.stdout)
        self.assertIn("FAIL fewer than 50% answered 2xx", p.stdout)


def real_shared_cache_control():
    """The Cache-Control the origin really sends for a shareable guest page (the function of nonce-server.mjs, run by node)."""
    out = subprocess.run(
        ["node", "--input-type=module", "-e",
         "import {sharedCacheControl} from './server/nonce-server.mjs'; process.stdout.write(sharedCacheControl('s-maxage=60, stale-while-revalidate=300'))"],
        cwd=WEB, capture_output=True, text=True, timeout=60)
    return out.stdout if out.returncode == 0 else None


class SharedCache:
    """A shared cache with RFC 5861 stale-if-error: fresh within s-maxage; once stale it revalidates, and when the origin fails (5xx or unreachable)
    it serves the stale copy for as long as stale-if-error allows."""
    def __init__(self, origin_url):
        self.origin = origin_url
        self.store = {}

    def get(self, path):
        now = time.time()
        hit = self.store.get(path)
        if hit and now < hit["fresh_until"]:
            return 200, hit["body"], "HIT"
        try:
            with urllib.request.urlopen(self.origin + path, timeout=3) as r:
                cc = r.headers.get("Cache-Control", "")
                body = r.read()
                m = re.search(r"s-maxage=(\d+)", cc); sie = re.search(r"stale-if-error=(\d+)", cc)
                if "public" in cc and m and not r.headers.get("Set-Cookie"):
                    self.store[path] = {"body": body, "fresh_until": now + int(m.group(1)), "stale_ok_until": now + int(m.group(1)) + (int(sie.group(1)) if sie else 0)}
                return r.status, body, "MISS"
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
        if hit and now < hit["stale_ok_until"]:
            return 200, hit["body"], "STALE"
        return 522, b"", "ERROR"


@unittest.skipUnless(shutil.which("node"), "node is needed to read the origin's real header")
class OriginDown(unittest.TestCase):
    def test_a_public_page_is_served_with_the_origin_down_and_a_private_one_is_not(self):
        cc = real_shared_cache_control()
        self.assertIsNotNone(cc, "could not run patient-web/server/nonce-server.mjs sharedCacheControl")
        self.assertRegex(cc, r"stale-if-error=\d{7,}")  # a year, no time cap (owner decision #302)

        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_GET(self):
                self.send_response(200)
                if self.path.startswith("/ar/p/"):
                    self.send_header("Cache-Control", cc)         # public page: shareable
                else:
                    self.send_header("Cache-Control", "no-store")  # cart, sign-in, orders: never kept
                self.end_headers()
                self.wfile.write(b"page " + self.path.encode())

        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        edge = SharedCache(f"http://127.0.0.1:{srv.server_address[1]}")
        self.assertEqual(edge.get("/ar/p/abc")[2], "MISS")
        self.assertEqual(edge.get("/ar/checkout")[2], "MISS")
        srv.shutdown(); srv.server_close()                       # the origin goes down
        # the shareable page's copy is still fresh/stale-valid: served, with its own body
        status, body, how = edge.get("/ar/p/abc")
        self.assertEqual((status, body), (200, b"page /ar/p/abc"))
        # even after its s-maxage has passed (stale), it is served while the origin is down
        edge.store["/ar/p/abc"]["fresh_until"] = time.time() - 1
        status, body, how = edge.get("/ar/p/abc")
        self.assertEqual((status, how), (200, "STALE"))
        # a page that acts is not in the cache: it fails, as the owner expects (sign-in, booking, payment, orders)
        self.assertEqual(edge.get("/ar/checkout")[0], 522)
        # a page nobody asked before the outage is not there either: this is why 53-edge-warmup.sh keeps them requested
        self.assertEqual(edge.get("/ar/p/never-requested")[0], 522)


if __name__ == "__main__":
    unittest.main()
