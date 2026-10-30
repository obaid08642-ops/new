"""tools/ops/tasks/94-ranking-recompute.sh, 91b-upload-scan-defer.sh and 91c-host-files.sh against fake docker, sudo and curl (no server, no secrets)."""
import hashlib
import os
import re
import stat
import subprocess
import tarfile
import tempfile
import unittest

TASKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks")
FAKE_SUDO = """#!/bin/bash
[ "$1" = -n ] && shift
exec "$@"
"""
FAKE_DOCKER = r"""#!/bin/bash
echo "$@" >> "$FAKE_LOG"
ENVF="$OPS_DEPLOY_DIR/.env.production"
case "$1" in
  inspect)
    case "$3" in
      '{{.Image}}') echo "sha256:0123456789abcdef"; exit 0;;
      *) echo "${FAKE_HEALTH:-healthy}"; exit 0;;
    esac;;
  tag) exit 0;;
  run) case "$*" in *" apply "*) cat "$FAKE_APPLY_OUT";; *) cat "$FAKE_PLAN_OUT";; esac; exit 0;;
  compose) [ -n "$FAKE_COMPOSE_FAIL" ] && exit 1; exit 0;;
  exec)
    if [ "$2" = -i ]; then   # redis-cli through sh -c; the password arrives on stdin, never as an argument
      read -r PW; echo "$PW" >> "$FAKE_STDIN_LOG"
      case "$*" in
        *"config set maxmemory"*) [ -n "$FAKE_REDIS_SET_FAIL" ] && exit 1; v=$(echo "$*" | sed -n 's/.*config set maxmemory \([0-9]*\)mb.*/\1/p'); echo $((v*1048576)) > "$FAKE_REDIS_STATE"; echo OK; exit 0;;
        *"config get maxmemory"*) cat "$FAKE_REDIS_STATE"; exit 0;;
      esac
      exit 0
    fi
    shift; shift   # exec <container>
    case "$1" in
      test) case "$3" in
              *ranking-recompute.js) [ -n "$FAKE_NO_RANKING_TOOL" ] && exit 1 || exit 0;;
              *pending-scan.service.js) [ -n "$FAKE_NO_QUARANTINE" ] && exit 1 || exit 0;;
            esac; exit 0;;
      sh) grep -q '^UPLOAD_SCAN=defer$' "$ENVF" && exit 0 || exit 1;;
      node) if [ "$3" = apply ]; then cat "$FAKE_APPLY_OUT"; exit "${FAKE_APPLY_RC:-0}"; else cat "$FAKE_PLAN_OUT"; exit "${FAKE_PLAN_RC:-0}"; fi;;
    esac;;
esac
exit 0
"""
FAKE_CURL = r"""#!/bin/bash
ENVF="$OPS_DEPLOY_DIR/.env.production"
if [ -z "$FAKE_CONFIG_BROKEN" ] && grep -q '^UPLOAD_SCAN=defer$' "$ENVF"; then echo '{"features":{"uploads_enabled":true,"uploads_pending_scan":true}}'; else echo '{"features":{"uploads_enabled":false}}'; fi
"""
PLAN = ('{"step":"orders_count","products_with_delivered_orders":40,"differs":40,"modified":0}\n'
        '{"step":"category_pos","medicines_with_category":21000,"missing_category_pos":21000,"categories":9}\n'
        '{"step":"metrics","rows":3}\n'
        '{"step":"first_page","when":"before","of":24,"distinct_categories":1}\n'
        '{"step":"plan","writes":false}\n')
APPLY = ('{"step":"first_page","when":"before","of":24,"distinct_categories":1}\n'
         '{"step":"orders_count","products_with_delivered_orders":40,"differs":40,"modified":40}\n'
         '{"step":"recompute","updated":3}\n'
         '{"step":"category_pos","medicines_with_category":21000,"missing_category_pos":0,"categories":9}\n'
         '{"step":"first_page","when":"after","of":24,"distinct_categories":9}\n'
         '{"step":"verify","ok":true}\n')
