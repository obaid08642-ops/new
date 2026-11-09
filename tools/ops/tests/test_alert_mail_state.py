"""tools/ops/tasks/98q-alert-mail-state.sh against a fake host layout: the new rule detected in the scripts, env overrides shown as numbers only, state and mail counts, no secret."""
import os
import shutil
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..", "..")
TASK = os.path.join(HERE, "..", "tasks", "98q-alert-mail-state.sh")
SECRET = "re_SECRET_KEY_VALUE_123"
NOW = 1_800_000_000
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run(new_scripts=True, env_lines="", state=True):
    d = tempfile.mkdtemp()
    deploy = os.path.join(d, "deploy"); os.makedirs(os.path.join(deploy, "scripts"))
    for name in ("monitor.sh", "backend-watchdog.sh"):
        src = os.path.join(ROOT, "deploy", "scripts", name)
        if new_scripts:
            shutil.copy(src, os.path.join(deploy, "scripts", name))
        else:
            with open(os.path.join(deploy, "scripts", name), "w") as f: f.write("#!/bin/bash\n# the old script\n")
    with open(os.path.join(deploy, ".env.production"), "w") as f: f.write(f"RESEND_API_KEY={SECRET}\n{env_lines}")
    st = os.path.join(d, "mon"); wst = os.path.join(d, "wd"); logs = os.path.join(d, "log"); os.makedirs(logs)
    if state:
        os.makedirs(st); os.makedirs(wst)
        with open(os.path.join(st, "crit-streaks"), "w") as f: f.write("container-nabdah-mongodb 3\ndisk-crit 1\n")
        with open(os.path.join(st, "clean-streak"), "w") as f: f.write("0\n")
        with open(os.path.join(st, "last-signature"), "w") as f: f.write("container-nabdah-mongodb")
        with open(os.path.join(st, "last-sent"), "w") as f: f.write(str(NOW - 7200))
        with open(os.path.join(wst, "nabdah-backend.lastmail"), "w") as f: f.write(str(NOW - 3600))
        with open(os.path.join(wst, "nabdah-backend.restarts-since-mail"), "w") as f: f.write("4")
        with open(os.path.join(wst, "nabdah-backend.fails-since-mail"), "w") as f: f.write("1")
    with open(os.path.join(logs, "nabdah-monitor.log"), "w") as f:
        f.write("[2026-11-08 10:00:01] mail sent via resend: [nabd.plus] 1 alert(s): container nabdah-mongodb state=restarting\n[2026-11-08 12:00:01] mail sent via resend: [nabd.plus] all checks OK again\n[2026-11-09 03:00:01] mail sent via resend: [nabd.plus] daily summary: disk 30% free, 0 alert(s)\n[2026-11-09 03:15:01] OK - all checks passed\n")
    with open(os.path.join(logs, "nabdah-alerts.log"), "w") as f: f.write("[2026-11-09 03:00:00] alert mail failed via resend (HTTP 500)\n")
    os.makedirs(os.path.join(d, "bin"))
    p = os.path.join(d, "bin", "sudo")
    with open(p, "w") as f: f.write(FAKE_SUDO)
    os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "OPS_DEPLOY_DIR": deploy, "OPS_MONITOR_STATE_DIR": st, "OPS_WATCHDOG_STATE_DIR": wst, "OPS_LOG_DIR": logs, "OPS_NOW_EPOCH": str(NOW)}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class State(unittest.TestCase):
    def test_new_scripts_are_recognised(self):
        out = run()
        self.assertIn("monitor.sh on the host: confirm-runs rule=yes, recover rule=yes, repeat default 24 h=yes, mail-sent log=yes", out)
        self.assertIn("backend-watchdog.sh on the host: mail gap rule=yes", out)

    def test_old_scripts_are_reported_with_the_way_to_fix_it(self):
        out = run(new_scripts=False)
        self.assertIn("confirm-runs rule=no, recover rule=no, repeat default 24 h=no, mail-sent log=no", out)
        self.assertIn("mail gap rule=no", out)
        self.assertIn("run 91c-host-files.sh (dry run, then APPLY)", out)

    def test_an_env_override_is_shown_as_a_number_and_a_non_number_is_flagged(self):
        out = run(env_lines="ALERT_REPEAT_HOURS=6\nALERT_CONFIRM_RUNS=abc\n")
        self.assertIn("ALERT_REPEAT_HOURS: set in .env.production to 6 (this overrides the script default)", out)
        self.assertIn("ALERT_CONFIRM_RUNS: set to a non-number", out)
        self.assertIn("RECOVER_CONFIRM_RUNS: not set in .env.production", out)

    def test_state_streaks_and_last_mail(self):
        out = run()
        self.assertIn("container-nabdah-mongodb=3 disk-crit=1", out)
        self.assertIn("keys named by the last alert mail: container-nabdah-mongodb; last mail 120 min ago", out)
        self.assertIn("watchdog nabdah-backend: last mail 60 min ago; restarts since it: 4; failed restarts since it: 1", out)

    def test_mails_per_day_and_subjects(self):
        out = run()
        self.assertIn("2026-11-08=2 2026-11-09=1", out)
        self.assertIn("all checks OK again", out)
        self.assertIn("mail failure lines in the alert log (the whole file; it is rotated): 1", out)

    def test_missing_state_is_said_not_crashed_and_no_secret_leaks(self):
        out = run(state=False, env_lines="ALERT_REPEAT_HOURS=6\n")
        self.assertIn("does not exist yet", out)
        self.assertNotIn(SECRET, out)
        self.assertNotIn("RESEND_API_KEY", out)

    def test_read_only(self):
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in (" tee ", "install ", " mv ", " rm ", " cp ", "systemctl", "docker", ">> ", "docker restart", "service ", "crontab"):
            self.assertNotIn(bad, code)


if __name__ == "__main__":
    unittest.main()
