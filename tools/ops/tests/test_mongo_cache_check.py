"""tools/ops/tasks/96j-mongo-cache-check.sh against a fake docker, sudo, dmesg and cgroup files: effective vs file cache size, anon/file split, kernel kills with their time, restarts from the mongod log."""
import os
import stat
import subprocess
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96j-mongo-cache-check.sh")

FAKE_DOCKER = r"""#!/bin/bash
case "$1" in
  exec)
    case "$*" in
      *getCmdLineOpts*) echo "${FAKE_EFF:-0.6}";;
      *'maximum bytes configured'*) echo "644245094";;
      *cache_in_use_MB*) echo "cache_in_use_MB=598 dirty_MB=12 resident_MB=905 connections=51 available=249";;
    esac;;
  inspect)
    case "$*" in
      *HostConfig.MemoryReservation*) echo 1048576000;;
      *HostConfig.Memory*) echo 1677721600;;
      *.Id*) echo abc123;;
    esac;;
  logs)
    for i in 1 2 3 4; do echo '{"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4615611,"msg":"initializing"}'; done
    echo '{"t":{"$date":"x"},"s":"I","c":"CONTROL","id":23377,"msg":"signal"}'
    echo '{"t":{"$date":"x"},"s":"I","c":"CONTROL","id":4784900,"msg":"shutdown"}';;
  stats) printf 'nabdah-mongodb=950MiB / 1.56GiB\nnabdah-backend=330MiB / 576MiB\n';;
esac
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
FAKE_DMESG = '#!/bin/bash\ncat "$FAKE_DMESG_FILE"\n'


def stamp(ago_h):
    return time.strftime("%a %b %e %H:%M:%S %Y", time.localtime(time.time() - ago_h * 3600))


def run(eff="0.6", conf="cacheSizeGB: 0.6", dmesg=None):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO), ("dmesg", FAKE_DMESG)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    deploy = os.path.join(d, "deploy"); os.makedirs(os.path.join(deploy, "mongo"))
    with open(os.path.join(deploy, "mongo", "mongod.conf"), "w") as f: f.write("storage:\n  wiredTiger:\n    engineConfig:\n      " + conf + "\n")
    cg = os.path.join(d, "cg", "system.slice", "docker-abc123.scope"); os.makedirs(cg)
    for n, v in (("memory.stat", "anon 734003200\nfile 838860800\n"), ("memory.current", "1572864000\n"), ("memory.peak", "1677721600\n"), ("memory.max", "1677721600\n"),
                 ("memory.events", "low 0\nhigh 0\nmax 3755\noom 0\noom_kill 0\n")):
        with open(os.path.join(cg, n), "w") as f: f.write(v)
    lines = dmesg if dmesg is not None else [
        f"[{stamp(1)}] Out of memory: Killed process 4242 (mongod) total-vm:3000000kB, anon-rss:1048576kB, file-rss:0kB, shmem-rss:0kB",
        f"[{stamp(2)}] Memory cgroup out of memory: Killed process 4343 (mongod) total-vm:2000000kB, anon-rss:1572864kB, file-rss:0kB",
        f"[{stamp(100)}] Out of memory: Killed process 1 (mongod) total-vm:1kB, anon-rss:1024kB, file-rss:0kB",
        f"[{stamp(3)}] Out of memory: Killed process 4545 (node) total-vm:1kB, anon-rss:1024kB, file-rss:0kB",
    ]
    with open(os.path.join(d, "dmesg.txt"), "w") as f: f.write("\n".join(lines) + "\n")
    env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_EFF": eff, "FAKE_DMESG_FILE": os.path.join(d, "dmesg.txt"), "OPS_DEPLOY_DIR": deploy,
           "OPS_CGROUP_ROOT": os.path.join(d, "cg")}
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r.stdout + r.stderr


class Check(unittest.TestCase):
    def test_running_value_equals_the_file(self):
        out = run()
        self.assertIn("mongod runs with cacheSizeGB=0.6 (WiredTiger maximum 614 MB); the repo file on the host says 0.6; container limit 1600 MB, reservation 1000 MB", out)
        self.assertIn("the setting IS applied", out)

    def test_a_mismatch_is_named(self):
        out = run(eff="0.5")
        self.assertIn("MISMATCH: the file says 0.6 but mongod runs with 0.5", out)

    def test_no_cache_option_says_it_is_sized_from_host_ram(self):
        out = run(eff="undefined", conf="# no cache line")
        self.assertIn("could not compare", out)
        self.assertIn("sizes the cache from HOST RAM", out)

    def test_cgroup_split_anon_file_and_events(self):
        out = run()
        self.assertIn("current 1500 MB = anon 700 MB (heap, cache, connections) + file 800 MB (page cache, reclaimable); peak 1600 MB; limit 1600 MB", out)
        self.assertIn("max 3755", out)
        self.assertIn("oom_kill 0", out)

    def test_kills_are_counted_by_time_and_kind(self):
        out = run()
        self.assertIn("kernel kills in the last 48 h: mongod=2, other commands=1", out)   # the 100 h old one is outside the window
        self.assertIn("kind=global anon-rss=1024 MB", out)
        self.assertIn("kind=cgroup anon-rss=1536 MB", out)

    def test_restarts_from_the_log_without_a_signal_or_shutdown(self):
        out = run()
        self.assertIn("starts=4 signals_received=1 shutdowns=1", out)
        self.assertIn("about 3 of 4", out)

    def test_read_only_and_no_secret_in_the_output(self):
        with open(TASK) as f: code = "\n".join(l for l in f.read().splitlines() if not l.lstrip().startswith("#"))
        for bad in ("$DK restart", "$DK stop", "$DK kill", "$DK rm ", "$DK run", "setParameter", "--eval \"db.adminCommand({set", "tee ", " > /"):
            self.assertNotIn(bad, code)
        out = run()
        self.assertNotIn("MONGO_INITDB", out)


if __name__ == "__main__":
    unittest.main()
