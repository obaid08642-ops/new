"""tools/ops/tasks/98-memory-report.sh on fake /proc, cgroup, docker and kernel-log fixtures: read-only, status lines only, the verdict about mongod."""
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "98-memory-report.sh")
MB = 1024 * 1024
MONGO_ID = "a" * 64
MEILI_ID = "b" * 64
STOPPED_ID = "c" * 64


class MemoryReport(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        d = self.d = self.tmp.name
        self.proc = os.path.join(d, "proc"); self.cg = os.path.join(d, "cg"); self.bin = os.path.join(d, "bin"); self.fx = os.path.join(d, "fx")
        for p in (self.proc, self.cg, self.bin, self.fx, os.path.join(self.proc, "sys", "vm")):
            os.makedirs(p, exist_ok=True)
        self.w(os.path.join(self.proc, "meminfo"), "MemTotal:        3800000 kB\nMemAvailable:     535000 kB\nSwapTotal:             0 kB\nSwapFree:              0 kB\n")
        self.w(os.path.join(self.proc, "sys", "vm", "swappiness"), "60\n")
        self.w(os.path.join(self.proc, "sys", "vm", "overcommit_memory"), "0\n")
        self.calls = os.path.join(d, "calls.log")
        # containers: id|name|state|pid|limit|reservation|memswap|configured adj|oomkilled|restarts
        self.container(MONGO_ID, "nabdah-mongodb", "running", 100, 1600, 1000, 1600, -900, "false", 3, process_adj=-900, use=794, ev="max 0\noom 0\noom_kill 0\n")
        self.container(MEILI_ID, "nabdah-meilisearch", "running", 200, 640, 100, 0, 200, "false", 11, process_adj=0, use=610, ev="max 4\noom 2\noom_kill 2\n")
        self.container(STOPPED_ID, "nabdah-clamav", "exited", 0, 1536, 600, 0, 900, "true", 0, process_adj=None, use=0, ev="")
        self.w(os.path.join(self.fx, "ids"), f"{MONGO_ID}\n{MEILI_ID}\n{STOPPED_ID}\n")
        self.w(os.path.join(self.fx, "kernel"), "")
        self.script("sudo", '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        self.script("docker", f'''#!/bin/bash
echo "$*" >> "{self.calls}"
case "$1" in
  ps) cat "{self.fx}/ids";;
  inspect) cat "{self.fx}/$(eval echo \\${{$#}}).inspect" 2>/dev/null;;
