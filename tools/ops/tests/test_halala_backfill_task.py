"""tools/ops/tasks/98s-halala-backfill.sh against a fake docker: dry run by default, every write gate refuses, counts only (never the unclean sample), exact flags reach the writer."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "98s-halala-backfill.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo "${FAKE_STATE:-running}";;
  stats) echo "${FAKE_PCT:-40.00%}";;
  exec)
    case "$*" in
      *DB_NAME*) printf nabd_test;;
      *money-halala-backfill.js*) printf '%s\n' "$FAKE_OUT"; exit "${FAKE_RC:-0}";;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
PLAN = ('PLAN [\n {\n  "collection": "transactions",\n  "field": "amount",\n  "to_fill": 12,\n  "unclean": 1,\n  "unclean_sample": [\n   {\n    "id": "SECRET-ID-1",\n    "value": 12.345\n   }\n  ]\n }\n]\n'
        'dry run only: nothing was written')
OWED = 'WALLET_OWED {"rows":8,"zero_rows":5,"positive_rows":3,"negative_rows":0,"not_a_number_rows":0,"positive_total_sar":152.5,"positive_without_activity_rows":1,"positive_newest_activity_months_max":9,"activity_checked":true}'
APPLIED = 'RUN_ID 11111111-2222-3333-4444-555555555555\nAPPLIED {"written":12,"skipped_unclean":1}'


def run(sets=None, now="10", dump_mb=60, dump_day=None, out=PLAN, state="running", pct="40.00%"):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        open(p, "w").write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
    bk = os.path.join(d, "backups")
    os.mkdir(bk)
    if dump_mb is not None:
        f = os.path.join(bk, "nabd_x.gz.gpg")
        with open(f, "wb") as fh:
            fh.truncate(dump_mb * 1048576)
    src = open(TASK).read()
    for k, v in (sets or {}).items():
        src = re.sub(r'^%s=""$' % k, '%s="%s"' % (k, v), src, flags=re.M)
    task = os.path.join(d, "task.sh")
    open(task, "w").write(src)
    log = os.path.join(d, "log")
    today = dump_day or subprocess.run(["date", "-u", "+%F"], capture_output=True, text=True).stdout.strip()
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"], FAKE_LOG=log, FAKE_OUT=out, FAKE_STATE=state, FAKE_PCT=pct,
               OPS_BACKUP_DIR=bk, OPS_NOW_HOUR_UTC=now, OPS_TODAY_UTC=today)
    o = subprocess.run(["bash", task], env=env, capture_output=True, text=True, timeout=60).stdout
    return o, (open(log).read() if os.path.exists(log) else "")


class HalalaBackfillTask(unittest.TestCase):
    def test_default_is_a_dry_run_with_counts_only(self):
        out, log = run(sets={"COLLECTION": "transactions"})
        self.assertIn("mode: dry", out)
        self.assertIn('"to_fill": 12', out)
        self.assertNotIn("SECRET-ID-1", out)
        self.assertNotIn("12.345", out)
        self.assertNotIn("--apply", log)

    def test_apply_needs_one_collection_and_the_confirm_word(self):
        for sets, why in (({"APPLY": "yes"}, "ONE COLLECTION"), ({"APPLY": "yes", "COLLECTION": "transactions"}, "CONFIRM must equal COLLECTION"),
                          ({"APPLY": "yes", "COLLECTION": "a,b", "CONFIRM": "a,b"}, "must not be a list")):
            out, log = run(sets=sets)
            self.assertIn(why, out)
            self.assertIn("nothing was written", out)
            self.assertNotIn("money-halala-backfill.js", log)

    def test_apply_refuses_without_todays_backup_in_the_backup_window_or_when_busy(self):
        ok = {"APPLY": "yes", "COLLECTION": "transactions", "CONFIRM": "transactions"}
        for kw, why in ((dict(dump_mb=None), "no nightly dump"), (dict(dump_mb=1), "smaller than"), (dict(dump_day="1999-01-01"), "not from today"),
                        (dict(now="03"), "backup window"), (dict(pct="95.00%"), "above 80%"), (dict(state="exited"), "not running")):
            out, log = run(sets=ok, **kw)
            self.assertIn(why, out)
            self.assertIn("REFUSE", out)
            self.assertNotIn("--apply", log)

    def test_apply_passes_the_exact_flags_and_the_database_confirm_word(self):
        out, log = run(sets={"APPLY": "yes", "COLLECTION": "transactions", "CONFIRM": "transactions"}, out=APPLIED)
        self.assertIn("RUN_ID 11111111-2222-3333-4444-555555555555", out)
        self.assertIn('APPLIED {"written":12,"skipped_unclean":1}', out)
        self.assertIn("--collection=transactions", log)
        self.assertIn("--apply", log)
        self.assertIn("MONEY_BACKFILL_CONFIRM=nabd_test", log)
        self.assertNotIn("--include-ledger", log)

    def test_ledger_only_with_its_own_switch(self):
        _, log = run(sets={"APPLY": "yes", "COLLECTION": "platformledgerentries", "CONFIRM": "platformledgerentries", "INCLUDE_LEDGER": "yes"}, out=APPLIED)
        self.assertIn("--include-ledger", log)

    def test_rollback_is_a_dry_run_unless_applied_with_the_run_id_as_confirm(self):
        out, log = run(sets={"ROLLBACK_RUN": "abc"}, out='ROLLBACK [{"collection":"transactions","field":"amount","logged":12,"to_unset":12}]\ndry run only: nothing was changed')
        self.assertIn("--rollback=abc", log)
        self.assertNotIn("--apply", log)
        out, log = run(sets={"ROLLBACK_RUN": "abc", "APPLY": "yes", "CONFIRM": "nope"})
        self.assertIn("CONFIRM must equal ROLLBACK_RUN", out)
        self.assertNotIn("--rollback", log)
        _, log = run(sets={"ROLLBACK_RUN": "abc", "APPLY": "yes", "CONFIRM": "abc"})
        self.assertIn("--rollback=abc", log)
        self.assertIn("--apply", log)

    def test_orders_apply_passes_the_exact_flags_and_never_asks_about_wallets(self):
        out, log = run(sets={"APPLY": "yes", "COLLECTION": "orders", "CONFIRM": "orders"}, out=APPLIED)
        self.assertIn("--collection=orders", log)
        self.assertIn("--apply", log)
        self.assertIn("MONEY_BACKFILL_CONFIRM=nabd_test", log)
        self.assertNotIn("--wallet-owed", log)
        self.assertNotIn("wallet-owed:", out)
        self.assertIn("RUN_ID 11111111-2222-3333-4444-555555555555", out)

    def test_wallets_dry_run_prints_the_owed_money_counts_only(self):
        out, log = run(sets={"COLLECTION": "wallets"}, out=OWED + "\n" + PLAN)
        self.assertIn("--wallet-owed", log)
        self.assertIn("--collection=wallets", log)
        self.assertNotIn("--apply", log)
        for part in ("rows:8", "positive_rows:3", "positive_total_sar:152.5", "positive_newest_activity_months_max:9"):
            self.assertIn("wallet-owed: ", out)
            self.assertIn(part, out)
        self.assertNotIn("SECRET-ID-1", out)

    def test_a_dry_run_with_no_collection_also_prints_the_owed_counts(self):
        out, log = run(out=OWED + "\n" + PLAN)
        self.assertIn("wallet-owed: ", out)
        self.assertIn("positive_rows:3", out)
        self.assertNotIn("--apply", log)

    def test_wallets_apply_needs_the_owners_owed_money_decision(self):
        ok = {"APPLY": "yes", "COLLECTION": "wallets", "CONFIRM": "wallets"}
        out, log = run(sets=ok, out=OWED + "\n" + APPLIED)
        self.assertIn("money owed to a patient", out)
        self.assertIn("REFUSE", out)
        self.assertNotIn("--apply", log)
        self.assertNotIn("money-halala-backfill.js", log)
        out, log = run(sets=dict(ok, WALLET_OWED_OK="yes"), out=OWED + "\n" + APPLIED)
        self.assertNotIn("REFUSE", out)
        self.assertIn("wallet-owed: ", out)
        self.assertIn("--collection=wallets", log)
        self.assertIn("--apply", log)
        self.assertIn("RUN_ID 11111111-2222-3333-4444-555555555555", out)

    def test_other_collections_do_not_need_the_wallet_decision_and_a_rollback_never_reads_wallets(self):
        out, _ = run(sets={"APPLY": "yes", "COLLECTION": "transactions", "CONFIRM": "transactions"}, out=APPLIED)
        self.assertNotIn("money owed", out)
        out, log = run(sets={"ROLLBACK_RUN": "abc"}, out='ROLLBACK []\ndry run only: nothing was changed')
        self.assertNotIn("--wallet-owed", log)


if __name__ == "__main__":
    unittest.main()
