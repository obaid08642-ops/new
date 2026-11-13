"""tools/ops/tasks/96q-launch-server-checks.sh against a fake docker: read-only command shape, counts only, masked output, memory refusal,
independent steps, and (run 125) EVERY step always prints at least one status line, whatever fails."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96q-launch-server-checks.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect)
    case "$*" in
      *State.Status*) c="${@: -1}"; if [ "$c" = nabdah-nginx ]; then echo "${FAKE_NGX_STATE:-running}"; else echo "${FAKE_STATE:-running}"; fi;;
      *Config.Env*) printf 'PATH=/bin\nMONGO_URL=mongodb://user:secretpw@mongodb:27017\nTRUST_PROXY_HOPS=2\nMONGO_MAX_POOL_SIZE=%s\n' "${FAKE_POOL:-20}";;
    esac;;
  ps) printf 'nabdah-backend\nnabdah-worker\n';;
  stats) echo "${FAKE_PCT:-55.20%}";;
  logs) printf '%b' "${FAKE_LOGS-}";;
  exec)
    case "$*" in
      *"node -e"*) printf '%s\n' "$FAKE_NODE_OUT"; exit "${FAKE_RC:-0}";;
      *"nginx.conf"*) [ -n "${FAKE_CONF_FAIL:-}" ] && exit 1; printf 'set_real_ip_from 10.0.0.0/8;\nreal_ip_header X-Forwarded-For;\nproxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n';;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
NODE_OUT = "ownerless: medicalreports rows_without_patient_id=0\nownerless: payments rows_without_patient_id=4\nownerless: labbookings collection absent\nnoise line"
ENT = '1.2.3.4 - nabd.plus [13/Nov/2026:10:00:00 +0000] "GET /api/v1/providers/enterprise/branch-staff/a/b HTTP/1.1" %s 5 "-" "ua"\\n'
LOGS = (ENT % 200) * 3 + (ENT % 403) * 7 + '5.6.7.8 - nabd.plus [13/Nov/2026:10:00:01 +0000] "GET /api/v1/config HTTP/1.1" 200 9 "-" "ua"\\n' * 4 + "not an access line at all\\n"


def run(**extra):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    log = os.path.join(d, "log")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_LOG": log, "FAKE_NODE_OUT": NODE_OUT, "FAKE_LOGS": LOGS, **extra}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    with open(log) as f: calls = f.read() if os.path.exists(log) else ""
    return r.stdout + r.stderr, calls


def status_lines(out):
    return [l for l in out.splitlines() if l.startswith("status: launch-checks: ")]


def has_step_line(out, n):
    return any(re.match(r"status: launch-checks: %d[ :]" % n, l) for l in out.splitlines())


class LaunchChecks(unittest.TestCase):
    def test_prints_hops_pool_ownerless_counts_and_enterprise_requests(self):
        out, _ = run()
        self.assertIn("1 TRUST_PROXY_HOPS of nabdah-backend = 2", out)
        self.assertIn("1 nginx: set_real_ip_from lines=1, real_ip_header lines=1, proxy_add_x_forwarded_for lines=1", out)
        self.assertIn("2 MONGO_MAX_POOL_SIZE: nabdah-backend=20 nabdah-worker=20", out)
        self.assertIn("3 payments rows_without_patient_id=4", out)
        self.assertIn("3 labbookings collection absent", out)
        self.assertIn("4 /providers/enterprise/* status 2xx: 3 requests", out)
        self.assertIn("4 /providers/enterprise/* status 4xx: 7 requests", out)
        self.assertIn("finished (exit code 0", out)

    def test_the_pool_sizes_are_one_line_and_the_whole_run_is_short(self):
        out, _ = run()
        self.assertEqual(len([l for l in out.splitlines() if "MONGO_MAX_POOL_SIZE" in l]), 1)
        self.assertLess(len(status_lines(out)), 16)

    def test_the_nginx_log_is_read_with_docker_logs_never_cat_inside_the_container(self):
        _, calls = run()
        self.assertIn("logs nabdah-nginx", calls)
        self.assertNotIn("access.log", calls)

    def test_lines_that_are_not_access_lines_are_not_counted_as_a_status_class(self):
        out, _ = run()
        self.assertEqual(len([l for l in out.splitlines() if "status " in l and "/providers/enterprise" in l]), 2)

    def test_nothing_secret_is_printed_or_put_on_a_command_line(self):
        out, calls = run()
        self.assertNotIn("secretpw", out)
        self.assertNotIn("secretpw", calls)
        self.assertNotIn("noise line", out)
        self.assertNotIn("MONGO_URL=", calls)

    def test_only_reads_no_write_verbs(self):
        _, calls = run()
        for verb in ("insert", "update", "delete", "drop", "remove", "rm ", "restart", "stop", "kill", "--apply"):
            self.assertNotIn(verb, calls.lower())
        self.assertIn("--max-old-space-size=96", calls)

    def test_the_mongo_step_refuses_near_the_memory_limit_but_the_others_still_run(self):
        out, calls = run(FAKE_PCT="91.40%")
        self.assertIn("3 REFUSE: nabdah-backend is above 80%", out)
        self.assertNotIn("node -e", calls)
        self.assertIn("1 TRUST_PROXY_HOPS", out)
        self.assertIn("4 /providers/enterprise/*", out)

    def test_a_stopped_backend_skips_its_steps_and_the_rest_runs(self):
        out, calls = run(FAKE_STATE="exited")
        self.assertIn("1 SKIP: nabdah-backend is not running", out)
        self.assertIn("3 SKIP: nabdah-backend is not running", out)
        self.assertNotIn("node -e", calls)
        self.assertIn("4 /providers/enterprise/*", out)

    def test_a_failure_line_is_masked(self):
        out, _ = run(FAKE_NODE_OUT="failed: connect ECONNREFUSED mongodb://user:secretpw@mongodb:27017/?x=1", FAKE_RC="1")
        self.assertIn("3 ERROR: failed: connect ECONNREFUSED mongodb://<hidden>@mongodb:27017", out)
        self.assertNotIn("secretpw", out)

    def test_a_non_token_value_is_not_echoed(self):
        out, _ = run(FAKE_POOL="a b;rm -rf")
        self.assertNotIn("a b;rm", out)


class EveryStepAlwaysPrints(unittest.TestCase):
    """Run 125: steps 3 and 4 printed nothing in the public log. Whatever goes wrong, each step now says something."""

    def assert_all_steps(self, out):
        for n in (1, 2, 3, 4):
            self.assertTrue(has_step_line(out, n), f"step {n} printed no status line:\n{out}")
        self.assertIn("finished (exit code", out)

    def test_normal_run(self):
        self.assert_all_steps(run()[0])

    def test_the_counting_script_prints_garbage_and_fails(self):
        out, _ = run(FAKE_NODE_OUT="Error: Cannot find module 'mongodb'\n    at Module._resolveFilename", FAKE_RC="1")
        self.assert_all_steps(out)
        self.assertIn("3 ERROR: the counting script printed no result (exit code 1); first line: Error: Cannot find module 'mongodb'", out)

    def test_the_counting_script_prints_nothing_at_all(self):
        out, _ = run(FAKE_NODE_OUT="", FAKE_RC="0")
        self.assert_all_steps(out)
        self.assertIn("3 ERROR: the counting script printed no result (exit code 0)", out)

    def test_the_counting_script_times_out(self):
        out, _ = run(FAKE_NODE_OUT="", FAKE_RC="124")
        self.assert_all_steps(out)
        self.assertIn("3 TIMEOUT", out)

    def test_an_empty_nginx_log(self):
        out, _ = run(FAKE_LOGS="")
        self.assert_all_steps(out)
        self.assertIn("4 /providers/enterprise/*: 0 requests in the nginx docker log", out)

    def test_nginx_not_running(self):
        out, _ = run(FAKE_NGX_STATE="exited")
        self.assert_all_steps(out)
        self.assertIn("4 SKIP: nabdah-nginx is not running", out)
        self.assertIn("1 SKIP nginx details", out)

    def test_the_nginx_config_cannot_be_read(self):
        out, _ = run(FAKE_CONF_FAIL="1")
        self.assert_all_steps(out)
        self.assertIn("1 ERROR: could not read the nginx config", out)

    def test_both_containers_down(self):
        out, _ = run(FAKE_STATE="exited", FAKE_NGX_STATE="exited")
        self.assert_all_steps(out)

    def test_the_memory_refusal(self):
        self.assert_all_steps(run(FAKE_PCT="95%")[0])


class CountingScriptModule(unittest.TestCase):
    """Run 126: the counting script died with MODULE_NOT_FOUND. `mongodb` is not a top-level module of the backend image (only mongoose/node_modules/mongodb exists),
    so the driver must come from mongoose, as the compiled 96i script does. Verified once against a real in-memory MongoDB (3 ownerless payments counted)."""

    def js(self):
        with open(TASK) as f:
            return re.search(r"js='(.*)'\n", f.read()).group(1)

    def test_the_driver_comes_from_mongoose_not_from_a_top_level_mongodb_module(self):
        js = self.js()
        self.assertIn('require("mongoose").mongo', js)
        self.assertNotIn('require("mongodb")', js)

    def test_it_requires_nothing_else_that_the_image_may_not_have(self):
        self.assertEqual(sorted(set(re.findall(r'require\("([^"]+)"\)', self.js()))), ["mongoose"])


if __name__ == "__main__":
    unittest.main()
