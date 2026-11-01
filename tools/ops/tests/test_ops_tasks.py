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
            src = re.sub(rf'^{k}="[^"]*"$', f'{k}="{v}"', src, count=1, flags=re.M)   # empty, or a default the reviewer overrides
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
      *IPAddress*) echo 172.20.0.5;;
      *Config.Image*) echo mongo:7.0;;
      *NetworkSettings.Networks*) echo "nabd_internal ";;
      *HostConfig.Memory*) lim "$c";;
      *RestartCount*) echo 4;;
      *OomScoreAdj*) echo 0;;
      *StartedAt*) echo 2026-10-30T00:00:00Z;;
      *State.Health*) if [ "$c" = "$FAKE_UNHEALTHY" ] && [ -f "$S/up.$c" ]; then echo unhealthy; else echo healthy; fi;;
    esac; exit 0;;
  stats) echo "10MiB";;
  logs) echo "${FAKE_LK_LOG:-starting LiveKit nodeIP=198.51.100.50 candidates}"; exit 0;;
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
  run)
    case "$*" in *mongorestore*)
      cfg=$(echo "$*" | sed -n 's/.*-v \([^ ]*\):\/cfg\/mongorestore.yml:ro.*/\1/p')
      [ -n "$cfg" ] && { cat "$cfg" > "$S/cfg.restore.seen"; }
      cat > /dev/null
      [ -n "$FAKE_LIST_EMPTY" ] || printf 'preparing collections to restore from\nfound collection `nabd_nestjs.users` bson to restore to `nabd_nestjs.users`\nfound collection `nabd_nestjs.patients` bson to restore to `nabd_nestjs.patients`\ndry run completed\n'
      exit 0;;
    esac
    case "$*" in *mongodump*)
      cfg=$(echo "$*" | sed -n 's/.*-v \([^ ]*\):\/cfg\/mongodump.yml:ro.*/\1/p')
      [ -n "$cfg" ] && { cat "$cfg" > "$S/cfg.seen"; stat -c %a "$cfg" > "$S/cfg.mode"; }
      [ "${FAKE_DUMP_RC:-0}" != 0 ] && { echo "Failed: cannot allocate memory" >&2; exit "${FAKE_DUMP_RC:-0}"; }
      python3 -c "import gzip,os,sys; sys.stdout.buffer.write(gzip.compress(os.urandom(2*1024*1024), 0))"; exit 0;;
    esac; exit 0;;
  cp) [ -n "$FAKE_CP_RC" ] && { echo "Error response from daemon: no space left on device" >&2; exit "$FAKE_CP_RC"; }
      python3 -c "import gzip,os,sys; open(sys.argv[1],'wb').write(gzip.compress(os.urandom(2*1024*1024), 0))" "$3"; exit 0;;
  exec)
    shift
    [ "$1" = -i ] && shift
    c="$1"; shift
    case "$*" in
      *printenv*USERNAME*) echo root; exit 0;;
      *printenv*PASSWORD*) echo "mongo-pass-31d9"; exit 0;;
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

    def test_only_mongodb_recreates_nothing_else(self):
        p = self.run_task({"APPLY": "yes", "ONLY": "mongodb"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual([e for e in self.events() if e], ["recreate mongodb"])
        self.assertIn("ONLY=mongodb: redis is left alone", p.stdout)
        self.assertIn("ONLY=mongodb: livekit and coturn are left alone", p.stdout)
        self.assertEqual(len([l for l in self.h.docker_calls().splitlines() if "force-recreate" in l]), 1)
        self.assertIn("backup ok", p.stdout)                                    # the same backup first

    def test_an_active_call_skips_livekit_and_coturn(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_CALLS=2)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual([e for e in self.events() if e], ["recreate redis", "recreate mongodb"])
        self.assertIn("livekit and coturn SKIPPED: active calls=2", p.stdout)

    def test_no_backup_no_recreate(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_DUMP_RC=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT backup too small", p.stdout)
        self.assertIn("attempt 2: one-off container (mongo:7.0 on nabd_internal, cap ", p.stdout)
        self.assertIn("backup steps: mongodump rc=1 ; install rc=skipped ; stat rc=1 size_bytes=0", p.stdout)
        self.assertEqual([e for e in self.events() if e], [])

    def test_the_dump_runs_in_a_one_off_container_with_its_own_cap_and_the_password_in_a_private_file(self):
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.h.docker_calls()
        run = [l for l in calls.splitlines() if l.startswith("run ") and "mongodump" in l]
        self.assertEqual(len(run), 1, calls)
        self.assertNotIn("--rm", run[0]); self.assertIn("--name nabd-dump-", run[0]); self.assertIn("--network nabd_internal", run[0]); self.assertIn("--numParallelCollections=1", run[0])
        self.assertRegex(run[0], r"--memory (\d+)m --memory-swap \1m --oom-score-adj 1000")   # 350m..600m by MemAvailable
        self.assertIn("--entrypoint mongodump mongo:7.0", run[0])
        self.assertFalse(any(l.startswith("exec nabdah-mongodb mongodump") or " mongodump " in l for l in calls.splitlines() if l.startswith("exec ")))   # never inside mongodb
        self.assertNotIn("mongo-pass-31d9", p.stdout + p.stderr + calls)             # not an argument, not output
        self.assertIn("mongo-pass-31d9", open(os.path.join(self.state, "cfg.seen")).read())   # it reached the tool through the config file
        self.assertEqual(open(os.path.join(self.state, "cfg.mode")).read().strip(), "600")

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
    "scripts/clamav-window.sh": "#!/bin/bash\n# new window\n",
    "scripts/_backup-common.sh": "# new common\n",
    "scripts/backup.sh": "#!/bin/bash\nsource _dump-guard.sh\n",
    "scripts/_dump-guard.sh": "dump_guard() { return 0; }\n",
    "scripts/_mongodump-oneoff.sh": "mongodump_oneoff() { return 0; }\n",
    "scripts/_mongorestore-list.sh": "mongorestore_list_oneoff() { return 0; }\n",
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
        self.assertEqual(len([f for f in saved if f.startswith("hostfiles-pre-")]), 5)       # the files the fixture already has on the server and that differ from the release
        self.assertEqual(len([f for f in saved if f.startswith("hostfiles-new-")]), 6)       # the rest of the 11 files did not exist on the server
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

    def test_translations_plan_only_that_step_from_the_host_file_and_never_together_with_another_mode(self):
        with open(os.path.join(self.cat, "product-translations.json"), "w") as f:
            f.write("{}")
        p = self.run_task({"TRANSLATIONS": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.h.docker_calls()
        self.assertIn("catalogue-apply.js plan --only=product_translations --product-translations=/tmp/cat-product-translations.json", calls)
        self.assertNotIn("--districts", calls)                     # the other inputs are not used in this mode
        self.assertIn("dry run only", p.stdout)
        for other in ({"PRUNE": "yes"}, {"COMPLETION": "packaged"}):
            both = self.run_task({"TRANSLATIONS": "yes", **other})
            self.assertEqual(both.returncode, 1)
            self.assertIn("separate runs", both.stdout)

    def test_translations_without_the_plan_file_aborts_and_one_off_mounts_it(self):
        p = self.run_task({"TRANSLATIONS": "yes"})
        self.assertEqual(p.returncode, 1)
        self.assertIn("run 97-translate-content STEP=plan first", p.stdout)
        with open(os.path.join(self.cat, "product-translations.json"), "w") as f:
            f.write("{}")
        q = self.run_task({"TRANSLATIONS": "yes", "ONE_OFF": "yes"})
        self.assertEqual(q.returncode, 0, q.stdout + q.stderr)
        run = [l for l in self.h.docker_calls().splitlines() if l.startswith("run ")]
        self.assertEqual(len(run), 1)
        self.assertIn("--only=product_translations --product-translations=/in/product-translations.json", run[0])
        self.assertIn("--memory 700m", run[0])

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
        self.assertIn("--memory 700m --memory-swap 700m --oom-score-adj 1000", run[0])
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

    def test_the_task_runs_detached_and_shows_progress_lines_live_without_repeating_them_in_the_summary(self):
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "90-catalogue-apply.sh")) as f:
            self.assertEqual(f.read().splitlines()[1], "# ops-detach: runs detached on the server (see server-inspect.yml); the workflow polls its log.")
        with open(self.h.apply_out, "w") as f:
            f.write('{"cmd":"apply","step":"backup","file_sha256":"%s","bytes":10,"changes":12}\n' % ("cd" * 32))
            f.write("progress apply medicines 2000/19984 modified=2000 retried_batches=0\n")
            f.write("progress apply medicines 19984/19984 modified=19984 retried_batches=1\n")
            f.write('{"cmd":"apply","step":"apply","applied":12,"remaining_changes":0,"counts_ok":true,"ok":true}\n')
        open(os.path.join(self.h.backups, "catalogue-x.json.gz"), "w").close()
        p = self.run_task({"COMPLETION": "packaged", "ONE_OFF": "yes", "EXPECT_PLAN_SHA": "ab" * 32})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        live = [l for l in p.stderr.splitlines() if "progress apply" in l]
        self.assertEqual(len(live), 2, p.stderr)                      # each line once, as it came
        self.assertTrue(all(l.startswith("status: catalogue-apply: progress apply medicines ") for l in live))
        self.assertNotIn("progress apply", p.stdout)                  # the summary does not repeat them
        self.assertIn("applied and verified", p.stdout)

    def test_output_is_status_lines_only(self):
        p = self.run_task({"COMPLETION": "packaged", "ONE_OFF": "yes"})
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)


class MongoRecreate(unittest.TestCase):
    TASK = "94-mongo-recreate.sh"

    def setUp(self):
        self.h = Harness(self)
        self.state = os.path.join(self.h.tmp.name, "state")
        os.makedirs(self.state)
        write_exec(os.path.join(self.h.bin, "docker"), STATE_DOCKER)
        write_exec(os.path.join(self.h.bin, "curl"), STATE_CURL)
        for f in ("docker-compose.production.yml", "docker-compose.release.yml"):
            with open(os.path.join(self.h.deploy, f), "w") as fh:
                fh.write("services: {}\n")
        with open(os.path.join(self.h.backups, "nabd_20261029.gz"), "wb") as f:
            f.write(b"x" * 1024)

    def run_task(self, settings=None, **extra):
        return self.h.run(self.TASK, settings, FAKE_STATE=self.state, NABD_DEPLOY_LOCK=os.path.join(self.h.tmp.name, "deploy.lock"), OPS_MEMINFO="/proc/meminfo", **extra)

    def ups(self):
        return [l for l in self.h.docker_calls().splitlines() if " up " in l]

    def test_dry_run_reads_only(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("restarts=4", p.stdout); self.assertIn("oom_killed=", p.stdout); self.assertIn("limit now=", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(self.ups(), []); self.assertNotIn("run --rm", self.h.docker_calls())
        self.assertEqual(sorted(os.listdir(self.h.backups)), ["nabd_20261029.gz"])

    def test_apply_backs_up_first_then_recreates_only_mongodb_and_never_touches_the_volume(self):
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        calls = self.h.docker_calls().splitlines()
        dump_at = next(i for i, l in enumerate(calls) if l.startswith("run ") and "mongodump" in l)
        list_at = next(i for i, l in enumerate(calls) if l.startswith("run ") and "mongorestore" in l)
        up_at = next(i for i, l in enumerate(calls) if " up " in l)
        self.assertTrue(dump_at < list_at < up_at, calls)                                  # backup, listing, and only then the recreate
        self.assertEqual(len(self.ups()), 1); self.assertTrue(self.ups()[0].endswith("--no-deps --force-recreate mongodb"), self.ups())
        for forbidden in (" down", "volume", " -v ", "rm -f"):
            self.assertNotIn(forbidden, " ".join(l for l in calls if " up " in l or l.startswith("compose")))
        kept = [n for n in os.listdir(self.h.backups) if n.startswith("pre-mongo-recreate-")]
        self.assertEqual(len(kept), 1)
        self.assertEqual(oct(os.stat(os.path.join(self.h.backups, kept[0])).st_mode & 0o777), "0o600")
        self.assertTrue(any(n.startswith("mongo-recreate-") and n.endswith("docker-compose.production.yml") for n in os.listdir(self.h.backups)))
        self.assertIn("archive lists 2 namespace(s)", p.stdout); self.assertIn("mongodb_downtime_seconds=", p.stdout)
        self.assertNotIn("mongo-pass-31d9", p.stdout + p.stderr + self.h.docker_calls())   # never an argument or output

    def test_a_failed_dump_or_an_empty_listing_stops_before_the_recreate(self):
        a = self.run_task({"APPLY": "yes"}, FAKE_DUMP_RC=1)
        self.assertEqual(a.returncode, 1); self.assertIn("ABORT the backup is not usable", a.stdout)
        self.assertEqual(self.ups(), [])
        b = self.run_task({"APPLY": "yes"}, FAKE_LIST_EMPTY=1)
        self.assertEqual(b.returncode, 1); self.assertIn("archive listing=failed", b.stdout)
        self.assertEqual(self.ups(), [])
        self.assertFalse([n for n in os.listdir(self.h.backups) if n.startswith("pre-mongo-recreate-")])   # no unusable backup is kept

    def test_a_deploy_lock_and_too_little_room_stop_everything(self):
        open(os.path.join(self.h.tmp.name, "deploy.lock"), "w").close()
        self.assertEqual(self.run_task({"APPLY": "yes"}).returncode, 1)
        os.remove(os.path.join(self.h.tmp.name, "deploy.lock"))
        q = self.run_task({"APPLY": "yes"}, MIN_FREE_MB=999999999)
        self.assertEqual(q.returncode, 1); self.assertIn("MB free where the backup goes", q.stdout)
        self.assertEqual(self.ups(), [])

    def test_a_recreate_that_does_not_come_back_prints_the_rollback(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_UNHEALTHY="mongodb", OPS_WAIT_TRIES=2)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ROLLBACK: put back", p.stdout); self.assertIn("data volume is untouched", p.stdout)

    def test_the_copies_of_the_two_one_off_functions_equal_the_libraries(self):
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "deploy", "scripts")
        task = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", self.TASK)).read()
        for lib, marker in (("_mongodump-oneoff.sh", "mongodump_oneoff() {"), ("_mongorestore-list.sh", "mongorestore_list_oneoff() {")):
            text = open(os.path.join(root, lib)).read()
            self.assertIn(text[text.index(marker):].rstrip("\n"), task, lib)


class MongodumpCheck(unittest.TestCase):
    TASK = "96-mongodump-check.sh"

    def setUp(self):
        self.h = Harness(self)
        self.state = os.path.join(self.h.tmp.name, "state")
        os.makedirs(self.state)
        write_exec(os.path.join(self.h.bin, "docker"), STATE_DOCKER)
        for name, size in (("nabd_20261029.gz", 1024), ("pre-deploy-d8a6c703-x.gz", 0)):
            with open(os.path.join(self.h.backups, name), "wb") as f:
                f.write(b"x" * size)

    def run_task(self, settings=None, **extra):
        return self.h.run(self.TASK, settings, FAKE_STATE=self.state, **extra)

    def test_dry_run_diagnoses_and_runs_no_dump(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("container nabdah-mongodb: state=", p.stdout)
        self.assertIn("last pre-deploy-*.gz: pre-deploy-d8a6c703-x.gz=0", p.stdout)     # the symptom is visible
        self.assertIn("one-off tool would use: image=mongo:7.0 network=nabd_internal", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertNotIn("run --rm", self.h.docker_calls())

    def test_apply_takes_one_test_dump_in_the_one_off_container_and_deletes_it(self):
        p = self.run_task({"APPLY": "yes"}, TMPDIR=self.h.tmp.name)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("OK: the one-off dump works", p.stdout)
        self.assertEqual(len([l for l in self.h.docker_calls().splitlines() if l.startswith("run ") and "mongodump" in l]), 1)
        self.assertNotIn("mongo-pass", p.stdout + p.stderr + self.h.docker_calls())
        self.assertEqual(sorted(os.listdir(self.h.backups)), ["nabd_20261029.gz", "pre-deploy-d8a6c703-x.gz"])   # nothing written to the backup dir

    def test_a_failing_dump_fails_the_task(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_DUMP_RC=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("FAIL: the one-off dump did not produce a valid archive", p.stdout)

    def test_output_is_status_lines_only(self):
        for line in self.run_task().stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)


LK_BEFORE = """port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  port_range_start: 50000
  port_range_end: 50100
  node_ip: 2001:41d0:701:1100::cbb3
  use_external_ip: true
keys:
  nabd_realkey: realsecretvalue-9c7e
turn:
  enabled: false
"""
TC_BEFORE = "listening-port=3478\nrealm=nabd.plus\nuse-auth-secret\nstatic-auth-secret=turn-secret-4a1b\nexternal-ip=2001:41d0:701:1100::cbb3\nmin-port=40000\n"


class DockerRunStdin(unittest.TestCase):
    """Run 60: a `docker run -i` inside a task fed by `ssh 'bash -s' < file` reads the REST of the script from stdin and ends it silently
    with exit 0. A task that can run non-detached must not use `docker run -i` without an explicit stdin redirect."""

    def test_no_bare_docker_run_i(self):
        bad = []
        for d in (TASKS, os.path.join(TASKS, "..", "..", "..", "deploy", "scripts")):
            for name in sorted(os.listdir(d)):
                if not name.endswith(".sh"):
                    continue
                path = os.path.join(d, name)
                text = open(path, encoding="utf-8").read()
                if "ops-detach" in text.splitlines()[1:2].__str__():
                    continue
                # join backslash continuations so a redirect on the next line counts
                joined = re.sub(r"\\\n", " ", text)
                for n, line in enumerate(joined.splitlines(), 1):
                    if re.search(r"\brun\b[^|;#]*\s-[a-z]*i[a-z]*\b", line) and "docker" in line.lower() or re.search(r"\$dkr run\b[^|;#]*\s-[a-z]*i\b", line):
                        if not re.search(r"<\s*(/dev/null|\"?\$)", line):
                            bad.append(f"{name}:{n}")
        self.assertEqual(bad, [], "docker run -i without a stdin redirect (use `< /dev/null`, or drop -i)")

    def test_94_is_marked_detached(self):
        with open(os.path.join(TASKS, "94-mongo-recreate.sh"), encoding="utf-8") as f:
            self.assertEqual(f.read().splitlines()[1], "# ops-detach")


class CallsNetwork(unittest.TestCase):
    TASK = "93-calls-network.sh"

    def setUp(self):
        self.h = Harness(self)
        self.state = os.path.join(self.h.tmp.name, "state")
        os.makedirs(self.state)
        write_exec(os.path.join(self.h.bin, "docker"), STATE_DOCKER)
        write_exec(os.path.join(self.h.bin, "ufw"), "#!/bin/bash\necho \"ufw $*\" >> \"$FAKE_LOG\"\nif [ \"$1\" = status ]; then echo '22/tcp ALLOW Anywhere'; fi\nexit \"${FAKE_UFW_RC:-0}\"\n")
        for f in ("docker-compose.production.yml",):
            with open(os.path.join(self.h.deploy, f), "w") as fh:
                fh.write("services: {}\n")
        os.makedirs(os.path.join(self.h.deploy, "livekit"))
        os.makedirs(os.path.join(self.h.deploy, "coturn"))
        self.lk = os.path.join(self.h.deploy, "livekit", "livekit.yaml")
        self.tc = os.path.join(self.h.deploy, "coturn", "turnserver.rendered.conf")
        with open(self.lk, "w") as f:
            f.write(LK_BEFORE)
        with open(self.tc, "w") as f:
            f.write(TC_BEFORE)

    def run_task(self, settings=None, **extra):
        kw = dict(FAKE_STATE=self.state, OPS_PUBLIC_IPV4="198.51.100.50", OPS_PUBLIC_IPV6="2001:41d0:701:1100::cbb3", FAKE_LK_LOG="starting LiveKit nodeIP=198.51.100.50")
        kw.update(extra)
        return self.h.run(self.TASK, settings, **kw)

    def read(self, path):
        with open(path) as f:
            return f.read()

    def test_dry_run_prints_what_is_wrong_and_writes_nothing(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("node_ip: 2001:41d0:701:1100::cbb3", p.stdout)
        self.assertIn("to change: livekit.node_ip livekit.port_range coturn.external-ip", p.stdout)
        self.assertIn("dry run only", p.stdout)
        self.assertEqual(self.read(self.lk), LK_BEFORE)
        self.assertEqual(self.read(self.tc), TC_BEFORE)
        self.assertNotIn("realsecretvalue-9c7e", p.stdout + p.stderr)
        self.assertNotIn("turn-secret-4a1b", p.stdout + p.stderr)
        self.assertNotIn("force-recreate", self.h.docker_calls())

    def test_apply_edits_only_the_address_lines_and_keeps_the_keys(self):
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        lk = self.read(self.lk)
        self.assertNotIn("node_ip", lk)
        self.assertNotIn("port_range", lk)
        self.assertIn("use_external_ip: true", lk)
        self.assertIn("udp_port: 7882", lk)
        self.assertIn("nabd_realkey: realsecretvalue-9c7e", lk)                 # the keys are untouched
        self.assertIn("tcp_port: 7881", lk)
        tc = self.read(self.tc)
        self.assertEqual([l for l in tc.splitlines() if l.startswith("external-ip=")], ["external-ip=198.51.100.50", "external-ip=2001:41d0:701:1100::cbb3"])
        self.assertIn("static-auth-secret=turn-secret-4a1b", tc)                # the secret is untouched
        self.assertIn("min-port=40000", tc)
        calls = self.h.docker_calls()
        self.assertEqual(len([l for l in calls.splitlines() if "force-recreate" in l]), 2)
        self.assertIn("ufw allow 7881/tcp", calls)
        self.assertIn("ufw allow 7882/udp", calls)
        self.assertIn("livekit advertises the IPv4 (198.51.100.50)", p.stdout)
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)
        self.assertNotIn("realsecretvalue-9c7e", p.stdout + p.stderr)
        self.assertTrue(any(f.startswith("livekit.yaml.pre-calls-network.") for f in os.listdir(self.h.backups)))

    def test_second_apply_changes_nothing(self):
        self.run_task({"APPLY": "yes"})
        n = len(os.listdir(self.h.backups))
        p = self.run_task({"APPLY": "yes"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("nothing to change", p.stdout)
        self.assertEqual(len(os.listdir(self.h.backups)), n)

    def test_an_active_call_blocks_the_apply_unless_forced(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_CALLS=2)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT active calls=2", p.stdout)
        self.assertEqual(self.read(self.lk), LK_BEFORE)
        forced = self.run_task({"APPLY": "yes", "FORCE": "yes"}, FAKE_CALLS=2)
        self.assertEqual(forced.returncode, 0, forced.stdout + forced.stderr)

    def test_livekit_that_does_not_advertise_the_ipv4_is_rolled_back(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_LK_LOG="starting LiveKit nodeIP=10.0.0.5")
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn("FAILED at 'livekit does not log the IPv4'", p.stdout)
        self.assertIn("rollback complete", p.stdout)
        self.assertEqual(self.read(self.lk), LK_BEFORE)
        self.assertEqual(self.read(self.tc), TC_BEFORE)

    def test_a_failed_firewall_rule_is_rolled_back(self):
        p = self.run_task({"APPLY": "yes"}, FAKE_UFW_RC=1)
        self.assertEqual(p.returncode, 1)
        self.assertEqual(self.read(self.lk), LK_BEFORE)

    def test_no_public_ipv4_or_the_placeholder_aborts(self):
        p = self.run_task(OPS_PUBLIC_IPV4="10.1.2.3")
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT no public IPv4", p.stdout)
        with open(self.tc, "w") as f:
            f.write(TC_BEFORE.replace("2001:41d0:701:1100::cbb3", "203.0.113.1"))
        p = self.run_task()
        self.assertEqual(p.returncode, 1)
        self.assertIn("documentation placeholder", p.stdout)
