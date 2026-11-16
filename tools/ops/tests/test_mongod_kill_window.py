"""tools/ops/tasks/96r-mongod-kill-window.sh against a fake docker, sudo and journalctl: kernel kills, the minutes before the last start (connections, slow ops with numbers),
client errors, the newest nightly files (encrypted ones included) and the backup log; read-only."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96r-mongod-kill-window.sh")

MONGO_LOG = r"""
2026-11-16T03:40:01.000000000Z {"t":{"$date":"x"},"s":"I","c":"NETWORK","id":22943,"msg":"connection accepted"}
2026-11-16T03:44:10.000000000Z {"t":{"$date":"x"},"s":"I","c":"NETWORK","id":22943,"msg":"connection accepted"}
2026-11-16T03:44:11.000000000Z {"t":{"$date":"x"},"s":"I","c":"NETWORK","id":51800,"msg":"client metadata","attr":{"doc":{"application":{"name":"nabd-worker"}},"appName":"nabd-worker"}}
2026-11-16T03:44:12.000000000Z {"t":{"$date":"x"},"s":"I","c":"COMMAND","id":51803,"msg":"Slow query","attr":{"type":"command","ns":"nabd.admin_actions_log","command":{"aggregate":"admin_actions_log","pipeline":[{"$match":{"secret":"VALUE-MUST-NOT-APPEAR"}}]},"planSummary":"COLLSCAN","docsExamined":900000,"hasSortStage":true,"usedDisk":false,"appName":"nabd-worker","durationMillis":52000}}
2026-11-16T03:45:30.000000000Z {"t":{"$date":"x"},"s":"I","c":"COMMAND","id":51803,"msg":"Slow query","attr":{"type":"command","ns":"nabd.users","planSummary":"IXSCAN { a: 1 }","docsExamined":10,"appName":"nabd-api","durationMillis":300}}
2026-11-16T03:46:40.000000000Z {"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4615611,"msg":"initializing"}
"""
BACKEND_LOG = "2026-11-16T03:45:00.000000000Z ERROR MongoNotConnected\n2026-11-16T03:45:01.000000000Z ERROR MongoNotConnected\n2026-11-16T03:30:00.000000000Z ERROR old\n"

FAKE_DOCKER = r"""#!/bin/bash
case "$1" in
  inspect) echo abc123;;
  logs) case "$*" in *nabdah-mongodb*) cat "$FAKE_DIR/mongo.log";; *nabdah-backend*) cat "$FAKE_DIR/backend.log";; esac;;
  ps) echo "nabdah-mongodb Up 3 hours"; echo "nabd-mongodump-oneoff Exited (0) 2 hours ago";;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
FAKE_JOURNAL = '#!/bin/bash\necho "Nov 16 03:46:40 host kernel: Killed process 1234 (mongod) total-vm:2500000kB, anon-rss:1592000kB, file-rss:0kB"\necho "Nov 16 03:46:40 host kernel: Memory cgroup out of memory: Killed process 1234 (mongod)"\n'


def run():
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin")); os.mkdir(os.path.join(d, "backups"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO), ("journalctl", FAKE_JOURNAL)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    with open(os.path.join(d, "mongo.log"), "w") as f: f.write(MONGO_LOG.lstrip())
    with open(os.path.join(d, "backend.log"), "w") as f: f.write(BACKEND_LOG)
    with open(os.path.join(d, "backups", "nabd_db_20261116-030001.gz.gpg"), "wb") as f: f.write(b"x" * 4096)
    with open(os.path.join(d, "backups", "nabd_db_20261116-030001.gz.gpg.oplogts"), "w") as f: f.write("ts")
    with open(os.path.join(d, "backup.log"), "w") as f: f.write("[Mon Nov 16 03:00:01 UTC 2026] mongodump nabd\n[Mon Nov 16 03:12:00 UTC 2026] local backup: nabd_db_20261116-030001.gz.gpg (4096 bytes)\n[Mon Nov 16 03:12:30 UTC 2026] done.\n")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_DIR": d,
           "OPS_BACKUP_DIR": os.path.join(d, "backups"), "OPS_BACKUP_LOG": os.path.join(d, "backup.log")}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class Check(unittest.TestCase):
    def test_kernel_kill_is_listed_with_its_rss(self):
        out = run()
        self.assertIn("kernel OOM lines for mongod in the last 48 h: 2", out)
        self.assertIn("anon-rss:1592000kB", out)

    def test_window_minutes_show_connections_and_slow_ops(self):
        out = run()
        self.assertIn("window: 2026-11-16T03:40 .. 2026-11-16T03:46", out)
        self.assertIn("minute: 2026-11-16T03:44 accepted=1 closed=0 slow_ops=1", out)
        self.assertIn("slow: 52000 ns=nabd.admin_actions_log type=command plan=COLLSCAN docs=900000 sort=1 disk=0 app=nabd-worker", out)
        self.assertIn("app connections in the window: nabd-worker=1", out)

    def test_slow_ops_are_sorted_by_duration_and_values_never_printed(self):
        out = run()
        self.assertLess(out.index("slow: 52000"), out.index("slow: 300"))
        self.assertNotIn("VALUE-MUST-NOT-APPEAR", out)

    def test_client_errors_per_minute(self):
        self.assertIn("nabdah-backend error lines per minute: 03:45=2", run())

    def test_the_encrypted_nightly_is_listed_with_its_size_and_the_log_lines(self):
        out = run()
        self.assertIn("file: ", out)
        self.assertIn("4096 bytes", out)
        self.assertIn("nabd_db_20261116-030001.gz.gpg", out)
        self.assertIn("log: [Mon Nov 16 03:12:00 UTC 2026] local backup: nabd_db_20261116-030001.gz.gpg (4096 bytes)", out)
        self.assertIn("nabd-mongodump-oneoff Exited", out)

    def test_read_only(self):
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in ("$DK restart", "$DK stop", "$DK kill", "$DK rm ", "$DK run", "$DK exec", "tee ", " > /", "systemctl stop", "systemctl restart", "rm -", "mongosh", "mongodump "):
            self.assertNotIn(bad, code)


if __name__ == "__main__":
    unittest.main()
