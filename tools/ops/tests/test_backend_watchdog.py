"""deploy/scripts/backend-watchdog.sh (fake docker, temp state dir), tools/ops/tasks/98k-backend-watchdog.sh (installer) and 99n-mongod-memory.sh (read-only report)."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
WATCHDOG = os.path.join(HERE, "..", "..", "..", "deploy", "scripts", "backend-watchdog.sh")
INSTALL = os.path.join(HERE, "..", "tasks", "98k-backend-watchdog.sh")
MONITOR_TASK = os.path.join(HERE, "..", "tasks", "98m-monitor-cron.sh")
TCMALLOC = os.path.join(HERE, "..", "tasks", "98n-mongod-tcmalloc.sh")
MONITOR_SH = os.path.join(HERE, "..", "..", "..", "deploy", "scripts", "monitor.sh")
REPORT = os.path.join(HERE, "..", "tasks", "99n-mongod-memory.sh")


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


def slurp(path):
    with open(path) as f:
        return f.read()


class Base(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup); self.t = t.name
        self.b = os.path.join(self.t, "bin"); os.makedirs(self.b)
        self.log = os.path.join(self.t, "docker.log")
        write_exec(os.path.join(self.b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')


class Watchdog(Base):
    def setUp(self):
        super().setUp()
        self.state = os.path.join(self.t, "state"); self.mail = os.path.join(self.t, "mail.txt")
        self.health = os.path.join(self.t, "health")
        os.makedirs(self.health)
        self.docker = os.path.join(self.b, "docker")
        write_exec(self.docker, f'''#!/bin/bash
echo "$@" >> "{self.log}"
case "$1" in
  inspect) cat "{self.health}/${{@: -1}}" 2>/dev/null;;
  restart) [ -f "{self.health}/FAIL" ] && exit 1; exit 0;;
esac
''')
        write_exec(os.path.join(self.t, "mail.sh"), f'#!/bin/bash\ncat >> "{self.mail}"\n')
        self.now = 1_800_000_000

    def set(self, container, status):
        with open(os.path.join(self.health, container), "w") as f:
            f.write(status)

    def tick(self, apply=True, **kv):
        env = dict(os.environ, WATCHDOG_STATE_DIR=self.state, WATCHDOG_DOCKER=self.docker, WATCHDOG_NOW=str(self.now),
                   WATCHDOG_MAIL_CMD=os.path.join(self.t, "mail.sh"), WATCHDOG_APPLY="yes" if apply else "no")
        env.update({k: str(v) for k, v in kv.items()})
        p = subprocess.run(["bash", WATCHDOG], env=env, capture_output=True, text=True, timeout=30)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.now += 60
        return p.stdout

    def restarts(self):
        if not os.path.exists(self.log):
            return []
        return [l.split()[-1] for l in slurp(self.log).splitlines() if l.startswith("restart")]

    def test_restarts_only_after_three_unhealthy_minutes_in_a_row(self):
        self.set("nabdah-backend", "unhealthy"); self.set("nabdah-patient-web", "healthy")
        self.tick(); self.tick()
        self.assertEqual(self.restarts(), [])
        out = self.tick()
        self.assertEqual(self.restarts(), ["nabdah-backend"])
        self.assertIn("nabdah-backend restarted", out)
        self.assertIn("nabdah-backend was unhealthy for 3 minutes", slurp(self.mail))

    def test_a_healthy_minute_resets_the_count(self):
        self.set("nabdah-backend", "unhealthy"); self.tick(); self.tick()
        self.set("nabdah-backend", "healthy"); self.tick()
        self.set("nabdah-backend", "unhealthy"); self.tick(); self.tick()
        self.assertEqual(self.restarts(), [])

    def test_starting_and_missing_containers_are_not_restarted(self):
        self.set("nabdah-backend", "starting")
        for _ in range(5):
            self.tick()
        self.assertEqual(self.restarts(), [])

    def test_cooldown_blocks_a_second_restart_then_allows_it(self):
        self.set("nabdah-backend", "unhealthy")
        for _ in range(3):
            self.tick()
        self.assertEqual(len(self.restarts()), 1)
        for _ in range(6):
            out = self.tick()
        self.assertEqual(len(self.restarts()), 1)
        self.assertIn("cooldown 15 min: not restarting", out)
        for _ in range(12):
            self.tick()
        self.assertEqual(len(self.restarts()), 2)

    def test_dry_run_never_restarts(self):
        self.set("nabdah-backend", "unhealthy")
        for _ in range(4):
            out = self.tick(apply=False)
        self.assertEqual(self.restarts(), [])
        self.assertIn("DRY RUN", out)
        self.assertFalse(os.path.exists(self.mail))

    def test_a_failed_restart_is_mailed_and_does_not_start_the_cooldown(self):
        self.set("nabdah-backend", "unhealthy")
        write_exec(os.path.join(self.health, "FAIL"), "")
        for _ in range(3):
            out = self.tick()
        self.assertIn("restart FAILED", out)
        self.assertIn("could not restart it", slurp(self.mail))
        os.remove(os.path.join(self.health, "FAIL"))
        self.tick()
        self.assertEqual(self.restarts(), ["nabdah-backend", "nabdah-backend"])


class Installer(Base):
    def setUp(self):
        super().setUp()
        self.cron = os.path.join(self.t, "cron.d"); self.script = os.path.join(self.t, "backend-watchdog.sh")

    def run_task(self, **kv):
        src = slurp(INSTALL)
        for k, v in kv.items():
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.t, "task.sh"); write_exec(script, src)
        env = dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"], OPS_CRON_DIR=self.cron, OPS_WATCHDOG_SCRIPT=self.script,
                   OPS_WATCHDOG_LOG=os.path.join(self.t, "w.log"))
        return subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=30)

    def test_dry_run_changes_nothing(self):
        write_exec(self.script, "#!/bin/bash\n")
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("dry run only", p.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.cron, "nabd-backend-watchdog")))

    def test_apply_needs_the_script_on_the_host(self):
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1)
        self.assertIn("run 91c-host-files first", p.stdout)
        self.assertFalse(os.path.exists(self.cron))

    def test_apply_installs_and_rollback_removes(self):
        write_exec(self.script, "#!/bin/bash\n")
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        text = slurp(os.path.join(self.cron, "nabd-backend-watchdog"))
        self.assertIn(f"* * * * * root WATCHDOG_APPLY=yes {self.script}", text)
        p = self.run_task(ROLLBACK="yes")
        self.assertIn("rolled back", p.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.cron, "nabd-backend-watchdog")))
        self.assertTrue(os.path.exists(self.script))


class MongodReport(Base):
    def test_report_is_read_only_and_prints_numbers(self):
        deploy = os.path.join(self.t, "deploy"); os.makedirs(deploy)
        write_exec(os.path.join(self.b, "docker"), f'''#!/bin/bash
echo "$@" >> "{self.log}"
case "$1" in
  exec) echo '{{"n":3,"m":2,"k":{{"query":2,"command":1}},"cache_now":524288000,"cache_max":644245094,"cache_dirty":1048576,"tc_alloc":734003200,"tc_heap":1073741824,"res_mb":900,"virt_mb":2000,"conn":{{"current":42,"available":800,"totalCreated":999}},"cursors":{{"total":5,"noTimeout":0,"pinned":1}}}}';;
  inspect) echo 27;;
esac
exit 0
''')
        env = dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"], OPS_DEPLOY_DIR=deploy)
        p = subprocess.run(["bash", REPORT], env=env, capture_output=True, text=True, timeout=60)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("status: mongod-memory: wiredTiger cache: now=500MB", p.stdout)
        self.assertIn("connections: current=42", p.stdout)
        verbs = {l.split()[0] for l in slurp(self.log).splitlines()}
        self.assertTrue(verbs <= {"exec", "inspect", "stats", "ps", "logs"}, verbs)


class MonitorCron(Base):
    def setUp(self):
        super().setUp()
        self.cron = os.path.join(self.t, "cron.d"); os.makedirs(self.cron)
        self.deploy = os.path.join(self.t, "deploy"); os.makedirs(os.path.join(self.deploy, "scripts"))
        self.script = os.path.join(self.deploy, "scripts", "monitor.sh")
        self.roottab = os.path.join(self.t, "roottab")
        write_exec(os.path.join(self.b, "crontab"), f'#!/bin/bash\n[ -f "{self.roottab}" ] && cat "{self.roottab}"\nexit 0\n')
        self.other = os.path.join(self.t, "spool"); os.makedirs(self.other)

    def run_task(self, env_extra=None, **kv):
        src = slurp(MONITOR_TASK)
        for k, v in kv.items():
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.t, "task.sh"); write_exec(script, src)
        env = dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"], OPS_CRON_DIR=self.cron, OPS_DEPLOY_DIR=self.deploy,
                   OPS_SCHED_PATHS=self.other + "/*", OPS_ALERT_LOG=os.path.join(self.t, "alerts.log"), OPS_MONITOR_STATE=os.path.join(self.t, "state"),
                   OPS_WATCHDOG_LOG=os.path.join(self.t, "b.log"))
        env.update(env_extra or {})
        return subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=30)

    def test_dry_run_reports_nowhere_and_writes_nothing(self):
        write_exec(self.script, "#!/bin/bash\n")
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("monitor.sh scheduled in: NOWHERE; script on the host: yes", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(os.listdir(self.cron), [])

    def test_it_sees_a_schedule_in_a_directory_only_root_can_read_and_in_the_root_crontab(self):
        with open(os.path.join(self.other, "root"), "w") as f:
            f.write("*/15 * * * * /opt/nabdah/deploy/scripts/monitor.sh\n")
        p = self.run_task()
        self.assertIn("monitor.sh scheduled in: root;", p.stdout)
        os.remove(os.path.join(self.other, "root"))
        with open(self.roottab, "w") as f:
            f.write("*/15 * * * * /opt/nabdah/deploy/scripts/monitor.sh\n")
        p = self.run_task()
        self.assertIn("monitor.sh scheduled in: root-crontab;", p.stdout)

    def test_apply_refuses_a_second_schedule_and_a_missing_script(self):
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1); self.assertIn("run 91c-host-files first", p.stdout)
        write_exec(self.script, "#!/bin/bash\n")
        with open(os.path.join(self.cron, "other"), "w") as f:
            f.write("*/5 * * * * root /x/monitor.sh\n")
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1); self.assertIn("already scheduled in: other", p.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.cron, "nabd-monitor")))

    def test_apply_installs_every_15_minutes_and_is_idempotent_and_rolls_back(self):
        write_exec(self.script, "#!/bin/bash\n")
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn(f"*/15 * * * * root {self.script}", slurp(os.path.join(self.cron, "nabd-monitor")))
        p = self.run_task(APPLY="yes")
        self.assertIn("already installed by this task", p.stdout)
        p = self.run_task(ROLLBACK="yes")
        self.assertFalse(os.path.exists(os.path.join(self.cron, "nabd-monitor")))

    def test_mail_settings_are_reported_as_set_or_unset_never_as_values(self):
        write_exec(self.script, "#!/bin/bash\n")
        with open(os.path.join(self.deploy, ".env.production"), "w") as f:
            f.write("OPS_ALERT_EMAIL=ops@secret.invalid\nRESEND_API_KEY=re_supersecret\n")
        p = self.run_task()
        self.assertIn("OPS_ALERT_EMAIL=set MAIL_FROM=unset RESEND_API_KEY=set BREVO_API_KEY=unset", p.stdout)
        self.assertNotIn("secret", p.stdout)

    def test_testmail_prints_only_sent_or_failed(self):
        import shutil
        shutil.copy(MONITOR_SH, self.script)
        mailfile = os.path.join(self.t, "mail.txt")
        envf = os.path.join(self.deploy, ".env.production")
        with open(envf, "w") as f:
            f.write("OPS_ALERT_EMAIL=ops@example.invalid\nMAIL_FROM=x@y.invalid\n")
        p = self.run_task({"MONITOR_MAIL_CMD": f"tee -a {mailfile}", "MONITOR_LOG_DIR": self.t}, TESTMAIL="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("status: monitor-cron: test mail: sent", p.stdout)
        self.assertNotIn("ops@example.invalid", p.stdout)
        self.assertIn("test mail from monitor.sh", slurp(mailfile))
        with open(envf, "w") as f:
            f.write("OPS_ALERT_EMAIL=ops@example.invalid\nMAIL_FROM=x@y.invalid\n")
        p = self.run_task({"MONITOR_LOG_DIR": self.t, "RESEND_API_KEY": "", "BREVO_API_KEY": "", "MAILJET_API_KEY": ""}, TESTMAIL="yes")
        self.assertIn("status: monitor-cron: test mail: failed", p.stdout)


class Tcmalloc(Base):
    def docker(self, supported=True, refuse=False):
        state = os.path.join(self.t, "rate")
        with open(state, "w") as f:
            f.write("1")
        write_exec(os.path.join(self.b, "docker"), f'''#!/bin/bash
echo "$@" >> "{self.log}"
[ "$1" = exec ] || exit 0
last="${{@: -1}}"
case "$last" in
  *getParameter*) {'echo \'{"r":null}\'' if not supported else 'echo "{\\"r\\":$(cat ' + state + ')}"'};;
  *setParameter*) {'echo \'{"ok":0}\'' if refuse else 'v=$(echo "$last" | sed -E "s/.*tcmallocReleaseRate:([0-9.]+).*/\\1/"); echo "$v" > ' + state + '; echo \'{"ok":1}\''};;
  *serverStatus*) echo '{{"a":613416960,"h":862978048,"f":249561088,"c":1048576}}';;
esac
exit 0
''')

    def run_task(self, **kv):
        src = slurp(TCMALLOC)
        for k, v in kv.items():
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.t, "task.sh"); write_exec(script, src)
        env = dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"], WAIT="0")
        return subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=30)

    def sets(self):
        return [l for l in slurp(self.log).splitlines() if "setParameter" in l]

    def test_dry_run_reads_and_changes_nothing(self):
        self.docker()
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("tcmallocReleaseRate now: 1", p.stdout)
        self.assertIn("before: allocated=585MB heap=823MB free_in_page_heap=238MB", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(self.sets(), [])

    def test_apply_sets_the_rate_and_prints_before_and_after(self):
        self.docker()
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("set: tcmallocReleaseRate 1 -> 5", p.stdout)
        self.assertIn("after 0s: allocated=585MB", p.stdout)
        self.assertEqual(len(self.sets()), 1)
        p = self.run_task(ROLLBACK="yes")
        self.assertIn("rolled back: tcmallocReleaseRate=1.0", p.stdout)

    def test_a_server_that_does_not_know_the_parameter_or_refuses_it_is_left_alone(self):
        self.docker(supported=False)
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1); self.assertIn("does not know tcmallocReleaseRate", p.stdout)
        self.assertEqual(self.sets(), [])
        self.docker(refuse=True)
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1); self.assertIn("refused the parameter: nothing changed", p.stdout)


if __name__ == "__main__":
    unittest.main()
