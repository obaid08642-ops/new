"""tools/ops/cf/50-ai-crawlers.sh against a fake curl (Cloudflare bot_management + robots.txt + a bot request). No network, no secrets."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

CF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cf")
MANAGED = """# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

# END Cloudflare Managed Content
"""
OWN = """User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /api/

User-agent: GPTBot
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /api/
"""
FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
sys.stdin.read() if "--config" in args else None
st_path = os.environ["FAKE_STATE"]
st = json.load(open(st_path))
def save(): json.dump(st, open(st_path, "w"))
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
if "cloudflare.com" in url:
    if url.endswith("/bot_management"):
        if method == "PUT":
            body = json.loads(args[args.index("--data") + 1])
            st["calls"].append("put " + json.dumps(body, sort_keys=True))
            if not st.get("ignore_put"):
                st["bm"].update(body)
            save()
        print(json.dumps({"success": True, "result": st["bm"]}))
    else:
        print(json.dumps({"success": True, "result": {"status": "active"}}))
    sys.exit(0)
if "-w" in args:
    print(st["bot_code"] if st["bm"]["ai_bots_protection"] == "block" or st.get("waf_blocks_bots") else "200"); sys.exit(0)
sys.stdout.write(st["managed_txt"] if st["bm"]["is_robots_txt_managed"] else st["own_txt"])
'''


class AiCrawlers(unittest.TestCase):
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

    def run_task(self, name, managed=True, ai="block", **extra):
        st = {"bm": {"is_robots_txt_managed": managed, "ai_bots_protection": ai, "crawler_protection": "disabled", "cf_robots_variant": "off"},
              "calls": [], "managed_txt": MANAGED, "own_txt": OWN, "bot_code": "403"}
        st.update(extra)
        with open(self.state, "w") as f: json.dump(st, f)
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="")
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=60)

    def state_json(self):
        with open(self.state) as f: return json.load(f)

    def test_check_reads_only_and_names_the_blocked_bots(self):
        p = self.run_task("50-ai-crawlers-check.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("bots with Disallow /: ClaudeBot GPTBot", p.stdout)
        self.assertIn("would set is_robots_txt_managed=false", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_turns_both_off_and_proves_robots_txt_after(self):
        p = self.run_task("50-ai-crawlers-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("robots.txt BEFORE: managed block 1", p.stdout)
        self.assertIn("robots.txt AFTER: managed block 0", p.stdout)
        self.assertIn("bots with Disallow /: none", p.stdout.split("AFTER:")[1])
        self.assertIn("ai-train=yes", p.stdout)
        st = self.state_json()
        self.assertEqual(st["calls"], ['put {"ai_bots_protection": "disabled", "is_robots_txt_managed": false}'])
        self.assertEqual(st["bm"]["crawler_protection"], "disabled")

    def test_already_off_changes_nothing(self):
        p = self.run_task("50-ai-crawlers-apply.sh", managed=False, ai="disabled")
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("already off", p.stdout)
        self.assertEqual(self.state_json()["calls"], [])

    def test_rolls_back_when_robots_txt_keeps_the_managed_block(self):
        p = self.run_task("50-ai-crawlers-apply.sh", ignore_put=True)
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("still carries the Cloudflare managed block", p.stdout)
        self.assertIn("rollback success=true", p.stdout)
        self.assertEqual(len(self.state_json()["calls"]), 2)
        self.assertIn('"is_robots_txt_managed": true', self.state_json()["calls"][1])

    def test_rolls_back_when_another_rule_still_refuses_a_bot(self):
        p = self.run_task("50-ai-crawlers-apply.sh", waf_blocks_bots=True)
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("gets HTTP 403 on a public page", p.stdout)
        self.assertIn("rollback success=true", p.stdout)
        self.assertIn('"is_robots_txt_managed": false', self.state_json()["calls"][0])
        self.assertEqual(self.state_json()["bm"]["ai_bots_protection"], "block")


if __name__ == "__main__":
    unittest.main()
