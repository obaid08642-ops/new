"""tools/ops/tasks/96u-launch-facts.sh against a fake docker: read-only (no write call anywhere), names and counts only, every section prints."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96u-launch-facts.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) echo running;;
  exec)
    all="$*"
    case "$all" in
      *SCFHS_API_KEY*) printf 'SCFHS_VERIFY_URL ';;
      *listDatabases*) echo "'nabd_nestjs'";;
      *providerprofiles*) printf 'LIC doctor total=40 no_licence_date=3\nLIC lab total=5 no_licence_date=5\n';;
      *domain_outbox_pharmacy_idempotency_unique*) printf 'IDX domain_outbox.domain_outbox_pharmacy_idempotency_unique present unique=true\nIDX pharmacy_broadcast_recipients.pharmacy_broadcast_recipient_unique MISSING\n';;
      *oldest_pending_min*) printf 'OUT state=sent rows=120\nOUT state=pending rows=2\nOUT oldest_pending_min=4\n';;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run():
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f:
            f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
    log = os.path.join(d, "log")
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"], FAKE_LOG=log)
    out = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60).stdout
    return out, open(log).read() if os.path.exists(log) else ""


class LaunchFacts(unittest.TestCase):
    def test_every_section_prints_counts_and_names(self):
        out, _ = run()
        self.assertIn("scfhs: nabdah-backend has set: SCFHS_VERIFY_URL", out)
        self.assertIn("licences: doctor total=40 no_licence_date=3", out)
        self.assertIn("licences: lab total=5 no_licence_date=5", out)
        self.assertIn("migration-20260827: domain_outbox.domain_outbox_pharmacy_idempotency_unique present unique=true", out)
        self.assertIn("pharmacy_broadcast_recipient_unique MISSING", out)
        self.assertIn("domain_outbox: state=pending rows=2", out)
        self.assertIn("domain_outbox: oldest_pending_min=4", out)
        self.assertTrue(out.rstrip().endswith("done (read-only; nothing was written)"))

    def test_no_write_call_and_no_secret_value_is_read(self):
        src = open(TASK).read()
        for bad in ("insertOne", "insertMany", "updateOne", "updateMany", "deleteOne", "deleteMany", "drop(", "createIndex", "$set", "$out", "$merge", "--apply"):
            self.assertNotIn(bad, src)
        # the SCFHS variables are tested for presence only: no echo/printenv of a value
        self.assertIsNone(re.search(r"printenv|echo \"?\$SCFHS|env \|", src))


if __name__ == "__main__":
    unittest.main()
