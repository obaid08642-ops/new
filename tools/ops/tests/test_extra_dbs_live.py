"""99x-extra-dbs.sh against a REAL mongod and mongosh (not the fake): the exact scripts the task sends to mongosh, through the task's own docker calls forwarded to the real shell.
Skipped unless both programs are given, so CI does not need them:
    MONGOD_BIN=/path/to/mongod MONGOSH_BIN=/path/to/mongosh python3 -m unittest tools/ops/tests/test_extra_dbs_live.py
(backend/node_modules/.cache/mongodb-memory-server/ has a mongod; `npm i mongosh` in a scratch directory gives mongosh.)
Why it exists: run 91 printed "mongosh printed nothing" in production while the script itself is fine; this proves the script and the output handling against the real shell."""
import os
import shutil
import socket
import stat
import subprocess
import tempfile
import time
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "99x-extra-dbs.sh")
MONGOD, MONGOSH = os.environ.get("MONGOD_BIN", ""), os.environ.get("MONGOSH_BIN", "")


def wx(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


@unittest.skipUnless(MONGOD and MONGOSH and os.path.exists(MONGOD) and os.path.exists(MONGOSH), "MONGOD_BIN and MONGOSH_BIN not set")
class ExtraDbsLive(unittest.TestCase):
    def test_the_listing_reads_real_databases_collections_a_view_and_a_bigger_collection(self):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]
        os.makedirs(os.path.join(d, "db"))
        proc = subprocess.Popen([MONGOD, "--dbpath", os.path.join(d, "db"), "--port", str(port), "--bind_ip", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(proc.wait); self.addCleanup(proc.terminate)
        for _ in range(60):
            if subprocess.run([MONGOSH, "--quiet", "--port", str(port), "--eval", "1"], capture_output=True).returncode == 0:
                break
            time.sleep(1)
        else:
            self.fail("mongod did not start")
        seed = ("const a=db.getSiblingDB('nabd_nestjs');a.users.insertOne({createdAt:new Date('2026-10-31')});"
                "const s=db.getSiblingDB('nabd_staging');s.users.insertMany([{createdAt:new Date('2026-08-01')},{updatedAt:new Date('2026-08-03')}]);"
                "s.createCollection('v',{viewOn:'users',pipeline:[]});const big=[];for(let i=0;i<20000;i++)big.push({i:i,p:'x'.repeat(200)});s.big.insertMany(big);"
                "db.getSiblingDB('temp_restore').orders.insertOne({created_at:'2026-05-05'});")
        subprocess.run([MONGOSH, "--quiet", "--port", str(port), "--eval", seed], check=True, capture_output=True)
        b = os.path.join(d, "bin"); os.makedirs(b)
        wx(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        wx(os.path.join(b, "docker"), f'''#!/bin/bash
case "$*" in
  "ps --format"*) printf 'nabdah-backend\\n';;
  "run "*) args=("$@"); exec "{MONGOSH}" --quiet --port {port} --eval "${{args[$((${{#args[@]}}-1))]}}";;
  *inspect*Config.Env*) printf 'DB_NAME=nabd_nestjs\\n';;
  *Config.Image*) echo mongo:7;;
  *IPAddress*) echo 127.0.0.1;;
  *NetworkSettings.Networks*) echo nabdah_default;;
  *"printenv DB_NAME"*) echo nabd_nestjs;;
  *printenv*) echo x;;
  *) echo '{{}}';;
esac
''')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_DEPLOY_DIR=os.path.join(d, "deploy"), OPS_BACKUP_DIR=os.path.join(d, "backups"))
        p = subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=120, stdin=subprocess.DEVNULL)
        o = p.stdout
        self.assertEqual(p.returncode, 0, o + p.stderr)
        self.assertNotIn("ABORT", o)
        self.assertIn("nabd_staging: newest document date in any collection: 2026-08-03", o)
        self.assertIn("nabd_staging: 0 MB, 3 collection(s), 20004 document(s)", o)                      # users 2 + the view v 2 + big 20000
        self.assertIn("nabd_staging.big: 20000 docs", o)
        self.assertIn("nabd_staging.users: 2 docs, 0 MB, newest 2026-08-03; same collection in nabd_nestjs: 1 docs, newest 2026-10-31", o)
        self.assertIn("temp_restore.orders: 1 docs, 0 MB, newest 2026-05-05", o)                        # a string date is read too
        self.assertIn("dry run (read-only)", o)


if __name__ == "__main__":
    unittest.main()
