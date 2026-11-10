"""tools/ops/tasks/96n-mongo-oom-cause.sh against a fake docker, sudo, dmesg and cgroup files: kills with time and size, cgroup events, what mongod logged before a kill, snapshots after a start, read-only."""
import os
import stat
import subprocess
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96n-mongo-oom-cause.sh")

SLOW = ('{"t":{"$date":"x"},"s":"I","c":"COMMAND","id":51803,"msg":"Slow query","attr":{"type":"command","ns":"nabd.appointments","appName":"nabdah-worker",'
        '"command":{"aggregate":"appointments","pipeline":[{"$match":{"patient":"SECRET-PATIENT-DATA"}}]},"planSummary":"COLLSCAN","docsExamined":900000,"durationMillis":4200}}')
FAKE_DOCKER = r"""#!/bin/bash
case "$1" in
  inspect)
    case "$*" in
      *StartedAt*) n=$(cat "$FAKE_DIR/n" 2>/dev/null || echo 0); echo $((n+1)) > "$FAKE_DIR/n"; [ "$n" -ge "${FAKE_START_AFTER:-1}" ] && echo 2026-11-10T04:41:00Z || echo 2026-11-10T04:38:00Z;;
      *.Id*) echo abc123;;
    esac;;
  logs)
    case "$*" in
      *nabdah-backend*|*nabdah-worker*) echo "2026-11-10T04:41:05Z ScheduledOnce job reconcile started for owner@example.test";;
      *--timestamps*) echo '2026-11-10T04:41:00.000000000Z {"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4615611,"msg":"initializing"}';;
      *--until*) echo '__SLOW__'; echo '{"s":"I","c":"INDEX","id":20345,"msg":"Index build"}'; echo '{"id":22943,"msg":"Connection accepted"}'; echo '{"id":51800,"attr":{"doc":{"application":{"name":"nabdah-worker"}}},"application":{"name":"nabdah-worker"}}';;
    esac;;
  exec) echo "up=40s conns=51 resident_MB=1100 tc_alloc_MB=900 tc_heap_MB=1000 wt_cache_MB=500 dirty_MB=3 ops=[command|nabd.appointments|12s|nabdah-worker|COLLSCAN|aggregate]";;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
FAKE_DMESG = '#!/bin/bash\ncat "$FAKE_DMESG_FILE"\n'


def run(start_after=1):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER.replace("__SLOW__", SLOW.replace("'", "'\\''"))), ("sudo", FAKE_SUDO), ("dmesg", FAKE_DMESG)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    cg = os.path.join(d, "cg", "system.slice", "docker-abc123.scope"); os.makedirs(cg)
    for n, v in (("memory.events", "low 0\nhigh 0\nmax 6803\noom 4\noom_kill 4\n"), ("memory.current", "1500000000\n"), ("memory.peak", "1677721600\n"), ("memory.max", "1677721600\n")):
        with open(os.path.join(cg, n), "w") as f: f.write(v)
    t = time.localtime(time.time() - 600)
    with open(os.path.join(d, "dmesg.txt"), "w") as f:
        f.write(f"[{time.strftime('%a %b %e %H:%M:%S %Y', t)}] Memory cgroup out of memory: Killed process 4242 (mongod) total-vm:3000000kB, anon-rss:1632000kB, file-rss:0kB\n")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_DIR": d, "FAKE_DMESG_FILE": os.path.join(d, "dmesg.txt"), "OPS_CGROUP_ROOT": os.path.join(d, "cg"),
           "FAKE_START_AFTER": str(start_after), "WAIT_START_S": "6", "SNAP1_S": "0", "SNAP2_S": "0"}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class Check(unittest.TestCase):
    def test_kill_cgroup_and_window(self):
        out = run()
        self.assertIn("anon-rss=1593 MB", out)
        self.assertIn("max 6803", out)
        self.assertIn("oom_kill 4", out)
        self.assertIn("nabd.appointments command plan=COLLSCAN ms=4200 docs=900000 app=nabdah-worker", out)
        self.assertIn("index_lines=1", out)
        self.assertIn("conns=1", out)

    def test_snapshot_after_a_start_and_the_jobs_after_it(self):
        out = run()
        self.assertEqual(out.count("snapshot +0s after the start at 04:41:00"), 2)   # the 30 s and the 60 s snapshot (both 0 s in the test)
        self.assertIn("ops=[command|nabd.appointments|12s|nabdah-worker|COLLSCAN|aggregate]", out)
        self.assertIn("after start 04:41:00 nabdah-worker: matches=1", out)

    def test_without_a_start_it_takes_one_snapshot_now(self):
        out = run(start_after=1000)
        self.assertIn("snapshot now (no mongod start within 6s)", out)

    def test_no_command_body_no_mail_and_read_only(self):
        out = run()
        self.assertNotIn("SECRET-PATIENT-DATA", out)
        self.assertNotIn("owner@example.test", out)
        self.assertIn("<mail>", out)
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in ("$DK restart", "$DK stop", "$DK kill", "$DK rm ", "$DK run", "setParameter", "tee ", " > /", "compact", "drop"):
            self.assertNotIn(bad, code)


if __name__ == "__main__":
    unittest.main()
