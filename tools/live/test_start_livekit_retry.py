"""tools/live/start-livekit.sh: the release download is retried with backoff and checked against the pinned sha256 (live gate, 2026-11-08: GitHub answered 504 four times in a row)."""
import hashlib
import io
import os
import platform
import stat
import subprocess
import tarfile
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "start-livekit.sh")
FAKE_CURL = r'''#!/bin/bash
# fake curl: the health probe fails; the download fails FAILS times, then copies $FAKE_TARBALL to the -o file (or writes garbage when $FAKE_GARBAGE is set)
for a in "$@"; do case "$a" in http://127.0.0.1*) exit 1;; esac; done
out=""; while [ $# -gt 0 ]; do [ "$1" = -o ] && out="$2"; shift; done
n=$(cat "$FAKE_COUNT" 2>/dev/null || echo 0); n=$((n + 1)); echo "$n" > "$FAKE_COUNT"
[ "$n" -le "$FAILS" ] && exit 22
if [ -n "${FAKE_GARBAGE:-}" ]; then echo garbage > "$out"; else cp "$FAKE_TARBALL" "$out"; fi
'''


def tarball():
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        data = b"#!/bin/sh\nexit 1\n"
        info = tarfile.TarInfo("livekit-server"); info.size = len(data); info.mode = 0o755
        t.addfile(info, io.BytesIO(data))
    return buf.getvalue()


@unittest.skipUnless(platform.system() == "Linux" and platform.machine() == "x86_64", "the script pins a linux amd64 release")
class Retry(unittest.TestCase):
    def run_script(self, fails, garbage=False, sleeps="0 0 0 0"):
        d = tempfile.mkdtemp()
        data = tarball()
        tb = os.path.join(d, "t.tgz")
        with open(tb, "wb") as f: f.write(data)
        os.mkdir(os.path.join(d, "bin"))
        c = os.path.join(d, "bin", "curl")
        with open(c, "w") as f: f.write(FAKE_CURL)
        os.chmod(c, os.stat(c).st_mode | stat.S_IXUSR)
        env = {**os.environ, "PATH": os.path.join(d, "bin") + ":" + os.environ["PATH"], "FAKE_TARBALL": tb, "FAKE_COUNT": os.path.join(d, "n"),
               "FAILS": str(fails), "LIVEKIT_CACHE_DIR": os.path.join(d, "cache"), "LIVEKIT_SHA256": hashlib.sha256(data).hexdigest(),
               "LIVEKIT_RETRY_SLEEP": sleeps, "LIVEKIT_LOG": os.path.join(d, "lk.log"), "LIVEKIT_PORT": "17880"}
        if garbage: env["FAKE_GARBAGE"] = "1"
        r = subprocess.run(["bash", SCRIPT], env=env, capture_output=True, text=True, timeout=60)
        n = int(open(env["FAKE_COUNT"]).read()) if os.path.exists(env["FAKE_COUNT"]) else 0
        return r, n

    def test_four_504_in_a_row_then_success(self):
        r, n = self.run_script(fails=4)
        self.assertIn("downloaded on attempt 5", r.stderr + r.stdout)
        self.assertEqual(n, 5)

    def test_gives_up_after_all_attempts(self):
        r, n = self.run_script(fails=99)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("could not download a release with the pinned checksum after 5 attempts", r.stderr)
        self.assertEqual(n, 5)

    def test_a_wrong_checksum_is_never_accepted(self):
        r, n = self.run_script(fails=0, garbage=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("could not download a release with the pinned checksum", r.stderr)
        self.assertEqual(n, 5)


if __name__ == "__main__":
    unittest.main()
