"""tools/ops/tasks/96q-launch-server-checks.sh against a fake docker: read-only command shape, counts only, masked output, memory refusal, independent steps."""
import os
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
      *Config.Env*) c="${@: -1}"; printf 'PATH=/bin\nMONGO_URL=mongodb://user:secretpw@mongodb:27017\nTRUST_PROXY_HOPS=2\nMONGO_MAX_POOL_SIZE=%s\n' "${FAKE_POOL:-20}";;
    esac;;
  ps) printf 'nabdah-backend\nnabdah-worker\n';;
  stats) echo "${FAKE_PCT:-55.20%}";;
  exec)
    case "$*" in
      *"node -e"*) printf '%s\n' "$FAKE_NODE_OUT"; exit "${FAKE_RC:-0}";;
      *"nginx.conf"*) printf 'set_real_ip_from 10.0.0.0/8;\nreal_ip_header X-Forwarded-For;\nproxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n';;
      *access.log*) printf '      3 2\n      7 4\n';;
    esac;;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
NODE_OUT = "ownerless: medicalreports rows_without_patient_id=0\nownerless: payments rows_without_patient_id=4\nownerless: labbookings collection absent\nnoise line"


def run(**extra):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    log = os.path.join(d, "log")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_LOG": log, "FAKE_NODE_OUT": NODE_OUT, **extra}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    with open(log) as f: calls = f.read() if os.path.exists(log) else ""
    return r.stdout + r.stderr, calls


class LaunchChecks(unittest.TestCase):
    def test_prints_hops_pool_ownerless_counts_and_enterprise_requests(self):
        out, _ = run()
        self.assertIn("1 TRUST_PROXY_HOPS of nabdah-backend = 2", out)
        self.assertIn("1 nginx: set_real_ip_from lines=1, real_ip_header lines=1, proxy_add_x_forwarded_for lines=1", out)
        self.assertIn("2 MONGO_MAX_POOL_SIZE nabdah-backend = 20", out)
        self.assertIn("2 MONGO_MAX_POOL_SIZE nabdah-worker = 20", out)
        self.assertIn("3 payments rows_without_patient_id=4", out)
        self.assertIn("3 labbookings collection absent", out)
        self.assertIn("4 /providers/enterprise/* status 2xx: 3 requests", out)
        self.assertIn("4 /providers/enterprise/* status 4xx: 7 requests", out)
        self.assertIn("done (read-only; nothing was written)", out)

    def test_nothing_secret_is_printed_or_put_on_a_command_line(self):
        out, calls = run()
        self.assertNotIn("secretpw", out)
        self.assertNotIn("secretpw", calls)
        self.assertNotIn("noise line", out)
        self.assertNotIn("MONGO_URL=", calls)   # the connection string is read inside the container, never passed in

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
        # envof prints only plain tokens: a value with spaces or quotes is dropped
        out, _ = run(FAKE_POOL="a b;rm -rf")
        self.assertNotIn("a b;rm", out)


if __name__ == "__main__":
    unittest.main()
