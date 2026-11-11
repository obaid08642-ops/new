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


def run_env(env_file_text):
    d = tempfile.mkdtemp()
    os.mkdir(os.path.join(d, "bin"))
    docker = "#!/bin/bash\necho \"$*\" >> \"%s/calls\"\ncase \"$*\" in *explain*) echo 'index x';; *) printf 'idx _id_\\n';; esac\n" % d
    for name, body in (("docker", docker), ("sudo", FAKE_SUDO)):
        p = os.path.join(d, "bin", name)
        with open(p, "w") as f: f.write(body)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR)
    dep = os.path.join(d, "deploy")
    os.mkdir(dep)
    if env_file_text is not None:
        with open(os.path.join(dep, ".env.production"), "w") as f: f.write(env_file_text)
    env = dict(os.environ, PATH=os.path.join(d, "bin") + ":" + os.environ["PATH"], OPS_DEPLOY_DIR=dep)
    env.pop("OPS_MONGO_DB", None)
    r = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=60)
    return r, open(os.path.join(d, "calls")).read()


class MedicineIndexes(unittest.TestCase):
    def test_database_comes_from_env_file(self):
        r, calls = run_env("X=1\nDB_NAME=live_db\nY=2\n")
        self.assertIn("status: medicine-indexes: database: live_db", r.stdout)
        self.assertIn("live_db", calls)
        self.assertNotIn(" nabd ", calls)

    def test_database_defaults_to_nabd_nestjs(self):
        r, calls = run_env(None)
        self.assertIn("database: nabd_nestjs", r.stdout)
        self.assertIn("nabd_nestjs", calls)

    def test_explain_uses_the_real_public_filter(self):
        _, calls = run_env("DB_NAME=live_db\n")
        self.assertIn("is_deleted:{$ne:true}", calls)
        self.assertIn("manufacturer:{$ne:null}", calls)

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
