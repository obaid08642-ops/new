"""tools/ops/tasks/96v-index-usage.sh against a fake docker: read-only, names and counters only, the old public_* indexes are tagged as drop candidates."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96v-index-usage.sh")

FAKE_DOCKER = r"""#!/bin/bash
echo "$*" >> "$FAKE_LOG"
printf 'IDX name=public_price_desc ops=0 since=2026-11-16T16:15:00.000Z size_mb=3.1\nIDX name=public_live_price_desc_v2 ops=5400 since=2026-11-16T16:15:00.000Z size_mb=4.2\nIDX name=id_1 ops=90210 since=2026-11-16T16:15:00.000Z size_mb=1.5\nTOT indexes=3 total_index_mb=9\n'
"""
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run():
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    for name, body in (("docker", FAKE_DOCKER), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        open(p, "w").write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
    log = os.path.join(d, "log")
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"], FAKE_LOG=log)
    out = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60).stdout
    return out, open(log).read()


class IndexUsageTask(unittest.TestCase):
    def test_prints_names_and_counters_and_tags_the_old_indexes(self):
        out, _ = run()
        self.assertIn("status: index-usage: name=public_price_desc ops=0", out)
        self.assertIn("[OLD: replaced by the *_v2 index", out)
        self.assertNotIn("public_live_price_desc_v2 ops=5400 since=2026-11-16T16:15:00.000Z size_mb=4.2 [OLD", out)
        self.assertIn("indexes=3 total_index_mb=9", out)
        self.assertTrue(out.rstrip().endswith("done (read-only; nothing was dropped)"))

    def test_the_script_only_reads(self):
        src = open(TASK).read()
        for bad in ("dropIndex", "createIndex", "deleteMany", "updateMany", "insertMany", "remove(", "{$out", "{$merge", "$out:", "$merge:"):
            self.assertNotIn(bad, src)
        self.assertIn("$indexStats", src)


if __name__ == "__main__":
    unittest.main()
