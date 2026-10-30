"""deploy/scripts/_mongodump-oneoff.sh (used by backup.sh, oplog-backup.sh and the ops tasks) against a fake docker: the dump runs in a one-off container with its own cap,
the password only in a mode-600 file, an empty or failed dump is a failure, and the copy inside 92-recreate-datastores.sh is the same text."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "..", "..", "..", "deploy", "scripts", "_mongodump-oneoff.sh")
TASK92 = os.path.join(HERE, "..", "tasks", "92-recreate-datastores.sh")
PW = "pa'ss\"w0rd$x|y"

FAKE = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
case "$1" in
  inspect) case "$*" in *IPAddress*) echo 172.20.0.5;; *Config.Image*) echo mongo:7.0;; *Networks*) echo "net_a net_b ";; esac; exit 0;;
  run)
    cfg=$(echo "$*" | sed -n 's/.*-v \([^ ]*\):\/cfg\/mongodump.yml:ro.*/\1/p'); [ -n "$cfg" ] && { cat "$cfg" > "$FAKE_CFG"; stat -c %a "$cfg" > "$FAKE_CFG.mode"; }
    [ "${FAKE_RC:-0}" != 0 ] && { echo "Failed: connection refused $FAKE_PW" >&2; exit "$FAKE_RC"; }
    [ -n "$FAKE_EMPTY" ] && exit 0
    printf 'archive-bytes';;
esac
"""


class MongodumpOneoff(unittest.TestCase):
    def run_fn(self, **env):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        with open(os.path.join(b, "docker"), "w") as f:
            f.write(FAKE)
        os.chmod(os.path.join(b, "docker"), 0o755)
        out = os.path.join(d, "out.gz")
        e = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], FAKE_LOG=os.path.join(d, "log"), FAKE_CFG=os.path.join(d, "cfg"), FAKE_PW=PW,
                 MONGO_ROOT_USER="root", MONGO_ROOT_PASSWORD=PW)
        e.update({k: str(v) for k, v in env.items()})
        p = subprocess.run(["bash"] + (["-e"] if env.get("ERREXIT") else []) + ["-c", f'source "{LIB}"; {env.get("PRE", "")} mongodump_oneoff "{out}" --db=x --gzip --archive; echo "RC=$?"'], env=e, capture_output=True, text=True, timeout=30)
        log = open(os.path.join(d, "log")).read()
        cfg = open(os.path.join(d, "cfg")).read() if os.path.exists(os.path.join(d, "cfg")) else ""
        mode = open(os.path.join(d, "cfg.mode")).read().strip() if os.path.exists(os.path.join(d, "cfg.mode")) else ""
        data = open(out, "rb").read() if os.path.exists(out) else None
        return p, log, cfg, mode, data

    def test_runs_in_a_one_off_container_with_a_cap_and_a_private_password_file(self):
        p, log, cfg, mode, data = self.run_fn()
        self.assertIn("RC=0", p.stdout)
        run = [l for l in log.splitlines() if l.startswith("run ")][0]
        self.assertIn("--rm", run); self.assertIn("--user 0:0", run); self.assertIn("--network net_a", run)
        self.assertIn("--memory 600m --memory-swap 600m --oom-score-adj 1000", run)
        self.assertIn("--entrypoint mongodump mongo:7.0", run); self.assertIn("--db=x --gzip --archive", run)
        self.assertNotIn("exec", log)
        self.assertNotIn("pa'ss", log + p.stdout + p.stderr)                      # never an argument or output
        self.assertEqual(cfg.strip(), "password: 'pa''ss\"w0rd$x|y'")              # YAML single-quoted, apostrophe doubled
        self.assertEqual(mode, "600")
        self.assertEqual(data, b"archive-bytes")
        self.assertRegex(p.stdout, r"rc=0 size_bytes=13")

    def test_the_host_is_the_container_address_and_a_test_database_without_a_root_user_gets_no_credentials(self):
        p, log, cfg, _, _ = self.run_fn(MONGO_ROOT_USER="", MONGO_ROOT_PASSWORD="")
        self.assertIn("RC=0", p.stdout)
        run = [l for l in log.splitlines() if l.startswith("run ")][0]
        self.assertIn("--host=172.20.0.5 --port=27017", run)       # the address: a default bridge network has no name resolution
        self.assertNotIn("--username", run); self.assertNotIn("/cfg/mongodump.yml", run); self.assertEqual(cfg, "")
        q, log2, *_ = self.run_fn()
        self.assertIn("--username=root --authenticationDatabase=admin", [l for l in log2.splitlines() if l.startswith("run ")][0])

    def test_a_failed_dump_is_a_failure_and_its_error_has_no_password(self):
        p, _, _, _, _ = self.run_fn(FAKE_RC=3)
        self.assertIn("RC=1", p.stdout); self.assertIn("rc=3", p.stdout)
        self.assertIn("Failed: connection refused", p.stdout); self.assertNotIn(PW, p.stdout + p.stderr)

    def test_a_failing_dump_still_reports_under_set_e(self):
        p, *_ = self.run_fn(FAKE_RC=3, ERREXIT=1)                # CI runs bash -e: the failure must print its report and return 1, not end the script silently
        self.assertIn("rc=3", p.stdout); self.assertIn("error: Failed: connection refused", p.stdout)   # the report is printed; the caller's own -e then ends the script

    def test_an_empty_dump_is_a_failure_unless_allowed(self):
        p, *_ = self.run_fn(FAKE_EMPTY=1)
        self.assertIn("RC=1", p.stdout); self.assertIn("size_bytes=0", p.stdout)
        ok, *_ = self.run_fn(FAKE_EMPTY=1, PRE="MONGODUMP_ALLOW_EMPTY=1")
        self.assertIn("RC=0", ok.stdout)

    def test_the_copy_in_the_recreate_task_is_the_same_function(self):
        lib = open(LIB).read(); fn = lib[lib.index("mongodump_oneoff() {"):].rstrip("\n")
        self.assertIn(fn, open(TASK92).read())


if __name__ == "__main__":
    unittest.main()
