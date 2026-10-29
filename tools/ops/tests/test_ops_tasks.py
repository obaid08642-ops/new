"""tools/ops/tasks/94-ranking-recompute.sh and 91b-upload-scan-defer.sh against fake docker, sudo and curl (no server, no secrets)."""
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
  compose) [ -n "$FAKE_COMPOSE_FAIL" ] && exit 1; exit 0;;
  exec)
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
                   OPS_WAIT_SLEEP="0", OPS_WAIT_TRIES="2", OPS_WAIT_TRIES_API="2", HOME=self.tmp.name)
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
