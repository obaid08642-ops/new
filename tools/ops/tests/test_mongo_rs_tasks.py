"""tools/ops/tasks/100-mongo-rs-status.sh and 101-mongo-rs-member.sh against a fake docker/mongosh (no server)."""
import os
import re
import stat
import subprocess
import tempfile
import unittest

TASKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks")


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class Base(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup); self.t = t.name
        self.b = os.path.join(self.t, "bin"); os.makedirs(self.b)
        self.log = os.path.join(self.t, "js.log"); self.synced = os.path.join(self.t, "synced")
        self.set_sync("SECONDARY 5")
        write_exec(os.path.join(self.b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(self.b, "docker"), f'''#!/bin/bash
JS="${{@: -1}}"
echo "$JS" >> "{self.log}"
case "$JS" in
  *"s.members.find(x=>x.name"*) cat "{self.synced}";;
  *"reconfig"*) echo 1;;
  *"rs.conf().members.map"*) echo "primary:27017(votes=1)";;
  *"print(s.set"*) echo "rs0 members=1 myState=1";;
  *"rs.conf().members.filter"*) echo 1;;
  *"getReplicationInfo"*) echo "52.3 h, 900 MB used of 2048 MB";;
  *"serverStatus"*) echo "current=40 available=260";;
  *"members[0].host"*) echo "mongodb:27017";;
  *) echo "";;
esac
''')

    def set_sync(self, text):
        with open(self.synced, "w") as fh:
            fh.write(text)

    def script(self, name, **kv):
        with open(os.path.join(TASKS, name)) as fh:
            src = fh.read()
        for k, v in kv.items():
            src = re.sub(rf'^{k}=""', f'{k}="{v}"', src, count=1, flags=re.M)
        p = os.path.join(self.t, name); write_exec(p, src)
        return p

    def run_task(self, name, **kv):
        env = {**os.environ, "PATH": self.b + ":" + os.environ["PATH"], "OPS_BACKUP_DIR": self.t}
        return subprocess.run(["bash", self.script(name, **kv)], capture_output=True, text=True, env=env)

    def js(self):
        if not os.path.exists(self.log):
            return ""
        with open(self.log) as fh:
            return fh.read()


class Status(Base):
    def test_read_only_and_reports_the_numbers(self):
        r = self.run_task("100-mongo-rs-status.sh")
        self.assertEqual(r.returncode, 0, r.stderr)
        for want in ("voting members: 1", "oplog window: 52.3 h", "connections: current=40 available=260", "primary host as seen by other members"):
            self.assertIn(want, r.stdout)
        self.assertNotIn("reconfig", self.js())


class Member(Base):
    def test_dry_run_changes_nothing_and_shows_the_non_voting_add(self):
        r = self.run_task("101-mongo-rs-member.sh", DATA_HOST="10.9.0.2:27017")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("dry run only", r.stdout)
        self.assertIn("hidden:true, votes:0", r.stdout)
        self.assertFalse([l for l in self.js().splitlines() if "rs.reconfig" in l])

    def test_apply_data_adds_a_member_without_a_vote(self):
        r = self.run_task("101-mongo-rs-member.sh", APPLY="yes", DATA_HOST="10.9.0.2:27017")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        js = [l for l in self.js().splitlines() if "rs.reconfig" in l]
        self.assertEqual(len(js), 1)
        self.assertIn("priority:0, hidden:true, votes:0", js[0])
        self.assertNotIn("arbiterOnly", js[0])

    def test_vote_phase_refuses_until_the_secondary_is_synced(self):
        self.set_sync("STARTUP2 0")
        r = self.run_task("101-mongo-rs-member.sh", APPLY="yes", PHASE="vote", DATA_HOST="10.9.0.2:27017", ARB_HOST="10.9.0.3:27017")
        self.assertEqual(r.returncode, 1)
        self.assertIn("not a synced SECONDARY", r.stdout)
        self.set_sync("SECONDARY 400")
        r = self.run_task("101-mongo-rs-member.sh", APPLY="yes", PHASE="vote", DATA_HOST="10.9.0.2:27017", ARB_HOST="10.9.0.3:27017")
        self.assertEqual(r.returncode, 1)
        self.assertIn("above 30 s", r.stdout)
        self.assertFalse([l for l in self.js().splitlines() if "rs.reconfig" in l])

    def test_vote_phase_gives_the_vote_and_adds_the_arbiter_in_one_reconfig_after_setting_the_write_concern(self):
        r = self.run_task("101-mongo-rs-member.sh", APPLY="yes", PHASE="vote", DATA_HOST="10.9.0.2:27017", ARB_HOST="10.9.0.3:27017")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        js = [l for l in self.js().splitlines() if "rs.reconfig" in l]
        self.assertEqual(len(js), 1)
        self.assertLess(js[0].index("setDefaultRWConcern"), js[0].index("rs.reconfig"))
        self.assertIn("d.votes=1", js[0])
        self.assertIn("arbiterOnly:true", js[0])

    def test_refuses_shell_metacharacters_and_a_missing_host(self):
        self.assertEqual(self.run_task("101-mongo-rs-member.sh", DATA_HOST="a:1'; db.dropDatabase() //").returncode, 1)
        self.assertEqual(self.run_task("101-mongo-rs-member.sh").returncode, 1)
        self.assertNotIn("dropDatabase", self.js())

    def test_rollback_removes_only_the_two_members(self):
        r = self.run_task("101-mongo-rs-member.sh", ROLLBACK="yes", DATA_HOST="10.9.0.2:27017", ARB_HOST="10.9.0.3:27017")
        self.assertEqual(r.returncode, 0, r.stdout)
        removed = [l for l in self.js().splitlines() if l.startswith("rs.remove")]
        self.assertEqual(removed, ["rs.remove('10.9.0.3:27017')", "rs.remove('10.9.0.2:27017')"])


if __name__ == "__main__":
    unittest.main()
