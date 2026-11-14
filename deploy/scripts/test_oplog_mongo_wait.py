"""deploy/scripts/_oplog-mongo-wait.sh: the oplog slice job waits for a restarting Mongo and says in the failure mail whether Mongo restarted."""
import os
import stat
import subprocess
import tempfile
import unittest

LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_oplog-mongo-wait.sh")
# `docker inspect` answers the next line of $FAKE_STATES each call (the last line repeats)
FAKE_DOCKER = """#!/bin/bash
n=$(cat "$FAKE_COUNT" 2>/dev/null || echo 0)
total=$(wc -l < "$FAKE_STATES")
line=$(sed -n "$((n + 1))p" "$FAKE_STATES"); [ -n "$line" ] || line=$(sed -n "${total}p" "$FAKE_STATES")
echo $((n + 1)) > "$FAKE_COUNT"
[ "$line" = "DOWN" ] && exit 1
echo "$line"
"""


class OplogMongoWait(unittest.TestCase):
    def run_lib(self, states, script, mark=None, extra_env=None):
        with tempfile.TemporaryDirectory() as d:
            bindir = os.path.join(d, "bin")
            os.mkdir(bindir)
            docker = os.path.join(bindir, "docker")
            with open(docker, "w") as f:
                f.write(FAKE_DOCKER)
            os.chmod(docker, os.stat(docker).st_mode | stat.S_IEXEC)
            with open(os.path.join(d, "states"), "w") as f:
                f.write("\n".join(states) + "\n")
            if mark is not None:
                with open(os.path.join(d, "oplog.mongo"), "w") as f:
                    f.write(mark + "\n")
            env = dict(os.environ, PATH=bindir + os.pathsep + os.environ["PATH"], MONGO_CONTAINER="nabdah-mongodb", BACKUP_DIR=d,
                       FAKE_STATES=os.path.join(d, "states"), FAKE_COUNT=os.path.join(d, "count"), OPLOG_POLL="0", **(extra_env or {}))
            p = subprocess.run(["bash", "-c", f'source "{LIB}"; {script}'], env=env, capture_output=True, text=True, timeout=30)
            marked = open(os.path.join(d, "oplog.mongo")).read().strip() if os.path.exists(os.path.join(d, "oplog.mongo")) else None
            return p.returncode, p.stdout.strip(), marked

    def test_healthy_when_running_and_healthy_or_without_a_healthcheck(self):
        self.assertEqual(self.run_lib(["running healthy 0 T1"], "mongo_healthy")[0], 0)
        self.assertEqual(self.run_lib(["running none 0 T1"], "mongo_healthy")[0], 0)

    def test_not_healthy_while_restarting_starting_or_gone(self):
        for state in ("restarting unhealthy 4 T1", "running starting 4 T1", "exited none 4 T1", "DOWN"):
            self.assertNotEqual(self.run_lib([state], "mongo_healthy")[0], 0, state)

    def test_wait_returns_as_soon_as_mongo_is_healthy(self):
        rc, _, _ = self.run_lib(["restarting unhealthy 4 T1", "running starting 4 T2", "running healthy 4 T2"], "wait_mongo_healthy 30")
        self.assertEqual(rc, 0)

    def test_wait_gives_up_after_the_time(self):
        rc, _, _ = self.run_lib(["restarting unhealthy 4 T1"], "wait_mongo_healthy 0")
        self.assertEqual(rc, 1)

    def test_the_note_says_mongo_restarted_when_the_count_or_start_time_moved(self):
        _, out, _ = self.run_lib(["running healthy 4 T2"], "mongo_restart_note", mark="3 T1")
        self.assertIn("RESTARTED", out)
        self.assertIn("3 -> 4", out)

    def test_the_note_says_mongo_did_not_restart_when_nothing_moved(self):
        _, out, _ = self.run_lib(["running healthy 3 T1"], "mongo_restart_note", mark="3 T1")
        self.assertIn("did NOT restart", out)

    def test_the_note_without_an_earlier_slice_and_without_docker(self):
        _, out, _ = self.run_lib(["running healthy 3 T1"], "mongo_restart_note")
        self.assertIn("no earlier good slice", out)
        _, out, _ = self.run_lib(["DOWN"], "mongo_restart_note", mark="3 T1")
        self.assertIn("could not be read", out)

    def test_a_good_slice_records_the_restart_count_and_start_time(self):
        _, _, marked = self.run_lib(["running healthy 4 2026-10-30T00:40:11Z"], "mongo_mark")
        self.assertEqual(marked, "4 2026-10-30T00:40:11Z")


if __name__ == "__main__":
    unittest.main()
