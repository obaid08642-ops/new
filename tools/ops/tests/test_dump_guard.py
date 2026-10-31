"""deploy/scripts/_dump-guard.sh and its use in backup.sh and 97c-retention.sh (2026-10-31: a 3.5 MB pre-deploy dump passed where 354 MB was normal)."""
import os
import re
import subprocess
import tempfile
import time
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
GUARD = os.path.join(ROOT, "deploy", "scripts", "_dump-guard.sh")
MB = 1024 * 1024


class DumpGuard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name; self.now = time.time()

    def make(self, name, size, age_min=0):
        p = os.path.join(self.d, name)
        with open(p, "wb") as f:
            f.truncate(size)
        t = self.now - age_min * 60; os.utime(p, (t, t))
        return p

    def guard(self, new, env=None):
        p = subprocess.run(["bash", "-c", f'source "{GUARD}"; dump_guard "{new}" "{self.d}" "nabd_*.gz" "nabd_*.gz.gpg"'],
                           capture_output=True, text=True, env=dict(os.environ, **(env or {})))
        return p.returncode, p.stdout

    def test_the_run_74_case_is_refused_even_when_the_earlier_dumps_are_encrypted(self):
        self.make("nabd_db_1.gz.gpg", 354 * MB, 60); self.make("nabd_db_2.gz.gpg", 353 * MB, 1500)   # the old glob nabd_*.gz matched neither
        new = self.make("nabd_db_3.gz", 3_554_821)
        rc, out = self.guard(new)
        self.assertEqual(rc, 1); self.assertIn("ABORT", out); self.assertIn("nothing was changed", out)

    def test_a_normal_dump_passes_and_the_baseline_is_the_largest_of_the_last_three(self):
        self.make("nabd_db_1.gz.gpg", 20 * MB, 60)                                                   # one earlier bad dump must not lower the bar
        self.make("nabd_db_2.gz.gpg", 354 * MB, 1500); self.make("nabd_db_3.gz.gpg", 350 * MB, 3000)
        rc, _ = self.guard(self.make("nabd_db_4.gz", 340 * MB)); self.assertEqual(rc, 0)
        rc, out = self.guard(self.make("nabd_db_5.gz", 100 * MB)); self.assertEqual(rc, 1)

    def test_first_dump_passes_suspect_files_are_ignored_and_force_is_explicit(self):
        new = self.make("nabd_db_1.gz", 3 * MB)
        rc, out = self.guard(new); self.assertEqual(rc, 0); self.assertIn("no earlier dump", out)
        self.make("nabd_old.gz.suspect", 900 * MB, 10)
        self.make("nabd_db_0.gz.gpg", 300 * MB, 100)
        rc, _ = self.guard(new); self.assertEqual(rc, 1)                                              # the .suspect file does not count, the 300 MB one does
        rc, out = self.guard(new, {"DUMP_GUARD_FORCE": "1"}); self.assertEqual(rc, 0); self.assertIn("FORCED", out)

    def test_backup_sh_checks_before_encrypting_and_keeps_the_suspect_aside(self):
        text = open(os.path.join(ROOT, "deploy", "scripts", "backup.sh")).read()
        self.assertIn('source "$(dirname "$0")/_dump-guard.sh"', text)
        self.assertLess(text.index("dump_guard "), text.index("backup_encryption_error"))
        self.assertIn('mv -f "$FILE" "$FILE.suspect"', text)
        self.assertIn('-name "nabd_*.suspect"', text)


if __name__ == "__main__":
    unittest.main()
