"""99x-extra-dbs.sh with a fake docker/sudo and stub dump helpers: read-only by default; a named database is dropped only after a verified dump; the app database and the system databases never."""
import json
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
    def run_task(self, env=None, apply=False, listed=2, cenv="MONGO_URL=mongodb://root:topsecret@mongodb:27017/?authSource=admin", all_json=None):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b); self.bk = os.path.join(d, "backups"); os.makedirs(self.bk)
        dep = os.path.join(d, "deploy"); os.makedirs(os.path.join(dep, "scripts"))
        wx(os.path.join(dep, "scripts", "_mongodump-oneoff.sh"), 'mongodump_oneoff() { echo "args: $*" >> "%s/calls.log"; truncate -s "${STUB_DUMP_BYTES:-20000000}" "$1"; return 0; }\n' % d)
        wx(os.path.join(dep, "scripts", "_mongorestore-list.sh"), 'mongorestore_list_oneoff() { echo "status: mongorestore: archive lists %d namespace(s) (dry run, rc=0)"; return 0; }\n' % listed)
        wx(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        wx(os.path.join(b, "gzip"), '#!/bin/bash\nexit 0\n')
        self.calls = os.path.join(d, "calls.log"); open(self.calls, "w").close()
        self.d = d
        data = json.loads(all_json or ALL)
        with open(os.path.join(d, "list.json"), "w") as f:
            json.dump([{"name": n, "mb": v["mb"]} for n, v in [("admin", {"mb": 0}), ("local", {"mb": 0}), ("config", {"mb": 0})] + list(data.items())], f)
        for n, v in data.items():
            with open(os.path.join(d, "db_%s.json" % n), "w") as f:
                json.dump(v["c"], f)
        wx(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{self.calls}"
D="{d}"
case "$*" in
  "ps --format"*) printf 'nabdah-backend\\nnabdah-fastapi\\n';;
  "run "*)
    ef=$(echo "$*" | sed -n 's/.*--env-file \\([^ ]*\\).*/\\1/p'); [ -f "$ef" ] && {{ stat -c %a "$ef" > "$D/envfile.mode"; cp "$ef" "$D/envfile.copy"; }}
    case "$*" in
      *listDatabases*) [ -n "${{FAKE_LIST_RC:-}}" ] && {{ printf '%s' "${{FAKE_LIST_OUT-}}"; exit "$FAKE_LIST_RC"; }}
                       if [ -n "${{FAKE_LIST_OUT+x}}" ]; then printf '%s\\n' "$FAKE_LIST_OUT"; else cat "$D/list.json"; fi;;
      *) for f in "$D"/db_*.json; do n=${{f##*/db_}}; n=${{n%.json}}
           case "$*" in *"getSiblingDB('$n')"*)
             [ "${{FAKE_FAIL_DB:-}}" = "$n" ] && exit 137
             cat "$f"; break;; esac
         done;;
    esac;;
  *inspect*Config.Env*) case "$*" in *nabdah-backend*) printf 'DB_NAME=nabd_nestjs\\nMONGO_URL=mongodb://root:topsecret@mongodb:27017/nabd_nestjs?authSource=admin\\nSOMETHING=else\\n';; *) printf '%s\\n' "{cenv}";; esac;;
  *Config.Image*) echo mongo:7;;
  *IPAddress*) echo 172.18.0.2;;
  *NetworkSettings.Networks*) echo nabdah_default;;
  *"printenv DB_NAME"*) echo nabd_nestjs;;
  *"printenv MONGO_INITDB_ROOT_PASSWORD"*) echo s3cr3t-pw;;
  *printenv*) echo x;;
  *dropDatabase*) echo '{{"ok":1}}';;
  *) echo '{{}}';;
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

    # --- the database listing (run 89 and run 91: "ABORT the database list is unreadable"; the script itself runs fine against a real mongod + mongosh)
    def test_the_listing_runs_in_a_one_off_container_not_inside_mongod_with_dollar_operators_intact(self):
        p, calls = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        runs = [l for l in calls.splitlines() if l.startswith("run ")]
        self.assertEqual(len(runs), 4)                                   # the names, then one call per database (3)
        for l in runs:
            for flag in ("--rm", "--memory 300m", "--memory-swap 300m", "--oom-score-adj 1000", "--network nabdah_default", "--entrypoint sh mongo:7"):
                self.assertIn(flag, l)
        self.assertNotIn("exec nabdah-mongodb sh -c mongosh", calls)     # nothing is started inside the mongod container for the listing
        self.assertIn("listDatabases", calls)
        self.assertIn("$group", calls); self.assertIn("$max:'$updatedAt'", calls)     # not expanded by the shell
        self.assertIn("print(JSON.stringify(cs))", calls); self.assertIn("allowDiskUse:true", calls)

    def test_the_credentials_reach_the_container_in_a_mode_600_env_file_never_on_a_command_line_or_in_the_output(self):
        p, calls = self.run_task()
        self.assertNotIn("s3cr3t-pw", calls + p.stdout + p.stderr)
        with open(os.path.join(self.d, "envfile.mode")) as f:
            self.assertEqual(f.read().strip(), "600")
        with open(os.path.join(self.d, "envfile.copy")) as f:
            text = f.read()
        self.assertIn("MONGO_PASS=s3cr3t-pw", text); self.assertIn("MONGO_HOST=172.18.0.2", text)

    def test_warning_and_prompt_lines_around_the_json_are_ignored(self):
        names = json.dumps([{"name": "nabd_nestjs", "mb": 601}, {"name": "nabd_staging", "mb": 259}])
        p, _ = self.run_task({"FAKE_LIST_OUT": "Warning: a newer version is available\n" + names + "\nmongosh done"})
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("nabd_staging: 259 MB, 2 collection(s), 127 document(s)", p.stdout)

    def test_a_collection_that_could_not_be_read_is_marked_and_does_not_stop_the_listing(self):
        data = {"nabd_nestjs": {"mb": 601, "c": {"users": {"n": 900, "newest": "2026-10-31", "mb": 5}}},
                "nabd_staging": {"mb": 259, "c": {"a_view": {"n": 0, "newest": None, "mb": 0, "err": " stats"}, "users": {"n": 120, "newest": "2026-08-01", "mb": 3}}}}
        p, _ = self.run_task(all_json=json.dumps(data))
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("nabd_staging.a_view: 0 docs, 0 MB, newest none", p.stdout)
        self.assertIn("nabd_staging: newest document date in any collection: 2026-08-01", p.stdout)

    def test_a_killed_listing_says_the_exit_code_and_what_it_usually_means(self):
        p, calls = self.run_task({"FAKE_LIST_OUT": "", "FAKE_LIST_RC": "137"}, apply=True)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT the database list is unreadable: exit code 137 (killed, usually out of memory): mongosh printed nothing", p.stdout)
        self.assertNotIn("dropDatabase", calls); self.assertEqual(os.listdir(self.bk), [])

    def test_a_mongosh_error_is_reported_as_the_reason_without_a_uri_or_a_secret(self):
        out = "MongoServerError: Authentication failed. (mongodb://root:s3cr3t-pw@mongodb:27017/?authSource=admin)"
        p, calls = self.run_task({"FAKE_LIST_OUT": out, "FAKE_LIST_RC": "1"}, apply=True)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT the database list is unreadable: exit code 1: MongoServerError: Authentication failed. (<uri>", p.stdout)   # the cut is greedy on purpose: it never leaves part of a password
        self.assertNotIn("s3cr3t-pw", p.stdout + p.stderr); self.assertNotIn("dropDatabase", calls); self.assertEqual(os.listdir(self.bk), [])

    def test_an_empty_answer_with_exit_zero_says_so(self):
        p, _ = self.run_task({"FAKE_LIST_OUT": ""})
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT the database list is unreadable: exit code 0: mongosh printed nothing", p.stdout)

    def test_one_database_that_cannot_be_listed_is_reported_kept_and_never_dropped_while_the_others_go_on(self):
        p, calls = self.run_task({"FAKE_FAIL_DB": "temp_restore", "DROP_DBS": "temp_restore nabd_staging"}, apply=True)
        self.assertIn("temp_restore: listing FAILED: exit code 137 (killed, usually out of memory): mongosh printed nothing; it is never dropped", p.stdout)
        self.assertIn("temp_restore: its collections could not be listed (see above): no comparison, and it cannot be dropped", p.stdout)
        self.assertIn("nabd_staging: 259 MB, 2 collection(s), 127 document(s)", p.stdout)                 # the other database is still listed
        self.assertIn("temp_restore: REFUSED (its collections could not be listed", p.stdout)
        self.assertIn("nabd_staging: DROPPED", p.stdout)
        self.assertNotIn("--db=temp_restore", calls)                                                      # no dump, no drop of the one that could not be read
        self.assertEqual(p.returncode, 1)

if __name__ == "__main__":
    unittest.main()
