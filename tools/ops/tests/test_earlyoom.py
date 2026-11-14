"""tools/ops/tasks/98p-earlyoom.sh against fake sudo/systemctl/apt-get/fallocate (temp /etc and /proc, no server)."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "98p-earlyoom.sh")


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


def rd(p):
    with open(p) as fh:
        return fh.read()


def wr(p, t):
    with open(p, "w") as fh:
        fh.write(t)


class Earlyoom(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup); self.t = t.name
        self.b = os.path.join(self.t, "bin"); os.makedirs(self.b)
        self.etc = os.path.join(self.t, "etc"); os.makedirs(self.etc)
        self.proc = os.path.join(self.t, "proc"); os.makedirs(self.proc)
        self.log = os.path.join(self.t, "calls.log")
        self.swapfile = os.path.join(self.t, "swapfile")
        self.set_swap(0)
        write_exec(os.path.join(self.b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        for cmd in ("systemctl", "apt-get", "mkswap", "swapon"):
            write_exec(os.path.join(self.b, cmd), f'#!/bin/bash\necho "{cmd} $@" >> "{self.log}"\nexit 0\n')
        write_exec(os.path.join(self.b, "fallocate"), f'#!/bin/bash\necho "fallocate $@" >> "{self.log}"\ntouch "$3"\n')

    def set_swap(self, mb):
        with open(os.path.join(self.proc, "meminfo"), "w") as fh:
            fh.write(f"MemTotal:        3891200 kB\nSwapTotal:       {mb * 1024} kB\n")

    def run_task(self, **kv):
        with open(TASK) as fh:
            src = fh.read()
        for k, v in kv.items():   # the tasks read APPLY / ROLLBACK from their own `NAME=""` line
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.t, "task.sh"); write_exec(script, src)
        e = {**os.environ, "PATH": self.b + ":" + os.environ["PATH"], "OPS_ETC": self.etc, "OPS_PROC": self.proc, "OPS_SWAPFILE": self.swapfile, "OPS_SSH_UNIT": "ssh"}
        return subprocess.run(["bash", script], capture_output=True, text=True, env=e)

    def calls(self):
        if not os.path.exists(self.log):
            return ""
        with open(self.log) as fh:
            return fh.read()

    def test_dry_run_changes_nothing_and_says_what_it_would_do(self):
        r = self.run_task()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("dry run only", r.stdout)
        self.assertIn("MemTotal 3800 MB, SwapTotal 0 MB", r.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.etc, "default", "earlyoom")))
        self.assertFalse(os.path.exists(self.swapfile))
        self.assertNotIn("apt-get", self.calls())

    def test_apply_installs_configures_creates_swap_and_protects_sshd(self):
        r = self.run_task(APPLY="yes")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        conf = rd(os.path.join(self.etc, "default", "earlyoom"))
        self.assertIn("-m 5 -s 10", conf)
        for protected in ("mongod", "redis-server", "sshd", "dockerd"):
            self.assertIn(protected, conf.split("--avoid")[1].split("--prefer")[0])
        self.assertIn("clamd", conf.split("--prefer")[1])
        self.assertIn("apt-get install -y earlyoom", self.calls())
        self.assertIn("systemctl enable --now earlyoom", self.calls())
        self.assertIn("fallocate -l 2048M", self.calls())
        self.assertIn("swapon", self.calls())
        self.assertIn("swap sw 0 0", rd(os.path.join(self.etc, "fstab")))
        self.assertIn("OOMScoreAdjust=-1000", rd(os.path.join(self.etc, "systemd", "system", "ssh.service.d", "nabd-oom.conf")))

    def test_existing_swap_is_never_touched(self):
        self.set_swap(4096)
        r = self.run_task(APPLY="yes")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("guard satisfied", r.stdout)
        self.assertNotIn("fallocate", self.calls())
        self.assertNotIn("mkswap", self.calls())

    def test_an_existing_swapfile_is_not_overwritten(self):
        wr(self.swapfile, "keep")
        self.run_task(APPLY="yes")
        self.assertEqual(rd(self.swapfile), "keep")
        self.assertNotIn("mkswap", self.calls())

    def test_apply_twice_is_idempotent_for_fstab(self):
        self.run_task(APPLY="yes")
        wr(self.swapfile, "")
        self.run_task(APPLY="yes")
        self.assertEqual(rd(os.path.join(self.etc, "fstab")).count("swap sw"), 1)

    def test_rollback_removes_what_was_written_and_keeps_the_swapfile(self):
        self.run_task(APPLY="yes")
        r = self.run_task(ROLLBACK="yes")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse(os.path.exists(os.path.join(self.etc, "default", "earlyoom")))
        self.assertFalse(os.path.exists(os.path.join(self.etc, "systemd", "system", "ssh.service.d", "nabd-oom.conf")))
        self.assertTrue(os.path.exists(self.swapfile))
        self.assertIn("systemctl disable --now earlyoom", self.calls())


if __name__ == "__main__":
    unittest.main()
