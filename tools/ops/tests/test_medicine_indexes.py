"""tools/ops/tasks/96p-medicine-indexes.sh against a fake docker: reports present/missing indexes and the plan, read-only."""
import os
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96p-medicine-indexes.sh")
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'


def run(indexes, plan="index public_manufacturer_covering_v1"):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    docker = "#!/bin/bash\necho \"$*\" >> \"%s/calls\"\ncase \"$*\" in *explain*) echo '%s';; *) printf 'idx %%s\\n' %s;; esac\n" % (d, plan, " ".join(indexes))
    for name, body in (("docker", docker), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"])
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r, open(os.path.join(d, "calls")).read()


class MedicineIndexes(unittest.TestCase):
    def test_both_present(self):
        r, _ = run(["_id_", "public_manufacturer_covering_v1", "public_form_covering_v1"])
        self.assertEqual(r.returncode, 0)
        self.assertIn("public_manufacturer_covering_v1: present", r.stdout)
        self.assertIn("public_form_covering_v1: present", r.stdout)
        self.assertIn("indexes on medicines: 3", r.stdout)
        self.assertIn("plan: index public_manufacturer_covering_v1", r.stdout)

    def test_missing_is_reported(self):
        r, _ = run(["_id_"], plan="collection-scan ")
        self.assertIn("public_form_covering_v1: MISSING", r.stdout)
        self.assertIn("collection-scan", r.stdout)

    def test_read_only(self):
        _, calls = run(["_id_"])
        for w in (".insert", ".update", ".drop", ".createIndex", ".delete", ".remove", ".save", "dropIndex"):
            self.assertNotIn(w, calls)


if __name__ == "__main__":
    unittest.main()
