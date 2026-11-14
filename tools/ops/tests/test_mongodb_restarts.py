"""tools/ops/tasks/96b-mongodb-restarts.sh against a fake docker / dmesg: read-only diagnosis, only state, event kinds, kernel kills by command name and mongod log MESSAGE IDS are printed."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "96b-mongodb-restarts.sh")
LOG_LINES = "\n".join([
    '{"t":{"$date":"2026-10-30T14:01:02.123+00:00"},"s":"I","c":"CONTROL","id":23377,"ctx":"SignalHandler","msg":"Received signal SECRET-MESSAGE-TEXT","attr":{"ns":"patients.records"}}',
    '{"t":{"$date":"2026-10-30T14:01:03.123+00:00"},"s":"W","c":"STORAGE","id":22347,"ctx":"x","msg":"Failed to open SECRET-MESSAGE-TEXT"}',
    '{"t":{"$date":"2026-10-30T14:01:09.123+00:00"},"s":"I","c":"CONTROL","id":4615611,"ctx":"initandlisten","msg":"MongoDB starting SECRET-MESSAGE-TEXT"}',
])
EVENTS = "1793360000 die exit=137 signal=\n1793360001 oom exit= signal=\n1793360050 die exit=137 signal=\n1793360051 start exit= signal="


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class MongodbRestarts(unittest.TestCase):
    def run_task(self):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        log = os.path.join(d, "calls.log")
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{log}"
case "$1" in
  inspect) case "$*" in
    *State.Status*) echo running;; *ExitCode*) echo 137;; *OOMKilled*) echo false;; *State.Error*) echo "";; *RestartCount*) echo 32;;
    *StartedAt*) echo 2026-10-30T18:40:00Z;; *RestartPolicy*) echo unless-stopped;; *State.Health*) echo healthy;; *HostConfig.Memory}}*) echo 1258291200;;
    *.Id*) echo abc123;; *) echo 0;; esac;;
  stats) echo "888MiB / 1.17GiB (74.1%)";;
  events) cat <<'EV'
{EVENTS}
EV
  ;;
  logs) cat <<'LG'
{LOG_LINES}
LG
  ;;
esac
''')
        write_exec(os.path.join(b, "dmesg"), '#!/bin/bash\nprintf "[x] Out of memory: Killed process 11 (mongod) total-vm\\n[x] Out of memory: Killed process 12 (mongosh) total-vm\\n[x] Out of memory: Killed process 13 (mongod) total-vm\\n"\n')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], HOME=d)
        return subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60), open(log).read()

    def test_prints_state_events_kernel_kills_and_log_ids_only(self):
        p, calls = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("restarts=32", p.stdout)
        self.assertIn("[die exit=137 signal=]=2", p.stdout)
        self.assertIn("event: ", p.stdout)
        self.assertIn("mongod=2", p.stdout); self.assertIn("mongosh=1", p.stdout)
        self.assertIn("[23377 CONTROL I]x1", p.stdout)
        self.assertIn("id=22347 STORAGE W", p.stdout)
        self.assertIn("id23377=1", p.stdout)
        self.assertNotIn("SECRET-MESSAGE-TEXT", p.stdout + p.stderr)       # message text and namespaces are never printed
        self.assertNotIn("patients.records", p.stdout)

    def test_is_read_only_and_status_lines_only(self):
        p, calls = self.run_task()
        for verb in ("restart", "rm ", "stop", "kill ", "compose", " exec "):
            self.assertNotIn(verb, calls)
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)


if __name__ == "__main__":
    unittest.main()
