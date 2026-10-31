"""tools/ops/tasks/98c-swapfile.sh with fake swapon/mkswap/sysctl on a temporary directory: the dry run changes nothing, APPLY makes the swap permanent and proves it, the guards stop it."""
import os
import re
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "98c-swapfile.sh")
MB = 1024 * 1024


class SwapFile(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        d = self.d = self.tmp.name
        self.bin = os.path.join(d, "bin"); self.proc = os.path.join(d, "proc"); self.disk = os.path.join(d, "disk")
        for p in (self.bin, os.path.join(self.proc, "sys", "vm"), self.disk, os.path.join(d, "sysctl.d")):
            os.makedirs(p)
        self.swapfile = os.path.join(self.disk, "swapfile"); self.fstab = os.path.join(d, "fstab"); self.sysctl = os.path.join(d, "sysctl.d", "99-nabd-swap.conf")
        self.state = os.path.join(d, "swaps"); self.calls = os.path.join(d, "calls.log")
        self.w(self.fstab, "UUID=abc / ext4 defaults 0 1\n"); self.w(self.state, "")
        self.w(os.path.join(self.proc, "sys", "vm", "swappiness"), "60\n")
        self.meminfo(0)
        self.mongo = (1600 * MB, 1600 * MB)
        self.script("sudo", '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        self.script("fallocate", f'#!/bin/bash\necho "fallocate $*" >> "{self.calls}"\nsz=${{2%M}}\ntruncate -s ${{sz}}M "$3"\n')
        self.script("mkswap", f'#!/bin/bash\necho "mkswap $*" >> "{self.calls}"\n')
        self.script("swapon", f'''#!/bin/bash
echo "swapon $*" >> "{self.calls}"
if [ "$1" = "--show=NAME" ]; then cat "{self.state}"; exit 0; fi
echo "$1" >> "{self.state}"
sz=$(( $(stat -c %s "$1") / 1024 ))
printf 'MemTotal: 3800000 kB\\nMemAvailable: 535000 kB\\nSwapTotal: %s kB\\nSwapFree: %s kB\\n' "$sz" "$sz" > "{self.proc}/meminfo"
''')
        self.script("swapoff", f'#!/bin/bash\necho "swapoff $*" >> "{self.calls}"\ngrep -vx "$1" "{self.state}" > "{self.state}.n"; mv "{self.state}.n" "{self.state}"\nprintf "MemTotal: 3800000 kB\\nMemAvailable: 535000 kB\\nSwapTotal: 0 kB\\nSwapFree: 0 kB\\n" > "{self.proc}/meminfo"\n')
        self.script("sysctl", f'#!/bin/bash\necho "sysctl $*" >> "{self.calls}"\necho "${{2#vm.swappiness=}}" > "{self.proc}/sys/vm/swappiness"\n')

    def w(self, path, text):
        with open(path, "w") as f:
            f.write(text)

    def script(self, name, body):
        p = os.path.join(self.bin, name); self.w(p, body); os.chmod(p, 0o755)

    def meminfo(self, swap_kb):
        self.w(os.path.join(self.proc, "meminfo"), f"MemTotal: 3800000 kB\nMemAvailable: 535000 kB\nSwapTotal: {swap_kb} kB\nSwapFree: {swap_kb} kB\n")

    def docker(self):
        m, s = self.mongo
        self.script("docker", f'#!/bin/bash\ncase "$*" in *HostConfig.MemorySwap*) echo {s};; *HostConfig.Memory*) echo {m};; esac\n')

    def run_task(self, apply=False, remove=False, **env):
        self.docker()
        text = open(TASK).read()
        if apply:
            text = re.sub(r'(?m)^APPLY=""$', 'APPLY="yes"', text)
        if remove:
            text = re.sub(r'(?m)^REMOVE=""$', 'REMOVE="yes"', text)
        script = os.path.join(self.d, "task.sh"); self.w(script, text)
        e = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", OPS_SWAPFILE=self.swapfile, OPS_SWAP_MB="8", OPS_SWAP_MIN_FREE_AFTER_MB="1", OPS_FSTAB=self.fstab,
                 OPS_SYSCTL_FILE=self.sysctl, OPS_PROC=self.proc, OPS_FSTYPE="ext4")
        e.update(env)
        return subprocess.run(["bash", script], capture_output=True, text=True, env=e, timeout=60)

    def test_dry_run_prints_the_plan_and_changes_nothing(self):
        r = self.run_task()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("dry run only: nothing was changed", r.stdout)
        self.assertIn("plan: create", r.stdout)
        self.assertFalse(os.path.exists(self.swapfile))
        self.assertEqual(open(self.fstab).read(), "UUID=abc / ext4 defaults 0 1\n")
        self.assertFalse(os.path.exists(self.sysctl))
        calls = open(self.calls).read().splitlines() if os.path.exists(self.calls) else []
        self.assertEqual([c for c in calls if not c.startswith("swapon --show=NAME")], [], calls)   # only the read-only listing of the swaps
        self.assertIn("nabdah-mongodb: memory 1600 MB = memory+swap 1600 MB: it is OFF swap", r.stdout)

    def test_apply_creates_turns_on_makes_permanent_and_proves_it(self):
        r = self.run_task(apply=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(os.stat(self.swapfile).st_size, 8 * MB)
        self.assertEqual(oct(os.stat(self.swapfile).st_mode & 0o777), "0o600")
        self.assertIn(f"{self.swapfile} none swap sw 0 0", open(self.fstab).read())
        self.assertTrue(any(f.startswith("fstab.bak-") for f in os.listdir(self.d)) or any(f.startswith("fstab.bak-") for f in os.listdir(os.path.dirname(self.fstab))))
        self.assertIn("vm.swappiness=10", open(self.sysctl).read())
        self.assertEqual(open(os.path.join(self.proc, "sys", "vm", "swappiness")).read().strip(), "10")
        self.assertIn("APPLIED: SwapTotal 8 MB", r.stdout)
        self.assertIn("checks passed", r.stdout)

    def test_a_second_apply_changes_nothing_more(self):
        self.run_task(apply=True)
        before = open(self.fstab).read()
        n = len(open(self.calls).read().splitlines())
        r = self.run_task(apply=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("already active", r.stdout)
        self.assertEqual(open(self.fstab).read(), before)                       # the line is not added twice
        self.assertEqual(open(self.fstab).read().count("swap sw"), 1)
        new = open(self.calls).read().splitlines()[n:]
        self.assertFalse([c for c in new if c.startswith(("fallocate", "mkswap"))], new)

    def test_not_enough_room_stops_before_anything_is_created(self):
        r = self.run_task(apply=True, OPS_SWAP_MIN_FREE_AFTER_MB="999999999")
        self.assertEqual(r.returncode, 1)
        self.assertIn("ABORT not enough room", r.stdout)
        self.assertFalse(os.path.exists(self.swapfile))
        calls = open(self.calls).read().splitlines() if os.path.exists(self.calls) else []
        self.assertEqual([c for c in calls if not c.startswith("swapon --show=NAME")], [], calls)

    def test_a_file_system_without_swap_file_support_and_a_wrong_sized_file_stop_it(self):
        r = self.run_task(apply=True, OPS_FSTYPE="btrfs")
        self.assertEqual(r.returncode, 1)
        self.assertIn("a swap file needs ext4 or xfs", r.stdout)
        self.w(self.swapfile, "x" * 1024)
        r = self.run_task(apply=True)
        self.assertEqual(r.returncode, 1)
        self.assertIn("exists with 0 MB, not 8 MB", r.stdout)
        self.assertEqual(open(self.swapfile).read(), "x" * 1024)                # an existing file is never overwritten

    def test_mongodb_that_may_swap_is_warned_about_and_never_changed(self):
        self.mongo = (1600 * MB, 3200 * MB)
        r = self.run_task()
        self.assertIn("WARNING nabdah-mongodb may use swap", r.stdout)
        self.assertNotIn("update", open(self.calls).read() if os.path.exists(self.calls) else "")

    def test_remove_undoes_it(self):
        self.run_task(apply=True)
        r = self.run_task(remove=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse(os.path.exists(self.swapfile))
        self.assertNotIn(self.swapfile, open(self.fstab).read())
        self.assertIn("UUID=abc / ext4", open(self.fstab).read())               # the other lines stay
        self.assertFalse(os.path.exists(self.sysctl))
        self.assertIn("REMOVED: SwapTotal now 0 MB", r.stdout)


if __name__ == "__main__":
    unittest.main()
