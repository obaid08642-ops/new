"""tools/ops/tasks/98t-pharmacy-indexes.sh against a fake docker: dry run by default, APPLY gates, counts only, exact flags reach the compiled CLI."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "98t-pharmacy-indexes.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo "${FAKE_STATE:-running}";;
  stats) echo "${FAKE_PCT:-40.00%}";;
  exec)
    case "$*" in
      *DB_NAME*) printf nabd_test;;
      *pharmacy-expiry-indexes.js*) printf '%s\n' "$FAKE_OUT"; exit "${FAKE_RC:-0}";;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
PLAN = ("pharmacy-indexes: plan domain_outbox.domain_outbox_pharmacy_idempotency_unique unique=true present=false rows=120 duplicate_groups=0\n"
        "pharmacy-indexes: dry run only: nothing was written")
APPLIED = ("pharmacy-indexes: plan domain_outbox.domain_outbox_pharmacy_idempotency_unique unique=true present=false rows=120 duplicate_groups=2\n"
           "pharmacy-indexes: refused_duplicates domain_outbox_pharmacy_idempotency_unique\npharmacy-indexes: created pharmacy_offers_due_expiry_scan")


def run(sets=None, now="10", out=PLAN, state="running", pct="40.00%"):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        open(p, "w").write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
    src = open(TASK).read()
    for k, v in (sets or {}).items():
        src = re.sub(r'^%s=""$' % k, '%s="%s"' % (k, v), src, flags=re.M)
    task = os.path.join(d, "task.sh")
    open(task, "w").write(src)
    log = os.path.join(d, "log")
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"], FAKE_LOG=log, FAKE_OUT=out, FAKE_STATE=state, FAKE_PCT=pct, OPS_NOW_HOUR_UTC=now)
    o = subprocess.run(["bash", task], env=env, capture_output=True, text=True, timeout=60).stdout
    return o, (open(log).read() if os.path.exists(log) else "")


class PharmacyIndexesTask(unittest.TestCase):
    def test_default_is_a_dry_run_that_never_passes_apply(self):
        out, log = run()
        self.assertIn("duplicate_groups=0", out)
        self.assertIn("dry run only", out)
        self.assertNotIn("--apply", log)

    def test_apply_needs_the_confirm_word_and_every_gate(self):
        out, log = run(sets={"APPLY": "yes"})
        self.assertIn("CONFIRM must be the word: indexes", out)
        self.assertNotIn("pharmacy-expiry-indexes.js", log)
        for kw, why in ((dict(now="03"), "backup window"), (dict(pct="95.00%"), "above 80%"), (dict(state="exited"), "not running")):
            out, log = run(sets={"APPLY": "yes", "CONFIRM": "indexes"}, **kw)
            self.assertIn(why, out)
            self.assertIn("nothing was written", out)
            self.assertNotIn("--apply", log)

    def test_apply_passes_the_flag_and_the_database_confirm_word_and_reports_refusals(self):
        out, log = run(sets={"APPLY": "yes", "CONFIRM": "indexes"}, out=APPLIED)
        self.assertIn("--apply", log)
        self.assertIn("PHARMACY_INDEXES_CONFIRM=nabd_test", log)
        self.assertIn("refused_duplicates domain_outbox_pharmacy_idempotency_unique", out)
        self.assertIn("created pharmacy_offers_due_expiry_scan", out)

    def test_dry_run_reports_gates_without_refusing(self):
        out, log = run(now="04")
        self.assertIn("would refuse an APPLY now", out)
        self.assertIn("pharmacy-expiry-indexes.js", log)
        self.assertNotIn("--apply", log)


if __name__ == "__main__":
    unittest.main()
