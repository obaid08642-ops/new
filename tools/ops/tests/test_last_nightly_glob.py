"""Run 130 printed "last nightly 0 MB". The nightly dump is encrypted (backup.sh, 16.9), so its file is nabd_<db>_<ts>.gz.gpg; the recreate / dump-check tasks looked
only for nabd_*.gz, found nothing, and the "at least half of the last nightly" size guard compared against 0 (a guard that cannot fail). This runs the exact
`ls -t` line of each task against a directory that holds only encrypted nightlies and requires that the newest one is found."""
import os, re, subprocess, tempfile, time, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TASKS = ["92-recreate-datastores.sh", "94-mongo-recreate.sh", "96-mongodump-check.sh"]


class LastNightlyGlob(unittest.TestCase):
    def line(self, name):
        text = open(os.path.join(ROOT, "tools", "ops", "tasks", name)).read()
        m = re.search(r'sudo -n sh -c "(ls -t [^"]*nabd_[^"]*)"', text)
        self.assertIsNotNone(m, f"{name}: no `ls -t ... nabd_` line for the last nightly")
        return m.group(1)

    def test_each_task_finds_an_encrypted_nightly(self):
        for name in TASKS:
            with tempfile.TemporaryDirectory() as d:
                old, new = os.path.join(d, "nabd_db_1.gz.gpg"), os.path.join(d, "nabd_db_2.gz.gpg")
                for p, age in ((old, 3000), (new, 10)):
                    open(p, "wb").write(b"x" * 10)
                    os.utime(p, (time.time() - age, time.time() - age))
                open(os.path.join(d, "nabd_db_2.gz.gpg.oplogts"), "w").write("ts")   # must not be picked
                cmd = self.line(name).replace("$B", d)
                out = subprocess.run(["sh", "-c", cmd], capture_output=True, text=True).stdout.strip()
                self.assertEqual(out, new, f"{name}: the newest encrypted nightly was not found (found {out!r})")

    def test_a_plain_nightly_is_still_found(self):
        for name in TASKS:
            with tempfile.TemporaryDirectory() as d:
                p = os.path.join(d, "nabd_db_1.gz"); open(p, "wb").write(b"x")
                out = subprocess.run(["sh", "-c", self.line(name).replace("$B", d)], capture_output=True, text=True).stdout.strip()
                self.assertEqual(out, p, name)


if __name__ == "__main__":
    unittest.main()
