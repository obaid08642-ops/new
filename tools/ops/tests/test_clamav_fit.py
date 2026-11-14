"""tools/ops/tasks/96e-clamav-fit.sh against a fake docker / meminfo: read-only, numbers only, and the arithmetic of the pause sets."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "96e-clamav-fit.sh")
STATS = ("nabdah-mongodb=888MiB / 1.5GiB\nnabdah-admin-web=90MiB / 384MiB\nnabdah-fastapi=70.5MiB / 384MiB\nnabdah-meilisearch=120MiB / 640MiB\n"
         "nabdah-redis-cache=130MiB / 384MiB\nnabdah-worker=210MiB / 640MiB\nnabdah-patient-web=0.4GiB / 640MiB\n")


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class ClamavFit(unittest.TestCase):
    def run_task(self, avail_mb=647, env_text="SECRET_VALUE=do-not-print-me\n", stats=STATS, swap_used_mb=2000):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        deploy = os.path.join(d, "deploy"); os.makedirs(deploy)
        with open(os.path.join(deploy, ".env.production"), "w") as f:
            f.write(env_text)
        meminfo = os.path.join(d, "meminfo")
        with open(meminfo, "w") as f:
            f.write(f"MemTotal: 3891200 kB\nMemAvailable: {avail_mb * 1024} kB\nSwapTotal: 4194304 kB\nSwapFree: {(4096 - swap_used_mb) * 1024} kB\n")
        calls = os.path.join(d, "calls.log")
        with open(os.path.join(d, "stats.txt"), "w") as f:
            f.write(stats)
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'#!/bin/bash\necho "$*" >> "{calls}"\n[ "$1" = stats ] && cat "{d}/stats.txt"\n')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], HOME=d, OPS_DEPLOY_DIR=deploy, OPS_MEMINFO=meminfo)
        p = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
        text = ""
        if os.path.exists(calls):
            with open(calls) as f:
                text = f.read()
        return p, text

    def test_the_run_77_numbers_say_no_local_window_fits(self):
        p, _ = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("MemAvailable=647MB swap_used=2000MB", p.stdout)
        self.assertIn("starts ClamAV at >= 1700MB free", p.stdout)
        self.assertIn("as it is: projected free 647MB -> window starts: NO (short by 653MB", p.stdout)
        self.assertIn("pause set A (admin-web=90MB fastapi=71MB meilisearch=120MB redis-cache=130MB): frees about 411MB -> projected free 1058MB", p.stdout)
        self.assertIn("pause set B", p.stdout); self.assertIn("worker=210MB", p.stdout)
        self.assertIn("pause set C", p.stdout); self.assertIn("patient-web=410MB", p.stdout)   # 0.4 GiB -> 410 MB
        self.assertIn("projected free 1678MB", p.stdout)                                      # 647 + 411 + 210 + 410
        self.assertIn("answer: a local window can fit only with the pause set", p.stdout)     # C reaches 1678 >= 1300 only by taking the site down

    def test_enough_memory_meets_the_start_rule(self):
        p, _ = self.run_task(avail_mb=1800)
        self.assertIn("as it is: projected free 1800MB -> window starts: yes (meets CLAMAV_MIN_FREE_MB)", p.stdout)

    def test_a_lowered_start_rule_is_read_and_changes_the_verdict(self):
        p, _ = self.run_task(avail_mb=1300, env_text="CLAMAV_MIN_FREE_MB=1300\n")
        self.assertIn("starts ClamAV at >= 1300MB free", p.stdout)
        self.assertIn("as it is: projected free 1300MB -> window starts: yes", p.stdout)

    def test_nothing_fits_when_even_all_sets_are_too_small(self):
        p, _ = self.run_task(avail_mb=100, stats="nabdah-worker=50MiB / 640MiB\n")
        self.assertIn("answer: no pause set makes a local window fit on this host", p.stdout)

    def test_prints_no_environment_value_and_only_reads(self):
        p, calls = self.run_task()
        self.assertNotIn("do-not-print-me", p.stdout + p.stderr)
        verbs = {l.split(" ", 1)[0] for l in calls.splitlines() if l}
        self.assertEqual(verbs, {"stats"})                       # no start, stop, up, rm, compose
        self.assertIn("done (read-only)", p.stdout)


if __name__ == "__main__":
    unittest.main()
