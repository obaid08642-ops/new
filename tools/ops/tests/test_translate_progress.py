"""tools/ops/tasks/98b-translate-progress.sh against a fake docker: it prints whitelisted counts from the run's stats file and never a raw error text."""
import json
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "98b-translate-progress.sh")
SECRET = "-".join(["sk", "live", "SECRET", "KEY", "123"])  # a FAKE key, built at runtime so the secret scanner does not flag the fixture
STATS = {
    "at": "2026-10-28T02:00:00.000Z", "started_at": "2026-10-28T01:00:00.000Z", "answered": 120, "remaining": 30, "failed": 2,
    "last_answer_at": "2026-10-28T01:59:30.000Z", "answered_total": 300, "requests_total": 1404, "remaining_total": 1104,
    "providers": {
        "gemini": {"sent": 80, "ok": 70, "limited": 8, "errors": 2, "rejected": 3, "avg_latency_ms": 4100, "parked_ms": 90000, "retired": None,
                   "parked_until": "2026-10-28T02:03:00.000Z", "error_classes": {"http_429": 8, "timeout": 2}},
        "groq": {"sent": 5, "ok": 0, "limited": 0, "errors": 5, "rejected": 0, "avg_latency_ms": 0, "parked_ms": 0, "retired": "refused by the provider (http_404)",
                 "parked_until": None, "error_classes": {"http_404": 3}},
        "evil": {"sent": 1, "ok": 0, "limited": 0, "errors": 1, "rejected": 0, "avg_latency_ms": 0, "parked_ms": 0, "retired": f"Bearer {SECRET} leaked",
                 "parked_until": None, "error_classes": {f"http_500 {SECRET}": 1, "ok_class": 1}, "message": SECRET},
        "bad name!": {"sent": 1},
    },
}


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class TranslateProgress(unittest.TestCase):
    def run_task(self, stats_text):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        b = os.path.join(tmp.name, "bin"); os.makedirs(b)
        sf = os.path.join(tmp.name, "stats.json")
        if stats_text is not None:
            with open(sf, "w") as f:
                f.write(stats_text)
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'#!/bin/bash\ncase "$*" in\n  *stats.json*) cat "{sf}" 2>/dev/null || exit 1;;\n  *requests.jsonl*) echo 1404;;\n  *responses.jsonl*) echo 181;;\nesac\n')
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], HOME=tmp.name)
        return subprocess.run(["bash", TASK], env=env, capture_output=True, text=True, timeout=30)

    def test_prints_whitelisted_counts_per_provider_and_overall(self):
        p = self.run_task(json.dumps(STATS))
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("answered=300 of 1404, remaining=1104", p.stdout)
        self.assertIn("last_answer_at=2026-10-28T01:59:30.000Z", p.stdout)
        self.assertIn("gemini: sent=80 ok=70 limited=8 errors=2 rejected=3 avg_ms=4100 parked_until=2026-10-28T02:03:00.000Z retired=no classes=[http_429=8 timeout=2]", p.stdout)
        self.assertIn("groq: sent=5", p.stdout)
        self.assertIn("groq: retired because: refused by the provider (http_404)", p.stdout)

    def test_never_prints_raw_text_from_the_file(self):
        p = self.run_task(json.dumps(STATS))
        self.assertNotIn(SECRET, p.stdout + p.stderr)
        self.assertNotIn("Bearer", p.stdout)
        self.assertNotIn("bad name", p.stdout)
        self.assertIn("evil: retired because: (text not shown)", p.stdout)
        self.assertIn("classes=[ok_class=1]", p.stdout)               # the class with text in its key is dropped

    def test_no_stats_file_or_garbage_is_said_plainly(self):
        self.assertIn("no stats file yet", self.run_task(None).stdout)
        self.assertIn("stats: unreadable", self.run_task("{not json").stdout)

    def test_lines_are_status_lines_only(self):
        for line in self.run_task(json.dumps(STATS)).stdout.splitlines():
            self.assertTrue(line.startswith("status: "), line)


if __name__ == "__main__":
    unittest.main()
