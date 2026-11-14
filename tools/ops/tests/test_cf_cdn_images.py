"""tools/ops/cf/48-cdn-images.sh against a fake curl (Cloudflare API + CDN). No network, no secrets."""
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
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
if "cloudflare.com" in url:
    if "/settings/" in url:
        name = url.rsplit("/", 1)[1]
        if method == "PATCH":
            st["calls"].append("set " + name); st["settings"][name] = json.loads(args[args.index("--data") + 1])["value"]; save()
            print(json.dumps({"success": True, "result": {"value": st["settings"][name]}}))
        else:
            print(json.dumps({"success": True, "result": {"value": st["settings"].get(name, "off")}}))
    elif url.endswith("/purge_cache"):
        st["calls"].append("purge " + args[args.index("--data") + 1]); st["purged"] = True; save()
        print(json.dumps({"success": True}))
    elif "/workers/routes" in url:
        print(json.dumps({"success": True, "result": []}))
    elif "/rulesets/phases/" in url:
        print(json.dumps({"success": True, "result": {"rules": []}}))
    else:
        print(json.dumps({"success": True, "result": {"value": "off", "name": "nabd.plus", "plan": {"name": "Pro"}}}))
    sys.exit(0)
if "-w" in args:
    print("2.50" if not st.get("purged") else "0.15"); sys.exit(0)
if "-D" in args:
    sys.stdout.write("HTTP/2 200\r\ncache-control: public, max-age=31536000, immutable\r\ncf-cache-status: HIT\r\nage: 99\r\n\r\n")
elif "-o" not in args:
    sys.stdout.write('{"items":[{"image":"https://cdn.nabd.plus/p/a.webp"}]}')
'''


class CdnImages(unittest.TestCase):
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

    def run_task(self, name, settings=None):
        with open(self.state, "w") as f:
            json.dump({"settings": settings or {}, "calls": []}, f)
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="", N="10")
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=60)

    def state_json(self):
        with open(self.state) as f: return json.load(f)

    def test_check_reads_only_and_prints_the_settings_and_timings(self):
        p = self.run_task("48-cdn-images-check.sh", {"mirage": "on"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("setting mirage = on", p.stdout)
        self.assertIn("workers routes: []", p.stdout)
        self.assertIn("before a.webp: p50=2.50s p95=2.50s", p.stdout)
        self.assertIn("check only: nothing changed", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_turns_off_only_what_is_on_purges_the_host_and_measures_again(self):
        p = self.run_task("48-cdn-images-apply.sh", {"mirage": "on", "polish": "off", "rocket_loader": "on"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.state_json()["calls"]
        self.assertEqual(calls[:2], ["set mirage", "set rocket_loader"])
        self.assertEqual(calls[2], 'purge {"hosts":["cdn.nabd.plus"]}')
        self.assertIn("after a.webp: p50=0.15s", p.stdout)
        self.assertIn("settings changed: mirage=on rocket_loader=on", p.stdout)

    def test_apply_with_nothing_on_only_purges(self):
        p = self.run_task("48-cdn-images-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(len(self.state_json()["calls"]), 1)
        self.assertIn("settings changed: none", p.stdout)


if __name__ == "__main__":
    unittest.main()
