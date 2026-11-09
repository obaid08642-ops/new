"""Every pull-request workflow cancels the older run of the same pull request, and never cancels a run on main (push, schedule, manual).
Run: python3 -m unittest tools/ci/test_workflow_concurrency.py (needs PyYAML)."""
import glob, os, unittest
import yaml

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
PR_ONLY_EXPR = "${{ github.event_name == 'pull_request' }}"


def triggers(doc):
    on = doc.get("on", doc.get(True))  # PyYAML reads the key `on` as True
    if isinstance(on, str):
        return {on}
    if isinstance(on, list):
        return set(on)
    return set(on or {})


class WorkflowConcurrency(unittest.TestCase):
    def test_every_pull_request_workflow(self):
        bad = []
        for path in sorted(glob.glob(os.path.join(ROOT, ".github", "workflows", "*.yml"))):
            doc = yaml.safe_load(open(path, encoding="utf8"))
            t = triggers(doc)
            if "pull_request" not in t:
                continue
            name = os.path.basename(path)
            c = doc.get("concurrency")
            if not isinstance(c, dict) or "group" not in c:
                bad.append(f"{name}: no concurrency group"); continue
            group = str(c["group"])
            if "github.event.pull_request.number" not in group and "github.ref" not in group:
                bad.append(f"{name}: the group does not separate pull requests ({group})")
            cancel = c.get("cancel-in-progress")
            others = t - {"pull_request"}
            if cancel is True and others - {"workflow_dispatch"}:
                bad.append(f"{name}: cancel-in-progress: true would also cancel push/schedule runs")
            if cancel is not True and str(cancel).replace(" ", "") != PR_ONLY_EXPR.replace(" ", ""):
                bad.append(f"{name}: cancel-in-progress is {cancel!r}: a newer push to a pull request must replace the older run")
        self.assertEqual(bad, [], "\n".join(bad))


if __name__ == "__main__":
    unittest.main()
