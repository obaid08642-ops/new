"""docs/ops/60-deploy-main-mongo-wait.patch: the added block (wait for healthy, retry once if mongod restarted during the dump) run with stubs."""
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PATCH = os.path.join(HERE, "..", "..", "..", "docs", "ops", "60-deploy-main-mongo-wait.patch")


def block():
    with open(PATCH) as f:
        lines = f.read().splitlines()
    out = []
    for l in lines:
        if l.startswith("+") and not l.startswith("+++") and "mongodump in a ONE-OFF" not in l:
            out.append(l[1:])
    text = "\n".join(out)
    i = text.index("# Run 104")
    j = text.index('[ -s "$DUMP_TMP" ] && sudo -n install -m 600 "$DUMP_TMP" "$DUMP"')
    return text[i:j + len('[ -s "$DUMP_TMP" ] && sudo -n install -m 600 "$DUMP_TMP" "$DUMP"')]


STUBS = r'''
set -u
D=$(mktemp -d); DUMP=$D/final; N=0
DK=dk
dk() { case "$*" in *StartedAt*) i=$(cat "$D/si" 2>/dev/null || echo 0); echo "${STARTS[$i]}"; [ "$i" -lt $((${#STARTS[@]}-1)) ] && echo $((i+1)) > "$D/si";; esac; }
wait_healthy() { echo "waited-$1"; [ "${HEALTHY:-yes}" = yes ]; }
mongodump_oneoff() { N=$((N+1)); if [ "$N" -le "${FAIL_FIRST:-0}" ]; then return 1; fi; echo dump-bytes > "$1"; return 0; }
sudo() { shift; [ "$1" = install ] && cp "$4" "$5"; }
'''


def run(starts, fail_first=0, healthy="yes"):
    d = tempfile.mkdtemp()
    p = os.path.join(d, "t.sh")
    with open(p, "w") as f:
        f.write("#!/bin/bash\n" + STUBS + "STARTS=(" + " ".join(starts) + ")\nFAIL_FIRST=%d\nHEALTHY=%s\n" % (fail_first, healthy) + block() + '\necho "installed=$([ -s "$DUMP" ] && echo yes || echo no) dumps=$N"\n')
    r = subprocess.run(["bash", p], capture_output=True, text=True, timeout=30)
    return r.stdout + r.stderr, r.returncode


class Patch(unittest.TestCase):
    def test_normal_run_waits_once_dumps_once(self):
        out, rc = run(["T1", "T1"])
        self.assertIn("installed=yes dumps=1", out)
        self.assertEqual(out.count("waited-"), 1)

    def test_restart_during_the_dump_retries_once_and_says_so(self):
        out, rc = run(["T1", "T2"], fail_first=1)
        self.assertIn("mongod RESTARTED during the backup (started T1, then T2)", out)
        self.assertIn("installed=yes dumps=2", out)

    def test_failure_without_a_restart_is_not_retried(self):
        out, rc = run(["T1", "T1"], fail_first=1)
        self.assertNotIn("RESTARTED", out)
        self.assertIn("installed=no dumps=1", out)

    def test_second_failure_after_restart_installs_nothing(self):
        out, rc = run(["T1", "T2"], fail_first=2)
        self.assertIn("failed again after the mongod restart", out)
        self.assertIn("installed=no dumps=2", out)

    def test_mongod_never_healthy_aborts_before_any_dump(self):
        out, rc = run(["T1"], healthy="no")
        self.assertIn("ABORT mongod is not healthy after 3 minutes", out)
        self.assertEqual(rc, 1)
        self.assertNotIn("dumps=", out)


if __name__ == "__main__":
    unittest.main()
