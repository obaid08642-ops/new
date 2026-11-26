"""tools/ops/tasks/98u-market-id-backfill.sh and 98v-catalogue-registration-backfill.sh against a fake docker: dry run by default, every write gate refuses, one scope per run, counts only, exact flags and the database confirm word reach the writer, rollback by run id."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASKS = {
    "market": dict(file="98u-market-id-backfill.sh", script="market-backfill.js", var="COLLECTION", flag="--collection=", confirm="MARKET_BACKFILL_CONFIRM", value="orders"),
    "catalogue": dict(file="98v-catalogue-registration-backfill.sh", script="catalogue-registration-backfill.js", var="KIND", flag="--kind=", confirm="CATALOGUE_BACKFILL_CONFIRM", value="medicine"),
}

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo "${FAKE_STATE:-running}";;
  stats) echo "${FAKE_PCT:-40.00%}";;
  exec)
    case "$*" in
      *DB_NAME*) printf nabd_test;;
      *backfill.js*) printf '%s\n' "$FAKE_OUT"; exit "${FAKE_RC:-0}";;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
PLAN = 'PLAN [{"collection":"orders","missing":12}]\ndry run only: nothing was written'
APPLIED = 'RUN_ID 11111111-2222-3333-4444-555555555555\nAPPLIED {"written":12}\nSECRET-DOC-LINE-NOT-MATCHED'


def run(task, sets=None, now="10", dump_mb=60, dump_day=None, out=PLAN, state="running", pct="40.00%"):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as fh:
            fh.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
    bk = os.path.join(d, "backups")
    os.mkdir(bk)
    if dump_mb is not None:
        with open(os.path.join(bk, "nabd_x.gz.gpg"), "wb") as fh:
            fh.truncate(dump_mb * 1048576)
    with open(os.path.join(HERE, "..", "tasks", TASKS[task]["file"])) as fh:
        src = fh.read()
    for k, v in (sets or {}).items():
        src, n = re.subn(r'^%s=""$' % k, '%s="%s"' % (k, v), src, flags=re.M)
        assert n == 1, k
    path = os.path.join(d, "task.sh")
    with open(path, "w") as fh:
        fh.write(src)
    log = os.path.join(d, "log")
    today = dump_day or subprocess.run(["date", "-u", "+%F"], capture_output=True, text=True).stdout.strip()
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"], FAKE_LOG=log, FAKE_OUT=out, FAKE_STATE=state, FAKE_PCT=pct,
               OPS_BACKUP_DIR=bk, OPS_NOW_HOUR_UTC=now, OPS_TODAY_UTC=today)
    o = subprocess.run(["bash", path], env=env, capture_output=True, text=True, timeout=60).stdout
    logtext = ""
    if os.path.exists(log):
        with open(log) as fh:
            logtext = fh.read()
    return o, logtext


class BackfillTasks(unittest.TestCase):
    def each(self):
        for name, t in TASKS.items():
            with self.subTest(task=name):
                yield name, t

    def test_default_is_a_dry_run_with_counts_only(self):
        for name, t in self.each():
            out, log = run(name, sets={t["var"]: t["value"]})
            self.assertIn("mode: dry", out)
            self.assertIn('"missing":12', out)
            self.assertNotIn("--apply", log)
            self.assertIn(t["flag"] + t["value"], log)
            self.assertNotIn(t["confirm"], log)

    def test_apply_needs_one_scope_and_the_confirm_word(self):
        for name, t in self.each():
            for sets, why in (({"APPLY": "yes"}, "ONE " + t["var"]), ({"APPLY": "yes", t["var"]: t["value"]}, "CONFIRM must equal " + t["var"]),
                              ({"APPLY": "yes", t["var"]: "a,b", "CONFIRM": "a,b"}, "must not be a list")):
                out, log = run(name, sets=sets)
                self.assertIn(why, out)
                self.assertIn("nothing was written", out)
                self.assertNotIn(t["script"], log)

    def test_apply_refuses_without_todays_backup_in_the_backup_window_or_when_busy(self):
        for name, t in self.each():
            ok = {"APPLY": "yes", t["var"]: t["value"], "CONFIRM": t["value"]}
            for kw, why in ((dict(dump_mb=None), "no nightly dump"), (dict(dump_mb=1), "smaller than"), (dict(dump_day="1999-01-01"), "not from today"),
                            (dict(now="03"), "backup window"), (dict(now="04"), "backup window"), (dict(pct="95.00%"), "above 80%"), (dict(state="exited"), "not running")):
                out, log = run(name, sets=ok, **kw)
                self.assertIn(why, out)
                self.assertIn("REFUSE", out)
                self.assertNotIn("--apply", log)

    def test_apply_passes_the_exact_flags_and_the_database_confirm_word_and_prints_counts_only(self):
        for name, t in self.each():
            out, log = run(name, sets={"APPLY": "yes", t["var"]: t["value"], "CONFIRM": t["value"]}, out=APPLIED)
            self.assertIn("RUN_ID 11111111-2222-3333-4444-555555555555", out)
            self.assertIn('APPLIED {"written":12}', out)
            self.assertNotIn("SECRET-DOC-LINE-NOT-MATCHED", out)
            self.assertIn(t["flag"] + t["value"], log)
            self.assertIn("--apply", log)
            self.assertIn("%s=nabd_test" % t["confirm"], log)

    def test_rollback_is_a_dry_run_unless_applied_with_the_run_id_as_confirm(self):
        for name, t in self.each():
            out, log = run(name, sets={"ROLLBACK_RUN": "abc"}, out='ROLLBACK [{"collection":"orders","stamped":12}]\ndry run only: nothing was changed')
            self.assertIn("--rollback=abc", log)
            self.assertNotIn("--apply", log)
            self.assertIn("rollback-dry", out)
            out, log = run(name, sets={"ROLLBACK_RUN": "abc", "APPLY": "yes", "CONFIRM": "nope"})
            self.assertIn("CONFIRM must equal ROLLBACK_RUN", out)
            self.assertNotIn("--rollback", log)
            _, log = run(name, sets={"ROLLBACK_RUN": "abc", "APPLY": "yes", "CONFIRM": "abc"})
            self.assertIn("--rollback=abc", log)
            self.assertIn("--apply", log)

    def test_connection_strings_are_never_echoed(self):
        for name, t in self.each():
            out, _ = run(name, out="failed: connect mongodb://user:pass@host:27017/db refused")
            self.assertNotIn("user:pass", out)
            self.assertIn("<hidden>", out)


if __name__ == "__main__":
    unittest.main()