esac
''')
        self.script("journalctl", f'#!/bin/bash\ncat "{self.fx}/kernel"\n')
        self.script("dmesg", '#!/bin/bash\nexit 0\n')

    def w(self, path, text):
        with open(path, "w") as f:
            f.write(text)

    def script(self, name, body):
        p = os.path.join(self.bin, name); self.w(p, body); os.chmod(p, 0o755)

    def container(self, cid, name, state, pid, limit, res, swap, adj, oomk, restarts, process_adj, use, ev):
        self.w(os.path.join(self.fx, f"{cid}.inspect"), f"/{name}|{state}|{pid}|{limit * MB if limit else 0}|{res * MB if res else 0}|{(swap or 0) * MB}|{adj}|{oomk}|{restarts}\n")
        if state == "running":
            scope = os.path.join(self.cg, "system.slice", f"docker-{cid}.scope"); os.makedirs(scope, exist_ok=True)
            self.w(os.path.join(scope, "memory.current"), f"{use * MB}\n"); self.w(os.path.join(scope, "memory.events"), ev)
            pd = os.path.join(self.proc, str(pid)); os.makedirs(pd, exist_ok=True)
            self.w(os.path.join(pd, "oom_score_adj"), f"{process_adj}\n"); self.w(os.path.join(pd, "oom_score"), "1\n" if process_adj == -900 else "300\n")
            self.w(os.path.join(pd, "comm"), "mongod\n" if "mongo" in name else "meilisearch\n"); self.w(os.path.join(pd, "status"), f"VmRSS:\t{use * 1024} kB\n")

    def kill(self, name, pid, adj, cid):
        return (f"Oct 31 06:00:12 host kernel: oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),cpuset=/,mems_allowed=0,global_oom,task_memcg=/system.slice/docker-{cid}.scope,task={name},pid={pid},uid=999\n"
                f"Oct 31 06:00:12 host kernel: Out of memory: Killed process {pid} ({name}) total-vm:2900000kB, anon-rss:800000kB, file-rss:0kB, shmem-rss:0kB, UID:999 pgtables:2000kB oom_score_adj:{adj}\n")

    def run_task(self):
        env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", OPS_PROC=self.proc, OPS_CGROUP=self.cg)
        return subprocess.run(["bash", TASK], capture_output=True, text=True, env=env, timeout=60)

    def test_lists_every_container_with_limits_use_and_the_real_adj_of_the_process(self):
        r = self.run_task(); out = r.stdout
        self.assertEqual(r.returncode, 0, out + r.stderr)
        self.assertIn("host: MemTotal 3710 MB, MemAvailable 522 MB, SwapTotal 0 MB, SwapFree 0 MB, vm.swappiness 60", out)
        self.assertRegex(out, r"container nabdah-mongodb: state=running limit=1600MB reservation=1000MB swap_allowance=0 \(off swap\) use_now=794MB .*oom_score_adj configured=-900 process=-900 oom_score=1 oom_killed=false restarts=3 cgroup_events\[max=0 oom=0 oom_kill=0\]")
        self.assertRegex(out, r"container nabdah-meilisearch: state=running limit=640MB .* use_now=610MB .*cgroup_events\[max=4 oom=2 oom_kill=2\]")
        self.assertIn("ADJ-MISMATCH(configured 200, process has 0)", out)         # the compose value did not reach the process
        self.assertRegex(out, r"container nabdah-clamav: state=exited limit=1536MB .* oom_killed=true")
        self.assertIn("containers running: 2; sum of limits 2240 MB, sum of reservations 1100 MB, sum of current use 1404 MB", out)

    def test_kills_by_command_adj_constraint_and_container_and_the_verdict_when_minus_900_did_not_reach_mongod(self):
        self.w(os.path.join(self.fx, "kernel"), self.kill("mongod", 4001, 0, "d" * 64) * 3 + self.kill("meilisearch", 4002, 200, MEILI_ID) * 2)
        out = self.run_task().stdout
        self.assertIn("kernel OOM kills (journalctl -k, last 3h): 5", out)
        self.assertIn("kills by command and the oom_score_adj the victim had: mongod adj=0 x3", out)
        self.assertIn("kills by command and the oom_score_adj the victim had: meilisearch adj=200 x2", out)
        self.assertIn("kills by constraint: CONSTRAINT_NONE=5 ", out)
        self.assertIn("kills by the container the victim ran in: mongod in unknown(dddddddddddd) x3", out)
        self.assertIn("kills by the container the victim ran in: meilisearch in nabdah-meilisearch x2", out)
        self.assertIn("VERDICT: 3 of 3 killed mongod processes did NOT have oom_score_adj -900", out)

    def test_verdict_when_mongod_had_minus_900_and_was_still_killed(self):
        self.w(os.path.join(self.fx, "kernel"), self.kill("mongod", 4001, -900, MONGO_ID) * 2)
        out = self.run_task().stdout
        self.assertIn("kills by the container the victim ran in: mongod in nabdah-mongodb x2", out)
        self.assertIn("VERDICT: the 2 killed mongod processes had oom_score_adj -900 and were still chosen", out)

    def test_no_kills_no_verdict_noise_and_only_status_lines(self):
        r = self.run_task()
        self.assertIn("VERDICT: no mongod kill in the window", r.stdout)
        for line in r.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)

    def test_it_only_reads(self):
        self.run_task()
        for l in open(self.calls).read().splitlines():
            self.assertRegex(l, r"^(ps|inspect) ", l)             # no rm, stop, restart, update, run, exec
            self.assertNotIn("Config.Env", l)                      # the environment is never read


if __name__ == "__main__":
    unittest.main()
