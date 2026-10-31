import json, os, unittest
from changed_paths import decide, glob_to_regex, load_groups, HERE

G = load_groups()


def run(files, event="pull_request"):
    return decide(G, files, event)


class ChangedPaths(unittest.TestCase):
    def test_docs_and_ops_only_run_nothing(self):
        for files in (["docs/qa/x.md"], ["deploy/nginx/conf.d/a.conf", "tools/ops/RUN"], ["audit/REPORT.md", "README.md"]):
            self.assertEqual({g for g, v in run(files).items() if v}, set(), files)

    def test_app_only_does_not_run_backend_live_gate_or_acceptance(self):
        r = run(["patient-app/src/a.ts"])
        self.assertTrue(r["app"] and r["design"])
        self.assertFalse(r["backend"] or r["live"] or r["acceptance"] or r["web"] or r["provider"] or r["admin"])

    def test_backend_runs_backend_live_and_acceptance(self):
        r = run(["backend/src/x.ts"])
        self.assertTrue(r["backend"] and r["live"] and r["acceptance"])
        self.assertFalse(r["app"] or r["web"] or r["provider"])

    def test_web_runs_live_gate_because_the_gate_builds_the_web(self):
        r = run(["patient-web/app/x.tsx"])
        self.assertTrue(r["web"] and r["live"] and r["design"])
        self.assertFalse(r["backend"] or r["acceptance"])

    def test_shared_packages_run_every_app(self):
        r = run(["packages/ui-native/src/Button.tsx"])
        self.assertTrue(r["app"] and r["web"] and r["provider"] and r["admin"] and r["design"])

    def test_editing_a_gating_workflow_runs_its_own_suite(self):
        self.assertTrue(run([".github/workflows/live-gate.yml"])["live"])
        self.assertTrue(run([".github/workflows/acceptance.yml"])["acceptance"])
        self.assertTrue(all(run([".github/workflows/patient-production-ci.yml"])[g] for g in ("backend", "web", "app", "provider", "admin", "design")))

    def test_push_schedule_manual_and_unknown_files_run_everything(self):
        for event in ("push", "schedule", "workflow_dispatch"):
            self.assertTrue(all(run(["docs/a.md"], event).values()), event)
        self.assertTrue(all(run(None).values()))

    def test_glob(self):
        self.assertTrue(glob_to_regex("backend/**").match("backend/a/b/c.ts"))
        self.assertFalse(glob_to_regex("backend/**").match("backend2/a.ts"))
        self.assertTrue(glob_to_regex("a/*/c").match("a/b/c"))
        self.assertFalse(glob_to_regex("a/*/c").match("a/b/x/c"))

    def test_every_group_in_the_action_exists(self):
        import re
        act = open(os.path.join(HERE, "..", "..", ".github", "actions", "changed-paths", "action.yml")).read()
        self.assertEqual(set(re.findall(r"^  (\w+): \{ description", act, re.M)), set(G))


if __name__ == "__main__":
    unittest.main()
