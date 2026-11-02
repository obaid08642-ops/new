"""99x-extra-dbs.sh with a fake docker/sudo and stub dump helpers: read-only by default; a named database is dropped only after a verified dump; the app database and the system databases never."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "99x-extra-dbs.sh")
ALL = ('{"nabd_nestjs":{"mb":601,"c":{"users":{"n":900,"newest":"2026-10-31","mb":5},"orders":{"n":50,"newest":"2026-10-30","mb":2}}},'
       '"nabd_staging":{"mb":259,"c":{"users":{"n":120,"newest":"2026-08-01","mb":3},"old_only":{"n":7,"newest":"2026-05-05","mb":1}}},'
       '"temp_restore":{"mb":210,"c":{"orders":{"n":49,"newest":"2026-10-29","mb":2}}}}')


def wx(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class ExtraDbs(unittest.TestCase):
    def run_task(self, env=None, apply=False, listed=2, cenv="MONGO_URL=mongodb://root:topsecret@mongodb:27017/?authSource=admin"):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b); self.bk = os.path.join(d, "backups"); os.makedirs(self.bk)
        dep = os.path.join(d, "deploy"); os.makedirs(os.path.join(dep, "scripts"))
        wx(os.path.join(dep, "scripts", "_mongodump-oneoff.sh"), 'mongodump_oneoff() { echo "args: $*" >> "%s/calls.log"; truncate -s "${STUB_DUMP_BYTES:-20000000}" "$1"; return 0; }\n' % d)
        wx(os.path.join(dep, "scripts", "_mongorestore-list.sh"), 'mongorestore_list_oneoff() { echo "status: mongorestore: archive lists %d namespace(s) (dry run, rc=0)"; return 0; }\n' % listed)
        wx(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        wx(os.path.join(b, "gzip"), '#!/bin/bash\nexit 0\n')
        self.calls = os.path.join(d, "calls.log"); open(self.calls, "w").close()
        wx(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{self.calls}"
case "$*" in
  "ps --format"*) printf 'nabdah-backend\\nnabdah-fastapi\\n';;
  *inspect*Config.Env*) case "$*" in *nabdah-backend*) printf 'DB_NAME=nabd_nestjs\\nMONGO_URL=mongodb://root:topsecret@mongodb:27017/nabd_nestjs?authSource=admin\\nSOMETHING=else\\n';; *) printf '%s\\n' "{cenv}";; esac;;
  *"printenv DB_NAME"*) echo nabd_nestjs;;
  *printenv*) echo x;;
  *dropDatabase*) echo '{{"ok":1}}';;
  *) echo '{ALL}';;
esac
''')
        e = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_DEPLOY_DIR=dep, OPS_BACKUP_DIR=self.bk, **(env or {}))
        if apply:
            e["APPLY"] = "yes"
            e.setdefault("DROP", "yes")
        p = subprocess.run(["bash", TASK], env=e, capture_output=True, text=True, timeout=60, stdin=subprocess.DEVNULL)
        with open(self.calls) as h:
            return p, h.read()

    def test_dry_run_lists_each_extra_database_and_compares_with_the_app_database(self):
        p, calls = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        o = p.stdout
        self.assertIn("app database: nabd_nestjs (never touched", o)
        self.assertIn("nabd_staging: 259 MB, 2 collection(s), 127 document(s)", o)
        self.assertIn("nabd_staging.users: 120 docs, 3 MB, newest 2026-08-01; same collection in nabd_nestjs: 900 docs, newest 2026-10-31", o)
        self.assertIn("nabd_staging.old_only: 7 docs, 1 MB, newest 2026-05-05; same collection in nabd_nestjs: absent", o)
        self.assertIn("temp_restore.orders: 49 docs", o); self.assertNotIn("nabd_nestjs.users:", o)
        self.assertIn("dry run (read-only)", o); self.assertNotIn("dropDatabase", calls)

    def test_apply_dumps_verifies_then_drops_only_the_named_databases(self):
        p, calls = self.run_task({"DROP_DBS": "nabd_staging temp_restore"}, apply=True)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("nabd_staging: DROPPED", p.stdout); self.assertIn("temp_restore: DROPPED", p.stdout)
        self.assertEqual(len([f for f in os.listdir(self.bk) if f.startswith("extra-db-")]), 2)
        self.assertIn("--db=nabd_staging", calls); self.assertLess(calls.index("--db=nabd_staging"), calls.index("dropDatabase"))
        self.assertNotIn("getSiblingDB('nabd_nestjs').dropDatabase", calls)

    def test_containers_are_proven_not_to_use_the_extra_databases_and_no_uri_is_printed(self):
        p, _ = self.run_task()
        o = p.stdout
        self.assertIn("container nabdah-backend uses database(s): nabd_nestjs", o)
        self.assertIn("nabd_staging: used by running containers: none", o); self.assertIn("temp_restore: used by running containers: none", o)
        self.assertIn("nabd_staging: newest document date in any collection: 2026-08-01", o)
        self.assertNotIn("topsecret", o + p.stderr); self.assertNotIn("mongodb://", o)

    def test_a_database_that_a_running_container_uses_is_refused_even_when_named(self):
        p, calls = self.run_task({"DROP_DBS": "temp_restore"}, apply=True, cenv="MONGO_URL=mongodb://root:topsecret@mongodb:27017/temp_restore?authSource=admin")
        self.assertIn("container nabdah-fastapi uses database(s): temp_restore", p.stdout)
        self.assertIn("temp_restore: REFUSED (running container(s) use it: nabdah-fastapi", p.stdout)
        self.assertNotIn("dropDatabase", calls); self.assertEqual(os.listdir(self.bk), []); self.assertNotIn("topsecret", p.stdout)

    def test_the_app_database_system_databases_and_unknown_names_are_refused(self):
        p, calls = self.run_task({"DROP_DBS": "nabd_nestjs admin local config nope"}, apply=True)
        self.assertEqual(p.returncode, 1)
        for s in ("nabd_nestjs: REFUSED (this is the app database)", "admin: REFUSED", "local: REFUSED", "config: REFUSED", "nope: REFUSED (no such database"):
            self.assertIn(s, p.stdout)
        self.assertNotIn("dropDatabase", calls); self.assertEqual(os.listdir(self.bk), [])

    def test_a_short_archive_listing_keeps_the_database(self):
        p, calls = self.run_task({"DROP_DBS": "nabd_staging"}, apply=True, listed=1)
        self.assertIn("ABORT the archive lists 1 of 2 collection(s): not dropped", p.stdout); self.assertNotIn("dropDatabase", calls)

    def test_drop_without_apply_changes_nothing(self):
        p, calls = self.run_task({"DROP_DBS": "nabd_staging", "DROP": "yes"})
        self.assertIn("dry run: would dump, verify and drop: nabd_staging", p.stdout); self.assertNotIn("dropDatabase", calls); self.assertEqual(os.listdir(self.bk), [])

    def test_apply_alone_without_drop_yes_is_still_a_dry_run(self):
        p, calls = self.run_task({"APPLY": "yes"})
        self.assertIn("dry run (read-only)", p.stdout); self.assertNotIn("dropDatabase", calls); self.assertEqual(os.listdir(self.bk), [])

    def test_the_default_names_are_the_two_extra_databases(self):
        p, calls = self.run_task(apply=True)
        self.assertIn("nabd_staging: DROPPED", p.stdout); self.assertIn("temp_restore: DROPPED", p.stdout)
        self.assertNotIn("getSiblingDB('nabd_nestjs').dropDatabase", calls)

    def test_a_far_too_small_archive_is_refused_and_kept_and_nothing_is_dropped(self):
        p, calls = self.run_task({"STUB_DUMP_BYTES": "1000000"}, apply=True)   # 1 MB for 259 MB and 210 MB databases
        self.assertEqual(p.returncode, 1)
        self.assertIn("nabd_staging: ABORT size guard: the archive is 1 MB, under 5% of the database's 259 MB: not dropped", p.stdout)
        self.assertIn("temp_restore: ABORT size guard", p.stdout)
        self.assertNotIn("dropDatabase", calls)
        self.assertEqual(len([f for f in os.listdir(self.bk) if f.startswith("extra-db-")]), 2)   # the archives are kept


if __name__ == "__main__":
    unittest.main()
