"""tools/ops/tasks/96s-ingredient-dry-run.sh against a fake docker: read-only command shape, memory refusal, masked output, no writer."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96s-ingredient-dry-run.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo "${FAKE_STATE:-running}";;
  stats) echo "${FAKE_PCT:-55.20%}";;
  exec) printf '%s\n' "$FAKE_OUT"; exit "${FAKE_RC:-0}";;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
OUT = ("ingredient-dry-run: table approved=false entries=0 (not approved: every ingredient text counts as review)\n"
       "ingredient-dry-run: TOTAL products=20990 empty=620 (3.0%) leaflet=141 (0.7%) confident=0 (0.0%) review=20229 (96.4%)\n"
       'ingredient-dry-run: spelling n=412 "paracetamol"\n'
       "ingredient-dry-run: done (read-only)")


def run(**extra):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    log = os.path.join(d, "log")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_LOG": log, "FAKE_OUT": OUT, **extra}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    with open(log) as f: calls = f.read() if os.path.exists(log) else ""
    return r.stdout + r.stderr, calls


class DryRun(unittest.TestCase):
    def test_prints_the_report_as_status_lines(self):
        out, _ = run()
        self.assertIn("status: ingredient-dry-run: TOTAL products=20990 empty=620", out)
        self.assertIn('status: ingredient-dry-run: spelling n=412 "paracetamol"', out)
        self.assertIn("done (read-only; nothing was written)", out)

    def test_runs_only_the_dry_run_script_with_a_small_heap_and_no_credentials_on_the_command_line(self):
        _, calls = run(TOP="25")
        execs = [l for l in calls.splitlines() if l.startswith("exec ")]
        self.assertEqual(len(execs), 1)
        self.assertIn("node dist/scripts/ingredient-dry-run.js", execs[0])
        self.assertIn("--max-old-space-size=160", execs[0])
        self.assertIn("TOP=25", execs[0])
        for bad in ("--apply", "MONGO", "backfill", "migrate"):
            self.assertNotIn(bad, calls)

    def test_a_non_numeric_top_falls_back(self):
        _, calls = run(TOP="5; rm -rf /")
        self.assertIn("TOP=60", calls)
        self.assertNotIn("rm -rf", calls)

    def test_refuses_when_the_backend_is_near_its_memory_limit(self):
        out, calls = run(FAKE_PCT="91.40%")
        self.assertIn("REFUSE: the backend container is above 80%", out)
        self.assertNotIn("exec ", calls)

    def test_refuses_when_the_backend_is_not_running(self):
        out, calls = run(FAKE_STATE="exited")
        self.assertIn("REFUSE: nabdah-backend is not running", out)
        self.assertNotIn("exec ", calls)

    def test_failure_line_is_masked_and_other_lines_dropped(self):
        out, _ = run(FAKE_OUT="a stack trace with a document {_id: 1, name: 'x'}\nfailed: connect ECONNREFUSED mongodb://user:secretpw@mongodb:27017/?x=1", FAKE_RC="1")
        self.assertIn("ERROR: failed: connect ECONNREFUSED mongodb://<hidden>@mongodb:27017", out)
        self.assertNotIn("secretpw", out)
        self.assertNotIn("stack trace", out)
        self.assertIn("exited with code 1", out)


if __name__ == "__main__":
    unittest.main()