SECRET = "super-secret-value-9f3a"
ENV_BEFORE = f"APP_NAME=nabd\nJWT_SECRET={SECRET}\nMONGO_ROOT_PASSWORD={SECRET}2\nUPLOAD_SCAN=required\n"


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class Harness:
    def __init__(self, test):
        self.tmp = tempfile.TemporaryDirectory()
        test.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        self.bin = os.path.join(d, "bin")
        self.deploy = os.path.join(d, "deploy")
        self.backups = os.path.join(d, "backups")
        self.cron = os.path.join(d, "cron.d")
        self.log = os.path.join(d, "docker.log")
        self.releases = os.path.join(d, "releases")
        for p in (self.bin, os.path.join(self.deploy, "scripts"), self.backups, self.cron, self.releases):
            os.makedirs(p)
        write_exec(os.path.join(self.bin, "sudo"), FAKE_SUDO)
        write_exec(os.path.join(self.bin, "docker"), FAKE_DOCKER)
        write_exec(os.path.join(self.bin, "curl"), FAKE_CURL)
        write_exec(os.path.join(self.deploy, "scripts", "clamav-window.sh"), "#!/bin/bash\n")
        write_exec(os.path.join(self.deploy, "scripts", "_backup-common.sh"), "# helper\n")
        self.envf = os.path.join(self.deploy, ".env.production")
        with open(self.envf, "w") as f:
            f.write(ENV_BEFORE)
        os.chmod(self.envf, 0o600)
        self.redis_state = os.path.join(d, "redis.state")
        with open(self.redis_state, "w") as f:
            f.write(str(512 * 1048576) + "\n")
        self.plan_out = os.path.join(d, "plan.out")
        self.apply_out = os.path.join(d, "apply.out")
        for p, t in ((self.plan_out, PLAN), (self.apply_out, APPLY)):
            with open(p, "w") as f:
                f.write(t)

    def run(self, task, settings=None, **extra):
        with open(os.path.join(TASKS, task)) as fh:
            src = fh.read()
        for k, v in (settings or {}).items():                     # the reviewer edits these lines in the task file
            src = re.sub(rf'^{k}=""$', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.tmp.name, task)
        with open(script, "w") as f:
            f.write(src)
        env = dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], OPS_DEPLOY_DIR=self.deploy, OPS_BACKUP_DIR=self.backups,
                   OPS_CRON_DIR=self.cron, OPS_RELEASE_DIR=self.releases, FAKE_LOG=self.log, FAKE_PLAN_OUT=self.plan_out, FAKE_APPLY_OUT=self.apply_out,
                   FAKE_STDIN_LOG=os.path.join(self.tmp.name, "stdin.log"), FAKE_REDIS_STATE=self.redis_state, OPS_WAIT_SLEEP="0", OPS_WAIT_TRIES="2", OPS_WAIT_TRIES_API="2", HOME=self.tmp.name)
        env.update({k: str(v) for k, v in extra.items()})
        p = subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=60)
        return p

    def make_release(self, sha8="61c95ace", window="#!/bin/bash\n# release copy\n", common="# helper release copy\n", corrupt=False):
        """An uploaded release dir: deploy.tgz (the deploy/ dir) + SHA256SUMS, as tools/ops/release/build-release.sh writes them."""
        r = os.path.join(self.releases, sha8)
        os.makedirs(r)
        src = os.path.join(self.tmp.name, "rel-src")
        os.makedirs(os.path.join(src, "deploy", "scripts"), exist_ok=True)
        for name, text in (("clamav-window.sh", window), ("_backup-common.sh", common)):
            with open(os.path.join(src, "deploy", "scripts", name), "w") as f:
                f.write(text)
        tgz = os.path.join(r, "deploy.tgz")
        with tarfile.open(tgz, "w:gz") as t:
            t.add(os.path.join(src, "deploy"), arcname="deploy")
        with open(tgz, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        with open(os.path.join(r, "SHA256SUMS"), "w") as f:
            f.write(("0" * 64 if corrupt else digest) + "  deploy.tgz\n")
        return r

    def docker_calls(self):
        if not os.path.exists(self.log):
            return ""
        with open(self.log) as fh:
            return fh.read()

    def env_text(self):
        with open(self.envf) as fh:
            return fh.read()


class RankingRecompute(unittest.TestCase):
    def setUp(self):
        self.h = Harness(self)

    def test_dry_run_by_default_reads_only(self):
        p = self.h.run("94-ranking-recompute.sh")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("dry run only: nothing was written", p.stdout)
        self.assertIn("hold 1 distinct categories now", p.stdout)
        self.assertNotIn("apply", self.h.docker_calls().replace("ranking-recompute.js plan", ""))

    def test_output_is_status_lines_only(self):
        p = self.h.run("94-ranking-recompute.sh", {"APPLY": "yes"})
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_apply_runs_the_tool_and_reports_the_mix(self):
        p = self.h.run("94-ranking-recompute.sh", {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("ranking-recompute.js apply", self.h.docker_calls())
        self.assertIn("the first 24 of All hold 9 distinct top-level categories (before: 1)", p.stdout)

    def test_aborts_when_the_backend_is_not_healthy(self):
        p = self.h.run("94-ranking-recompute.sh", {"APPLY": "yes"}, FAKE_HEALTH="unhealthy")
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT", p.stdout)
        self.assertNotIn("ranking-recompute.js", self.h.docker_calls())

    def test_aborts_when_the_image_has_no_tool(self):
        p = self.h.run("94-ranking-recompute.sh", {"APPLY": "yes"}, FAKE_NO_RANKING_TOOL=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("deploy the release first", p.stdout)

    def test_a_failing_apply_exits_1(self):
        p = self.h.run("94-ranking-recompute.sh", {"APPLY": "yes"}, FAKE_APPLY_RC=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("FAILED (exit 1)", p.stdout)

    def test_a_failing_plan_aborts_before_any_write(self):
        p = self.h.run("94-ranking-recompute.sh", {"APPLY": "yes"}, FAKE_PLAN_RC=1)
        self.assertEqual(p.returncode, 1)
        self.assertNotIn(" apply", self.h.docker_calls().replace("compose", ""))


class UploadScanDefer(unittest.TestCase):
    TASK = "91b-upload-scan-defer.sh"

    def setUp(self):
        self.h = Harness(self)

    def cron_files(self):
        return os.listdir(self.h.cron)

    def test_dry_run_changes_nothing_and_prints_no_value(self):
        p = self.h.run(self.TASK)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)
        self.assertEqual(self.cron_files(), [])
        self.assertNotIn("compose", self.h.docker_calls())
        self.assertNotIn(SECRET, p.stdout + p.stderr)
        self.assertIn("UPLOAD_SCAN=set", p.stdout)                 # "set": the value (required) is not printed

    def test_apply_sets_the_names_backs_up_installs_the_cron_and_recreates_only_the_backend(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        env = self.h.env_text()
        self.assertIn("UPLOAD_SCAN=defer\n", env)
        self.assertIn("CLAMAV_ON_DEMAND=1\n", env)
        self.assertNotIn("UPLOAD_SCAN=required", env)
        self.assertIn("JWT_SECRET=" + SECRET, env)                 # every other line untouched
        self.assertEqual(stat.S_IMODE(os.stat(self.h.envf).st_mode), 0o600)
        saved = [f for f in os.listdir(self.h.backups) if f.startswith("env-pre-upload-scan-")]
        self.assertEqual(len(saved), 1)
        with open(os.path.join(self.h.backups, saved[0])) as f:
            self.assertEqual(f.read(), ENV_BEFORE)
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(self.h.backups, saved[0])).st_mode), 0o600)
        self.assertEqual(self.cron_files(), ["nabd-clamav-window"])
        with open(os.path.join(self.h.cron, "nabd-clamav-window")) as f:
            self.assertIn("clamav-window.sh", f.read())
        compose = [l for l in self.h.docker_calls().splitlines() if l.startswith("compose")]
        self.assertEqual(len(compose), 1)
        self.assertRegex(compose[0], r"--no-deps .*backend$")
        self.assertNotIn(SECRET, p.stdout + p.stderr)
        self.assertNotIn("UPLOAD_SCAN=required", p.stdout)
        self.assertIn("/config uploads_enabled=true", p.stdout)

    def test_output_is_status_lines_only(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_second_apply_is_idempotent(self):
        self.h.run(self.TASK, {"APPLY": "yes"})
        once = self.h.env_text()
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(self.h.env_text(), once)
        self.assertEqual(self.cron_files(), ["nabd-clamav-window"])
        self.assertIn("names changed: none", p.stdout)
        self.assertIn("window cron already installed", p.stdout)

    def test_an_existing_window_cron_elsewhere_is_not_duplicated(self):
        with open(os.path.join(self.h.cron, "nabd-backups"), "w") as f:
            f.write("*/2 * * * * root /opt/nabdah/deploy/scripts/clamav-window.sh\n")
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(self.cron_files(), ["nabd-backups"])

    def test_aborts_when_the_backend_is_not_healthy(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"}, FAKE_HEALTH="starting")
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)
        self.assertEqual(os.listdir(self.h.backups), [])

    def test_aborts_when_the_image_has_no_quarantine_worker(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"}, FAKE_NO_QUARANTINE=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("deploy the release first", p.stdout)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)

    def test_aborts_when_the_window_script_is_missing(self):
        os.remove(os.path.join(self.h.deploy, "scripts", "clamav-window.sh"))
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)

    def test_a_failed_check_rolls_everything_back(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"}, FAKE_CONFIG_BROKEN=1)
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn("rolling back", p.stdout)
        self.assertIn("rollback complete", p.stdout)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)            # the env copy is back
        self.assertEqual(self.cron_files(), [])                    # the cron file this run made is gone
        compose = [l for l in self.h.docker_calls().splitlines() if l.startswith("compose")]
        self.assertEqual(len(compose), 2)                          # recreated for the change, and again for the rollback

    def test_a_failed_recreate_rolls_back(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"}, FAKE_COMPOSE_FAIL=1)
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)
        self.assertEqual(self.cron_files(), [])

    def test_rollback_mode_restores_the_saved_env(self):
        self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertIn("UPLOAD_SCAN=defer", self.h.env_text())
        p = self.h.run(self.TASK, {"ROLLBACK": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)
        self.assertEqual(self.cron_files(), [])
        self.assertIn("rolled back", p.stdout)

    def test_rollback_without_a_saved_copy_aborts(self):
        p = self.h.run(self.TASK, {"ROLLBACK": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.h.env_text(), ENV_BEFORE)

    def script(self, name):
        with open(os.path.join(self.h.deploy, "scripts", name)) as f:
            return f.read()

    def test_dry_run_reports_that_the_window_script_would_be_installed_and_writes_nothing(self):
        self.h.make_release()
        p = self.h.run(self.TASK)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("window script: will be installed from release 61c95ace (checksums ok)", p.stdout)
        self.assertEqual(self.script("clamav-window.sh"), "#!/bin/bash\n")
        self.assertEqual(os.listdir(self.h.backups), [])

    def test_apply_installs_the_window_script_from_the_verified_release_and_saves_the_old_copy(self):
        self.h.make_release()
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("release copy", self.script("clamav-window.sh"))
        self.assertIn("helper release copy", self.script("_backup-common.sh"))
        self.assertTrue(os.access(os.path.join(self.h.deploy, "scripts", "clamav-window.sh"), os.X_OK))
        saved = [f for f in os.listdir(self.h.backups) if f.startswith("window-pre-clamav-window.sh-")]
        self.assertEqual(len(saved), 1)

    def test_a_script_missing_on_the_server_is_installed_from_the_release_and_rollback_removes_it(self):
        os.remove(os.path.join(self.h.deploy, "scripts", "clamav-window.sh"))
        self.h.make_release()
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("release copy", self.script("clamav-window.sh"))
        r = self.h.run(self.TASK, {"ROLLBACK": "yes"})
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse(os.path.exists(os.path.join(self.h.deploy, "scripts", "clamav-window.sh")))

    def test_a_release_that_fails_its_checksums_installs_nothing(self):
        os.remove(os.path.join(self.h.deploy, "scripts", "clamav-window.sh"))
        self.h.make_release(corrupt=True)
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertIn("fails its checksums", p.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.h.deploy, "scripts", "clamav-window.sh")))
        self.assertEqual(self.h.env_text(), ENV_BEFORE)

    def test_equal_copies_on_the_server_are_left_alone(self):
        self.h.make_release(window="#!/bin/bash\n", common="# helper\n")
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("already on the server and equal to release 61c95ace", p.stdout)
        self.assertEqual([f for f in os.listdir(self.h.backups) if f.startswith("window-")], [])


if __name__ == "__main__":
    unittest.main()


# a stateful fake docker for 92-recreate-datastores.sh: memory limits, health and maxmemory live in files, `compose up` applies the compose limits
STATE_DOCKER = r"""#!/bin/bash
echo "$@" >> "$FAKE_LOG"
S="$FAKE_STATE"
lim() { cat "$S/mem.$1" 2>/dev/null || echo 0; }
case "$1" in
  inspect)
    [ "$2" = "-f" ] || exit 0   # `docker inspect nabdah-worker`: exists
    c="${4#nabdah-}"
    case "$3" in
      *HostConfig.Memory*) lim "$c";;
      *RestartCount*) echo 4;;
      *OomScoreAdj*) echo 0;;
      *StartedAt*) echo 2026-10-30T00:00:00Z;;
      *State.Health*) if [ "$c" = "$FAKE_UNHEALTHY" ] && [ -f "$S/up.$c" ]; then echo unhealthy; else echo healthy; fi;;
    esac; exit 0;;
  stats) echo "10MiB";;
  compose)
    if [ -n "$FAKE_COMPOSE_FAIL" ] && echo "$*" | grep -q "force-recreate $FAKE_COMPOSE_FAIL\$"; then
      echo "$*" | grep -q -- "-f /tmp/tmp\\." || exit 1
    fi
    last="${@: -1}"
    case "$*" in *" up "*) touch "$S/up.$last"
      if echo "$*" | grep -q -- "-f /tmp/tmp\\."; then echo 0 > "$S/mem.$last"; echo rolledback >> "$S/events"; else echo 536870912 > "$S/mem.$last"; echo "recreate $last" >> "$S/events"; fi;;
    esac
    case "$*" in *" config -q"*) [ -n "$FAKE_CONFIG_BAD" ] && exit 1;; esac
    case "$*" in *" config"*) [ "$last" = config ] && printf 'services:\n  mongodb:\n    mem_limit: "1258291200"\n';; esac
    exit 0;;
  cp) [ -n "$FAKE_CP_RC" ] && { echo "Error response from daemon: no space left on device" >&2; exit "$FAKE_CP_RC"; }
      python3 -c "import gzip,os,sys; open(sys.argv[1],'wb').write(gzip.compress(os.urandom(2*1024*1024), 0))" "$3"; exit 0;;
  exec)
    shift
    [ "$1" = -i ] && shift
    c="$1"; shift
    case "$*" in
      *mongodump*) [ "${FAKE_DUMP_RC:-0}" != 0 ] && echo "Failed: cannot allocate memory" >&2; exit "${FAKE_DUMP_RC:-0}";;
      *"df -Pm"*) printf 'Filesystem 1M-blocks Used Available Use%% Mounted\nx 10000 1000 %s 10%% /tmp\n' "${FAKE_TMP_FREE:-9000}"; exit 0;;
      *"rm -f"*) exit 0;;
      *isWritablePrimary*) echo "${FAKE_PRIMARY:-true}"; exit 0;;
      *countDocuments*|*"sh -c"*"callsessions"*) echo "${FAKE_CALLS:-0}"; exit 0;;
    esac
    case "$*" in *callsessions*) echo "${FAKE_CALLS:-0}"; exit 0;; esac
    if [ "$c" = nabdah-redis ]; then cat > /dev/null; echo "${FAKE_REDIS_MAX:-335544320}"; exit 0; fi
    # mongosh through sh -c '...' sh <js>: the js is the last argument
    last="${@: -1}"
    case "$last" in *isWritablePrimary*) echo "${FAKE_PRIMARY:-true}";; *countDocuments*) echo "${FAKE_CALLS:-0}";; esac
    exit 0;;
esac
exit 0
"""
STATE_CURL = '#!/bin/bash\necho "${FAKE_API_CODE:-200}"\n'


class RecreateDatastores(unittest.TestCase):
    TASK = "92-recreate-datastores.sh"

    def setUp(self):
        self.h = Harness(self)
        self.state = os.path.join(self.h.tmp.name, "state")
        os.makedirs(self.state)
        write_exec(os.path.join(self.h.bin, "docker"), STATE_DOCKER)
        write_exec(os.path.join(self.h.bin, "curl"), STATE_CURL)
        for f in ("docker-compose.production.yml", "docker-compose.release.yml"):
            with open(os.path.join(self.h.deploy, f), "w") as fh:
                fh.write("services: {}\n")
        os.makedirs(os.path.join(self.h.deploy, "redis"))
        with open(os.path.join(self.h.deploy, "redis", "redis.conf"), "w") as f:
            f.write("maxmemory 320mb\n")
        os.makedirs(os.path.join(self.h.deploy, "scripts"), exist_ok=True)
        write_exec(os.path.join(self.h.deploy, "scripts", "memory-report.sh"), "#!/bin/bash\necho 'status: memory host total=1MB'\necho noise\n")
        with open(self.h.envf, "a") as f:
            f.write("REDIS_PASSWORD=redis-pass-5e21\n")
        with open(os.path.join(self.h.backups, "nabd_20261029.gz"), "wb") as f:
            f.write(b"x" * 1024)

    def run_task(self, settings=None, **extra):
        return self.h.run(self.TASK, settings, FAKE_STATE=self.state, NABD_DEPLOY_LOCK=os.path.join(self.h.tmp.name, "deploy.lock"),
                          OPS_MEMINFO="/proc/meminfo", **extra)

    def events(self):
        p = os.path.join(self.state, "events")
        if not os.path.exists(p):
            return []
        with open(p) as f:
            return f.read().split("\n")

    def test_dry_run_stops_and_writes_nothing(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("dry run only", p.stdout)
        self.assertIn("mongod: PRIMARY", p.stdout)
        self.assertIn("active calls (window 180 min): 0", p.stdout)
        self.assertEqual([e for e in self.events() if e], [])
        self.assertEqual(os.listdir(self.h.backups), ["nabd_20261029.gz"])
        self.assertNotIn(" up ", self.h.docker_calls())

    def test_output_is_status_lines_only(self):
        p = self.run_task({"APPLY": "yes"})
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_apply_backs_up_then_recreates_redis_then_mongodb_then_the_call_services(self):
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual([e for e in self.events() if e], ["recreate redis", "recreate mongodb", "recreate livekit", "recreate coturn"])
        self.assertTrue(any(f.startswith("pre-recreate-") for f in os.listdir(self.h.backups)))
        self.assertTrue(any(f.startswith("recreate-") and f.endswith("docker-compose.production.yml") for f in os.listdir(self.h.backups)))
        for line in ("backup ok", "redis recreated", "mongodb recreated", "mongodb_downtime_seconds=", "livekit recreated", "coturn recreated", "status: memory host total=1MB"):
            self.assertIn(line, p.stdout)
        self.assertNotIn("noise", p.stdout)
        calls = self.h.docker_calls()
        self.assertEqual(len([l for l in calls.splitlines() if "force-recreate" in l]), 4)
        self.assertTrue(all("--no-deps" in l for l in calls.splitlines() if "force-recreate" in l))   # nothing else is touched
        self.assertNotIn("redis-pass-5e21", p.stdout + p.stderr + calls)                              # the password never an argument or output

    def test_an_active_call_skips_livekit_and_coturn(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_CALLS=2)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual([e for e in self.events() if e], ["recreate redis", "recreate mongodb"])
        self.assertIn("livekit and coturn SKIPPED: active calls=2", p.stdout)

    def test_no_backup_no_recreate(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_DUMP_RC=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT backup too small", p.stdout)
        self.assertIn("backup steps: mongodump rc=1 err=Failed ; docker cp rc=skipped err=none ; stat rc=1 size_bytes=0", p.stdout)
        self.assertEqual([e for e in self.events() if e], [])

    def test_a_failing_docker_cp_aborts_with_every_step_result_and_stops_nothing(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_CP_RC=1)
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn("backup steps: mongodump rc=0 err=none ; docker cp rc=1 err=Error ; stat rc=1 size_bytes=0", p.stdout)
        self.assertIn("ABORT backup too small (0 bytes", p.stdout)
        self.assertNotIn("no space left", p.stdout)                          # only the first word of an error is printed
        self.assertEqual([e for e in self.events() if e], [])

    def test_the_room_for_the_backup_is_printed(self):
        p = self.run_task({"APPLY": "yes"})
        self.assertRegex(p.stdout, r"backup room: host_free_mb=\d+ container_tmp_free_mb=9000 MemAvailable=\d+MB")

    def test_too_little_room_aborts_before_the_dump(self):
        p = self.run_task({"APPLY": "yes"}, MIN_FREE_MB=999999999)
        self.assertEqual(p.returncode, 1)
        self.assertIn("MB free where the backup goes", p.stdout)
        self.assertNotIn("mongodump", self.h.docker_calls())
        self.assertEqual([e for e in self.events() if e], [])

    def test_a_deploy_lock_aborts_before_anything(self):
        open(os.path.join(self.h.tmp.name, "deploy.lock"), "w").close()
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertIn("deploy lock exists", p.stdout)
        self.assertEqual([e for e in self.events() if e], [])

    def test_mongod_not_primary_aborts_the_dry_run_too(self):
        p = self.run_task(FAKE_PRIMARY="false")
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT mongod is not PRIMARY", p.stdout)

    def test_a_failed_mongodb_recreate_puts_it_back_without_limits_and_exits_1(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_COMPOSE_FAIL="mongodb")
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn("FAILED at 'recreate' on mongodb", p.stdout)
        self.assertIn("rollback complete: mongodb is healthy again, without the memory limits", p.stdout)
        self.assertEqual([e for e in self.events() if e][-1], "rolledback")
        self.assertNotIn("recreate livekit", self.events())

    def test_redis_that_does_not_hold_the_conf_maxmemory_is_a_failure(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_REDIS_MAX=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("FAILED at 'maxmemory is not the one in redis.conf' on redis", p.stdout)
        self.assertNotIn("recreate mongodb", self.events())

HOST_FILES = {
    "mongo/mongod.conf": "storage:\n  wiredTiger:\n    engineConfig:\n      cacheSizeGB: 0.5\n",
    "redis/redis.conf": "port 6379\nmaxmemory 320mb\nmaxmemory-policy volatile-lru\n",
    "scripts/oplog-backup.sh": "#!/bin/bash\n# new oplog backup\n",
    "scripts/_oplog-mongo-wait.sh": "# new wait helper\n",
    "scripts/memory-report.sh": "#!/bin/bash\necho 'status: memory host total=1MB'\necho 'not a status line'\n",
}
OLD_REDIS = "port 6379\nmaxmemory 256mb\n"


class HostFiles(unittest.TestCase):
    TASK = "91c-host-files.sh"

    def setUp(self):
        self.h = Harness(self)
        with open(self.h.envf, "a") as f:
            f.write("REDIS_PASSWORD=redis-pass-77c1\n")
        for rel, text in (("mongo/mongod.conf", "old mongod\n"), ("redis/redis.conf", OLD_REDIS), ("scripts/oplog-backup.sh", "#!/bin/bash\n# old\n")):
            self.put(rel, text)

    def put(self, rel, text):
        path = os.path.join(self.h.deploy, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(text)

    def read(self, rel):
        with open(os.path.join(self.h.deploy, rel)) as f:
            return f.read()

    def release(self, corrupt=False, drop=None):
        r = os.path.join(self.h.releases, "aa11bb22")
        os.makedirs(r)
        src = os.path.join(self.h.tmp.name, "hf-src")
        for rel, text in HOST_FILES.items():
            if rel == drop:
                continue
            os.makedirs(os.path.dirname(os.path.join(src, "deploy", rel)), exist_ok=True)
            with open(os.path.join(src, "deploy", rel), "w") as f:
                f.write(text)
        tgz = os.path.join(r, "deploy.tgz")
        with tarfile.open(tgz, "w:gz") as t:
            t.add(os.path.join(src, "deploy"), arcname="deploy")
        with open(tgz, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        with open(os.path.join(r, "SHA256SUMS"), "w") as f:
            f.write(("0" * 64 if corrupt else digest) + "  deploy.tgz\n")

    def redis_live(self):
        with open(self.h.redis_state) as f:
            return int(f.read().strip())

    def test_dry_run_names_the_differing_files_and_writes_nothing(self):
        self.release()
        p = self.h.run(self.TASK)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("redis/redis.conf DIFFERS", p.stdout)
        self.assertIn("scripts/memory-report.sh MISSING", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(self.read("redis/redis.conf"), OLD_REDIS)
        self.assertEqual(os.listdir(self.h.backups), [])
        self.assertEqual(self.redis_live(), 512 * 1048576)
        self.assertNotIn("old mongod", p.stdout)                   # names and sha only, never content
        self.assertNotIn("redis-pass-77c1", p.stdout + p.stderr + self.h.docker_calls())

    def test_output_is_status_lines_only(self):
        self.release()
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_apply_installs_saves_copies_reloads_redis_and_leaves_mongo_alone(self):
        self.release()
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        for rel, text in HOST_FILES.items():
            self.assertEqual(self.read(rel), text)
        self.assertTrue(os.access(os.path.join(self.h.deploy, "scripts", "memory-report.sh"), os.X_OK))
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(self.h.deploy, "redis", "redis.conf")).st_mode), 0o644)
        saved = sorted(os.listdir(self.h.backups))
        self.assertEqual(len([f for f in saved if f.startswith("hostfiles-pre-")]), 3)
        self.assertEqual(len([f for f in saved if f.startswith("hostfiles-new-")]), 2)
        self.assertEqual(self.redis_live(), 320 * 1048576)         # CONFIG SET, live
        calls = self.h.docker_calls()
        self.assertNotIn("compose", calls)
        self.assertNotIn("restart", calls)
        self.assertNotIn("nabdah-mongodb", calls)
        self.assertIn("mongod.conf written to disk only", p.stdout)
        self.assertIn("status: memory host total=1MB", p.stdout)   # the report's status lines are printed
        self.assertNotIn("not a status line", p.stdout)
        self.assertNotIn("redis-pass-77c1", p.stdout + p.stderr + calls)
        with open(os.path.join(self.h.tmp.name, "stdin.log")) as f:
            self.assertIn("redis-pass-77c1", f.read())             # it went in on stdin

    def test_second_apply_changes_nothing(self):
        self.release()
        self.h.run(self.TASK, {"APPLY": "yes"})
        n = len(os.listdir(self.h.backups))
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("nothing differs", p.stdout)
        self.assertIn("redis maxmemory already 320mb", p.stdout)
        self.assertEqual(len(os.listdir(self.h.backups)), n)

    def test_a_release_that_fails_its_checksums_installs_nothing(self):
        self.release(corrupt=True)
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.read("redis/redis.conf"), OLD_REDIS)
        self.assertEqual(os.listdir(self.h.backups), [])

    def test_a_release_without_one_of_the_files_aborts(self):
        self.release(drop="scripts/memory-report.sh")
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.read("redis/redis.conf"), OLD_REDIS)

    def test_no_release_aborts(self):
        p = self.h.run(self.TASK, {"APPLY": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertIn("no uploaded release", p.stdout)

    def test_a_failed_redis_set_puts_the_files_back(self):
        self.release()
        p = self.h.run(self.TASK, {"APPLY": "yes"}, FAKE_REDIS_SET_FAIL=1)
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn("putting the copies back", p.stdout)
        self.assertEqual(self.read("redis/redis.conf"), OLD_REDIS)
        self.assertEqual(self.read("mongo/mongod.conf"), "old mongod\n")
        self.assertFalse(os.path.exists(os.path.join(self.h.deploy, "scripts", "memory-report.sh")))

    def test_rollback_restores_the_copies_removes_new_files_and_resets_redis(self):
        self.release()
        self.h.run(self.TASK, {"APPLY": "yes"})
        p = self.h.run(self.TASK, {"ROLLBACK": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(self.read("redis/redis.conf"), OLD_REDIS)
        self.assertEqual(self.read("mongo/mongod.conf"), "old mongod\n")
        self.assertFalse(os.path.exists(os.path.join(self.h.deploy, "scripts", "memory-report.sh")))
        self.assertEqual(self.redis_live(), 256 * 1048576)

    def test_rollback_without_copies_aborts(self):
        p = self.h.run(self.TASK, {"ROLLBACK": "yes"})
        self.assertEqual(p.returncode, 1)

CAT_PLAN = '{"cmd":"plan","plan_sha":"%s","inputs":{},"steps":{"catalogue_completion":12},"total_changes":12}\n' % ("ab" * 32)
CAT_APPLY = ('{"cmd":"apply","step":"backup","file_sha256":"%s","bytes":10,"changes":12}\n' % ("cd" * 32)
             + '{"cmd":"apply","step":"apply","applied":12,"remaining_changes":0,"counts_ok":true,"ok":true}\n')


class CatalogueApplyOnly(unittest.TestCase):
    TASK = "90-catalogue-apply.sh"

    def setUp(self):
        self.h = Harness(self)
        for p, t in ((self.h.plan_out, CAT_PLAN), (self.h.apply_out, CAT_APPLY)):
            with open(p, "w") as f:
                f.write(t)
        with open(self.h.envf, "a") as f:
            f.write("MONGO_ROOT_USER=root\nMONGO_ROOT_PASSWORD=mongo-pass-31d9\nDB_NAME=nabd_test\n")
        self.cat = os.path.join(self.h.tmp.name, "catalogue")
        os.makedirs(self.cat)
        with open(os.path.join(self.cat, "districts.json"), "w") as f:
            f.write("{}")

    def run_task(self, settings=None, **extra):
        return self.h.run(self.TASK, settings, OPS_CATALOGUE_DIR=self.cat, **extra)

    def test_completion_plans_only_that_step_in_the_worker_by_default(self):
        p = self.run_task({"COMPLETION": "packaged"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.h.docker_calls()
        self.assertIn("exec nabdah-worker node dist/scripts/catalogue-apply.js plan --only=catalogue_completion --catalogue-completion=packaged", calls)
        self.assertNotIn("--districts", calls)                     # the other inputs are not used in this mode
        self.assertNotIn("nabdah-backend", calls)
        self.assertIn("dry run only", p.stdout)

    def test_prune_plans_only_that_step_and_never_together_with_the_completion(self):
        p = self.run_task({"PRUNE": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.h.docker_calls()
        self.assertIn("catalogue-apply.js plan --only=catalogue_prune", calls)
        self.assertNotIn("--districts", calls)
        both = self.run_task({"PRUNE": "yes", "COMPLETION": "packaged"})
        self.assertEqual(both.returncode, 1)
        self.assertIn("separate runs", both.stdout)

    def test_without_completion_the_full_plan_keeps_its_inputs(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertNotIn("--only", self.h.docker_calls())
        self.assertIn("--districts=/tmp/cat-districts.json", self.h.docker_calls())

    def test_one_off_runs_in_a_limited_container_not_in_the_worker(self):
        p = self.run_task({"COMPLETION": "packaged", "ONE_OFF": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.h.docker_calls()
        run = [l for l in calls.splitlines() if l.startswith("run ")]
        self.assertEqual(len(run), 1, calls)
        self.assertIn("--rm", run[0])
        self.assertIn("--memory 900m --memory-swap 900m --oom-score-adj 1000", run[0])
        self.assertIn("--only=catalogue_completion", run[0])
        self.assertNotIn("node dist/scripts/catalogue-apply.js plan", "\n".join(l for l in calls.splitlines() if l.startswith("exec ")))
        self.assertNotIn("mongo-pass-31d9", p.stdout + p.stderr + calls)   # the password is never an argument or output
        self.assertIn("one-off container", p.stdout)

    def test_one_off_apply_writes_the_backup_into_the_backup_dir_mount(self):
        sha = "ab" * 32
        open(os.path.join(self.h.backups, "catalogue-x.json.gz"), "w").close()
        p = self.run_task({"COMPLETION": "packaged", "ONE_OFF": "yes", "EXPECT_PLAN_SHA": sha})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        run = [l for l in self.h.docker_calls().splitlines() if l.startswith("run ") and " apply " in l]
        self.assertEqual(len(run), 1)
        self.assertRegex(run[0], r"--backup=/backup/catalogue-\d{8}T\d{6}Z\.json\.gz")
        self.assertIn("applied and verified", p.stdout)

    def test_output_is_status_lines_only(self):
        p = self.run_task({"COMPLETION": "packaged", "ONE_OFF": "yes"})
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)
