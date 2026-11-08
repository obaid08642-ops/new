"""tools/ops/tasks/96h-mongo-restarts.sh against a fake docker: die/oom events counted by exit code, the gaps, the health results without the test command, the log before the last restart with IPs and secrets masked."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96h-mongo-restarts.sh")
PW = "pass'w0rd$x|y"
USER = "rootuser9"
STARTED = "2026-11-08T13:04:29.000000000Z"

FAKE_DOCKER = r"""#!/bin/bash
case "$1" in
  exec) case "$*" in *USERNAME*) echo "$FAKE_USER";; *PASSWORD*) echo "$FAKE_PW";; esac;;
  events) printf '%s\n' "1000 die exit=137 signal=" "1060 die exit=137 signal=" "1200 oom exit= signal=" "5000 die exit=0 signal=" "9000 die exit=14 signal=" "9100 die exit=137 signal=";;
  stats) echo "1.2GiB / 1.56GiB (77.00%)";;
  logs) printf '%s\n' '{"t":{"$date":"2026-11-08T13:03:50.123Z"},"s":"W","c":"NETWORK","id":22986,"msg":"Connection from 10.0.3.7:5555 user rootuser9 password pass'"'"'w0rd$x|y failed"}' 'plain text line 172.20.0.9' ;;
  inspect)
    case "$*" in
      *State.Status*) echo running;; *RestartCount*) echo 296;; *State.ExitCode*) echo 137;; *State.Error*) echo "";; *OOMKilled*) echo false;;
      *StartedAt*) echo "$FAKE_STARTED";; *FinishedAt*) echo 2026-11-08T13:03:40Z;; *RestartPolicy*) echo unless-stopped;; *Created*) echo 2026-11-05T10:00:00Z;;
      *Config.Healthcheck*) echo "interval=30s timeout=10s retries=5 start_period=1m0s";;
      *json*Health.Log*) echo '[{"Start":"2026-11-08T13:05:00.1Z","ExitCode":0},{"Start":"2026-11-08T13:05:30.1Z","ExitCode":1,"Output":"secret"}]';;
      *Health.FailingStreak*) echo 0;; *Health.Status*) echo healthy;; *HostConfig.Memory*) echo 1677721600;; *.Id*) echo abc123;; esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run():
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_PW": PW, "FAKE_USER": USER, "FAKE_STARTED": STARTED}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class Restarts(unittest.TestCase):
    def test_state_and_event_counts_by_exit_code(self):
        out = run()
        self.assertIn("restarts=296", out)
        self.assertIn("[exit=137]=3", out)
        self.assertIn("[exit=0]=1", out)
        self.assertIn("[exit=14]=1", out)
        self.assertIn("oom events in the window: 1", out)

    def test_gaps_between_the_last_die_events(self):
        out = run()
        self.assertIn("60s 3940s 4000s 100s", out)   # 1000->1060, ->5000, ->9000, ->9100

    def test_health_config_is_shown_without_the_test_command(self):
        out = run()
        self.assertIn("interval=30s timeout=10s retries=5", out)
        self.assertIn("the test command is not shown", out)
        self.assertIn("13:05:30 exit=1", out)

    def test_log_lines_are_masked(self):
        out = run()
        self.assertIn("<ip>", out)
        self.assertNotIn("10.0.3.7", out)
        self.assertNotIn("172.20.0.9", out)
        for secret in (USER, PW, "pass'w0rd"):
            self.assertNotIn(secret, out)

    def test_read_only_no_restart_calls(self):
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in ("$DK restart", "$DK stop", "$DK kill", "$DK rm", "$DK run", "$DK start", "compose up", "docker restart"):
            self.assertNotIn(bad, code)


if __name__ == "__main__":
    unittest.main()
