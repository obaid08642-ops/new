"""tools/ops/cf/49-cache-rules-prune.sh against a fake curl holding a cache-rules phase. No network, no secrets."""
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
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
if "/rulesets/phases/" in url:
    print(json.dumps({"success": True, "result": {"id": "rs1", "rules": st["rules"]}}))
elif "/rulesets/rs1" in url and method == "PUT":
    data = json.loads(args[args.index("--data") + 1])
    st["puts"].append([r["id"] for r in data["rules"]])
    if os.environ.get("FAKE_PUT_CHANGES_ENABLED"):
        for r in data["rules"]:
            if r.get("enabled"): r["expression"] = "tampered"
    keep = {r["id"]: r for r in data["rules"]}
    st["rules"] = [dict(r, **keep[r["id"]]) for r in st["rules"] if r["id"] in keep]
    json.dump(st, open(st_path, "w"))
    print(json.dumps({"success": True, "result": {"rules": st["rules"]}}))
else:
    print(json.dumps({"success": True}))
'''


def rule(i, enabled, updated, desc=None):
    return {"id": i, "action": "set_cache_settings", "description": desc or f"old {i}", "enabled": enabled,
            "expression": f"(expr {i})", "action_parameters": {"cache": False}, "last_updated": updated}


OLD = [rule(f"old{n}", False, f"2026-09-0{n}T00:00:00Z") for n in range(1, 6)]
LIVE = [rule("bypass", True, "2026-09-20T00:00:00Z", "Bypass: API"), rule("html", True, "2026-10-27T10:00:00Z", "Public HTML: respect origin"),
        rule("api", True, "2026-10-26T10:00:00Z", "Public catalogue API: respect origin"), rule("recent_off", False, "2026-10-27T12:00:00Z"),
        rule("lonely", False, "2026-10-28T01:00:00Z"), rule("b2", True, "2026-09-21T00:00:00Z", "Bypass: _next/data"), rule("b3", True, "2026-09-22T00:00:00Z", "Bypass: other")]


class Prune(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.bin = os.path.join(self.tmp.name, "bin"); os.makedirs(self.bin)
        for name, text in (("curl", FAKE_CURL), ("sleep", "#!/bin/bash\nexit 0\n")):
            p = os.path.join(self.bin, name)
            with open(p, "w") as f: f.write(text)
            os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
        self.state = os.path.join(self.tmp.name, "state.json")

    def run_task(self, name, rules=None, **extra):
        with open(self.state, "w") as f: json.dump({"rules": rules or (OLD + LIVE), "puts": []}, f)
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], FAKE_STATE=self.state, CF="tok-123-secret", Z="zone1", CFE="")
        env.update({k: str(v) for k, v in extra.items()})
        return subprocess.run(["bash", os.path.join(CF, name)], env=env, capture_output=True, text=True, timeout=60)

    def st(self):
        with open(self.state) as f: return json.load(f)

    def test_check_changes_nothing_and_names_the_ids(self):
        p = self.run_task("49-cache-rules-prune-check.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("cache rules now: 12 (5 enabled), plan limit 10", p.stdout)
        self.assertIn("would delete: old1 old2 old3 old4", p.stdout)   # need 12 + 2 - 10 = 4
        self.assertEqual(self.st()["puts"], [])
        self.assertNotIn("(expr", p.stdout)
        self.assertNotIn("tok-123-secret", p.stdout + p.stderr)

    def test_apply_deletes_only_old_disabled_rules_and_leaves_every_enabled_rule_alone(self):
        p = self.run_task("49-cache-rules-prune-apply.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        left = [r["id"] for r in self.st()["rules"]]
        for gone in ("old1", "old2", "old3", "old4"): self.assertNotIn(gone, left)
        for kept in ("old5", "bypass", "html", "api", "b2", "b3", "recent_off", "lonely"): self.assertIn(kept, left)   # newer disabled rules are not older than the cutoff
        self.assertIn("OK enabled rules unchanged (5)", p.stdout)

    def test_not_enough_old_rules_stops_without_changing_anything(self):
        p = self.run_task("49-cache-rules-prune-apply.sh", rules=OLD[:2] + LIVE, WANT_NEW=6)
        self.assertEqual(p.returncode, 1)
        self.assertIn("BLOCKED not enough old disabled rules (2)", p.stdout)
        self.assertEqual(self.st()["puts"], [])

    def test_nothing_to_free_when_it_already_fits(self):
        p = self.run_task("49-cache-rules-prune-apply.sh", rules=LIVE[:4])
        self.assertEqual(p.returncode, 0)
        self.assertIn("nothing to free", p.stdout)
        self.assertEqual(self.st()["puts"], [])

    def test_an_enabled_rule_that_changes_is_rolled_back(self):
        p = self.run_task("49-cache-rules-prune-apply.sh", FAKE_PUT_CHANGES_ENABLED=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("CHECK FAILED an enabled rule differs", p.stdout)
        self.assertIn("rollback success=true", p.stdout)

    def test_prune_ids_restricts_the_set(self):
        p = self.run_task("49-cache-rules-prune-check.sh", PRUNE_IDS="old1 old2 bypass", WANT_NEW=0, LIMIT=11)
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("candidates (off, older): 2", p.stdout)   # the enabled "bypass" is never a candidate

    def test_no_cutoff_stops(self):
        p = self.run_task("49-cache-rules-prune-check.sh", rules=OLD)
        self.assertEqual(p.returncode, 1)
        self.assertIn("BLOCKED no cutoff", p.stdout)


if __name__ == "__main__":
    unittest.main()
