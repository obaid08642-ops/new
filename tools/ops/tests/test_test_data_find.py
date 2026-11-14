"""tools/ops/tasks/77-test-data-find.sh against a fake docker: read-only, only the tool's own JSON lines, nothing else."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "77-test-data-find.sh")
OUT = ('{"step":"scanned","collection":"provider_profiles","documents":4,"candidates":3}\n'
       '{"step":"candidate","collection":"provider_profiles","id":"7210a983-x","matched":["ar_test"],"type":"doctor"}\n'
       '{"step":"links","id":"7210a983-x","linked":{"orders":2},"total":2}\n'
       '{"step":"summary","candidates":3,"providers":3,"writes":false}\n')


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class TestDataFind(unittest.TestCase):
    def run_task(self, health="healthy", rc=0, noise=""):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        b = os.path.join(tmp.name, "bin"); os.makedirs(b)
        out = os.path.join(tmp.name, "out.txt")
        with open(out, "w") as f:
            f.write(noise + OUT)
        log = os.path.join(tmp.name, "docker.log")
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'#!/bin/bash\necho "$@" >> "{log}"\ncase "$1" in\n  inspect) echo {health};;\n  exec) shift 2; case "$1" in test) exit 0;; node) cat "{out}"; exit {rc};; esac;;\nesac\n')
        p = subprocess.run(["bash", TASK], env=dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"]), capture_output=True, text=True, timeout=30)
        return p, open(log).read() if os.path.exists(log) else ""

    def test_prints_only_the_tools_json_lines_as_status_lines_and_writes_nothing(self):
        p, log = self.run_task(noise="DEBUG owner.secret@example.com\n")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn('status: test-data-find: {"step":"candidate","collection":"provider_profiles","id":"7210a983-x"', p.stdout)
        self.assertIn("done: read only, nothing was written", p.stdout)
        self.assertNotIn("owner.secret", p.stdout)                      # a stray line is dropped
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)
        self.assertNotIn("compose", log)
        self.assertNotIn("rm ", log)

    def test_aborts_when_the_backend_is_not_healthy_or_the_tool_fails(self):
        p, _ = self.run_task(health="starting")
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT", p.stdout)
        p, _ = self.run_task(rc=1)
        self.assertEqual(p.returncode, 1)
        self.assertIn("FAILED (exit 1)", p.stdout)


if __name__ == "__main__":
    unittest.main()
