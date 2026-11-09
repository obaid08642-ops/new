"""tools/ops/tasks/96j-ledger-duplicates.sh against a fake docker: read-only command shape, memory refusal, masked output."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96j-ledger-duplicates.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo "${FAKE_STATE:-running}";;
  stats) echo "${FAKE_PCT:-55.20%}";;
  exec) printf '%s\n' "$FAKE_OUT"; exit "${FAKE_RC:-0}";;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
OUT = "ledger-duplicates: provider_earning groups=2 extra_rows=3 unique_index=absent\nledger-duplicates: done (read-only)"


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


class Counts(unittest.TestCase):
    def test_prints_the_counts_as_status_lines(self):
        out, _ = run()
        self.assertIn("status: ledger-duplicates: provider_earning groups=2 extra_rows=3 unique_index=absent", out)
        self.assertIn("done (read-only; nothing was written)", out)

    def test_runs_only_the_read_only_counts_script_with_a_small_heap(self):
        _, calls = run()
        execs = [l for l in calls.splitlines() if l.startswith("exec ")]
        self.assertEqual(len(execs), 1)
        self.assertIn("node dist/scripts/ledger-earning-duplicates.js", execs[0])
        self.assertIn("--max-old-space-size=96", execs[0])
        self.assertNotIn("createIndex", execs[0])
        self.assertNotIn("--apply", calls)
        self.assertNotIn("MONGO", calls)   # no connection string or credential on any command line

    def test_refuses_when_the_backend_is_near_its_memory_limit(self):
        out, calls = run(FAKE_PCT="91.40%")
        self.assertIn("REFUSE: the backend container is above 80%", out)
        self.assertNotIn("exec ", calls)

    def test_refuses_when_the_backend_is_not_running(self):
        out, calls = run(FAKE_STATE="exited")
        self.assertIn("REFUSE: nabdah-backend is not running", out)
        self.assertNotIn("exec ", calls)

    def test_a_failure_line_is_masked_and_the_exit_code_is_reported(self):
        out, _ = run(FAKE_OUT="failed: connect ECONNREFUSED mongodb://user:secretpw@mongodb:27017/?x=1", FAKE_RC="1")
        self.assertIn("ERROR: failed: connect ECONNREFUSED mongodb://<hidden>@mongodb:27017", out)
        self.assertNotIn("secretpw", out)
        self.assertIn("exited with code 1", out)

    def test_other_output_lines_are_dropped(self):
        out, _ = run(FAKE_OUT="some stack trace with a document {_id: 1, amount: 12.5}\n" + OUT)
        self.assertNotIn("stack trace", out)
        self.assertNotIn("amount: 12.5", out)


if __name__ == "__main__":
    unittest.main()
