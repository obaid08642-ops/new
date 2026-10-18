import importlib.util
import os
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("ms", os.path.join(os.path.dirname(__file__), "migration-safety.py"))
ms = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ms)


def run(files, baseline=""):
    with tempfile.TemporaryDirectory() as d:
        for name, body in files.items():
            open(os.path.join(d, name), "w").write(body)
        b = os.path.join(d, "..", os.path.basename(d) + ".baseline")
        open(b, "w").write(baseline)
        try:
            return ms.main(d, b)
        finally:
            os.remove(b)


EXPAND = "const APPLY = process.argv.includes('--apply'); // copies rows\n"


class MigrationSafety(unittest.TestCase):
    def test_expand_step_passes(self):
        self.assertEqual(run({"2026-11-a.ts": EXPAND}), 0)

    def test_contract_without_header_fails(self):
        self.assertEqual(run({"2026-11-a.ts": EXPAND, "2026-12-b.ts": EXPAND + "db.dropCollection('x')"}), 1)

    def test_contract_naming_an_earlier_expand_passes(self):
        body = "// contract-of: 2026-11-a.ts\n" + EXPAND + "db.collection('x').drop()"
        self.assertEqual(run({"2026-11-a.ts": EXPAND, "2026-12-b.ts": body}), 0)

    def test_contract_naming_a_later_or_missing_file_fails(self):
        body = "// contract-of: 2027-01-z.ts\n" + EXPAND + "$unset"
        self.assertEqual(run({"2026-12-b.ts": body}), 1)

    def test_change_without_apply_flag_fails(self):
        self.assertEqual(run({"2026-11-a.ts": "db.collection('x').insertMany([])"}), 1)

    def test_baseline_covers_old_files_and_must_shrink(self):
        self.assertEqual(run({"old.ts": "$rename"}, "old.ts apply-flag\nold.ts contract\n"), 0)
        self.assertEqual(run({"old.ts": EXPAND}, "old.ts apply-flag\n"), 1)


if __name__ == "__main__":
    unittest.main()
