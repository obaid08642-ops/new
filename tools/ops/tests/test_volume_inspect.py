"""98g-volume-inspect.sh against fake docker / sudo: read-only dry run, names/counts/dates only, the removal only after a verified dump and only when no container uses the volume."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "98g-volume-inspect.sh")
SEC = '{"nabd.users":{"n":120,"newest":"2026-09-01"},"nabd.old_logs":{"n":9000,"newest":"2026-03-02"},"nabd.only_here":{"n":5,"newest":"2026-02-01"},"nabd.empty_here":{"n":0,"newest":null}}'
LIVE = '{"nabd.users":{"n":130,"newest":"2026-10-31"},"nabd.old_logs":{"n":8000,"newest":"2026-10-30"},"nabd.empty_here":{"n":0,"newest":null}}'


def wx(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class VolumeInspect(unittest.TestCase):
    def run_task(self, apply=False, users="", dump=b"GZDATA", listed=4):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b); bk = os.path.join(d, "backups"); os.makedirs(bk)
        self.calls = os.path.join(d, "calls.log"); open(self.calls, "w").close()
        self.bk = bk
        text = open(TASK).read()
        if apply:
            text = re.sub(r'(?m)^APPLY=""$', 'APPLY="yes"', text)
        script = os.path.join(d, "task.sh"); open(script, "w").write(text)
        wx(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        wx(os.path.join(b, "gzip"), '#!/bin/bash\nexit 0\n')
        wx(os.path.join(b, "du"), "#!/bin/bash\nprintf '931840\\t%s\\n' \"$2\"\n")
        lines = "\\n".join(f"found collection nabd.c{i} bson to restore to nabd.c{i}" for i in range(listed))
        wx(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{self.calls}"
case "$1" in
  volume) case "$2" in inspect) case "$*" in *Mountpoint*) echo /var/lib/docker/volumes/x/_data;; esac;; rm) ;; esac;;
  ps) echo "{users}";;
  inspect) case "$*" in *Config.Image*) echo mongo:7.0;; *) echo "running oom_killed=false";; esac;;
  run) echo cid;;
  rm) ;;
  exec) case "$*" in
    *ping*) echo 1;;
    *"nabdah-mongodb"*) echo '{LIVE}';;
    *mongodump*) printf '{dump.decode()}';;
    *mongorestore*) printf '{lines}\\n';;
    *) echo '{SEC}';;
  esac;;
esac
''')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_BACKUP_DIR=bk, PS4="")
        p = subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=60, stdin=subprocess.DEVNULL)
        return p, open(self.calls).read()

    def test_dry_run_lists_names_counts_dates_compares_with_live_and_changes_nothing(self):
        p, calls = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        out = p.stdout
        self.assertIn("the volume holds 4 collection(s), 9125 document(s)", out)
        self.assertRegex(out, r"newest file modified: unknown; containers that mount it \(running or stopped\): +\n")
        self.assertIn("nabd.only_here: volume=5 newest=2026-02-01 live=? newest=none -> NOT IN THE LIVE DATABASE", out)
        self.assertIn("nabd.users: volume=120 newest=2026-09-01 live=130 newest=2026-10-31 -> same-or-fewer", out)
        self.assertIn("nabd.old_logs: volume=9000 newest=2026-03-02 live=8000 newest=2026-10-30 -> MORE THAN LIVE", out)
        self.assertIn("summary: 1 non-empty collection(s) missing from the live database, 1 collection(s) with more documents than live", out)
        self.assertIn("dry run (read-only)", out)
        self.assertRegex(calls, r"run -d --name nabd-volinspect-\d+ --network none --memory 400m --memory-swap 400m --oom-score-adj 1000 -v mongodb_secondary_data:/data/db:ro mongo:7.0 mongod --queryableBackupMode --wiredTigerCacheSizeGB 0.25")
        self.assertNotIn("volume rm", calls); self.assertNotIn(" -p ", calls.replace("-p \"$", ""))
        self.assertEqual(os.listdir(self.bk), [])
        self.assertRegex(calls, r"rm -f nabd-volinspect-\d+")                                       # the throwaway is always removed

    def test_apply_dumps_verifies_then_removes_only_this_volume(self):
        p, calls = self.run_task(apply=True)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("APPLIED: volume mongodb_secondary_data removed", p.stdout)
        self.assertIn("lists 4 collection(s) (counted 4)", p.stdout)
        arch = [f for f in os.listdir(self.bk) if f.startswith("mongodb_secondary_data-") and f.endswith(".archive.gz")]
        self.assertEqual(len(arch), 1)
        self.assertLess(calls.index("mongodump"), calls.index("volume rm mongodb_secondary_data"))   # the dump comes first
        self.assertEqual(calls.count("volume rm"), 1)

    def test_apply_refuses_when_a_container_uses_the_volume(self):
        p, calls = self.run_task(apply=True, users="nabdah-mongodb-secondary")
        self.assertIn("ABORT container(s) still use the volume: nabdah-mongodb-secondary", p.stdout)
        self.assertNotIn("volume rm", calls); self.assertEqual(os.listdir(self.bk), [])

    def test_apply_keeps_the_volume_when_the_archive_lists_fewer_collections(self):
        p, calls = self.run_task(apply=True, listed=2)
        self.assertIn("ABORT the archive lists 2 collection(s), 4 were counted: nothing removed", p.stdout)
        self.assertNotIn("volume rm", calls)

    def test_apply_keeps_the_volume_when_the_dump_is_empty(self):
        p, calls = self.run_task(apply=True, dump=b"")
        self.assertIn("ABORT the dump is empty: nothing removed", p.stdout)
        self.assertNotIn("volume rm", calls)


if __name__ == "__main__":
    unittest.main()
