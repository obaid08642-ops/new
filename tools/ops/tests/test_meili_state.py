"""98d-meili-state.sh and 98e-build-contexts.sh against fake docker / sudo: read-only by default, guarded writes, no key printed."""
import os
import stat
import subprocess
import tempfile
import unittest

T = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks")
STATE = "db size=1370MB used=300MB\nindex http=200 documents=41000 isIndexing=true\ntasks enqueued=12\nopen task type=documentAdditionOrUpdate status=processing age_min=45"


def wx(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class Base(unittest.TestCase):
    def run_task(self, name, env=None, wanted="41000", fs=None):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        calls = os.path.join(d, "calls.log"); open(calls, "w").close()
        for rel, text in (fs or {}).items():
            p = os.path.join(d, "root", rel); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w").write(text)
        wx(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        wx(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$1 $2 $3 ${{@: -1}}" >> "{calls}"
case "$1" in
  inspect) case "$*" in *Config.Env*) printf 'MEILI_MAX_INDEXING_MEMORY=128Mb\\nMEILI_MAX_INDEXING_THREADS=1\\n';; *RestartCount*) echo 782;; *OOMKilled*) echo true;; *HostConfig.Memory}}*) echo 671088640;; *Mounts*) echo "{d}/vol";; *) echo x;; esac;;
  stats) echo "621MiB / 640MiB";;
  logs) printf 'meilisearch holds 0 of 41000 documents\\nmeilisearch sync done\\n';;
  exec) case "$2" in nabdah-backend) case "${{@: -1}}" in cancel) echo "cancel http=202 task=9";; reset) echo "reset http=202 task=10";; *) printf '{STATE}\\n';; esac;; *) echo {wanted};; esac;;
esac
''')
        os.makedirs(os.path.join(d, "vol"), exist_ok=True)
        e = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_ROOT=os.path.join(d, "root"), **(env or {}))
        p = subprocess.run(["bash", os.path.join(T, name)], env=e, capture_output=True, text=True, timeout=60)
        return p, open(calls).read()


class MeiliState(Base):
    def test_reports_restarts_documents_and_tasks_without_the_key(self):
        p, calls = self.run_task("98d-meili-state.sh", env={"MEILI_MASTER_KEY": "do-not-print-me"})
        self.assertEqual(p.returncode, 0, p.stderr)
        for s in ("restarts=782", "MEILI_MAX_INDEXING_MEMORY=128Mb", "oom_killed=true", "documents=41000 isIndexing=true", "tasks enqueued=12", "mongo search_index documents: 41000", "boot syncs logged in the last 24 h: started=2"):
            self.assertIn(s, p.stdout)
        self.assertNotIn("do-not-print-me", p.stdout + p.stderr)
        self.assertNotIn("cancel\n", calls); self.assertNotIn("reset\n", calls)

    def test_cancel_and_reset_are_dry_runs_without_apply(self):
        p, calls = self.run_task("98d-meili-state.sh", env={"CANCEL": "yes", "RESET": "yes"})
        self.assertIn("dry run: would cancel", p.stdout); self.assertIn("dry run: would delete index nabd_search", p.stdout)
        self.assertNotIn("cancel\n", calls); self.assertNotIn("reset\n", calls)

    def test_apply_cancels_and_resets(self):
        p, calls = self.run_task("98d-meili-state.sh", env={"CANCEL": "yes", "RESET": "yes", "APPLY": "yes"})
        self.assertIn("CANCEL: cancel http=202", p.stdout); self.assertIn("RESET: reset http=202", p.stdout)

    def test_reset_refused_when_mongo_has_nothing_to_rebuild_from(self):
        p, calls = self.run_task("98d-meili-state.sh", env={"RESET": "yes", "APPLY": "yes"}, wanted="0")
        self.assertIn("RESET refused", p.stdout); self.assertNotIn("reset http", p.stdout)


class BuildContexts(Base):
    FS = {"nabdah-backend/node_modules/x": "x", "nabdah-backend/.dockerignore": "node_modules\n.git\n", "Napd-admin/node_modules/y": "y"}

    def test_dry_run_removes_nothing_and_skips_a_context_without_the_ignore_line(self):
        p, _ = self.run_task("98e-build-contexts.sh", fs=self.FS)
        self.assertIn("nabdah-backend: node_modules=", p.stdout); self.assertIn("dockerignore_excludes_it=yes", p.stdout)
        self.assertIn("dry run: would remove", p.stdout); self.assertIn("Napd-admin: kept", p.stdout)

    def test_apply_removes_only_the_excluded_one(self):
        p, _ = self.run_task("98e-build-contexts.sh", env={"APPLY": "yes"}, fs=self.FS)
        self.assertIn("removed node_modules", p.stdout); self.assertIn("Napd-admin: kept", p.stdout)


if __name__ == "__main__":
    unittest.main()
