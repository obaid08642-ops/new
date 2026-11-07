"""tools/ops/cf/54-edge-cache-check.sh against a fake curl: HIT on the second ask passes; DYNAMIC with a private cache-control or a Set-Cookie fails and says why."""
import os
import stat
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cf", "54-edge-cache-check.sh")
FAKE_CURL = r'''#!/usr/bin/env python3
import os, sys
mode = os.environ["FAKE_MODE"]
url = [a for a in sys.argv[1:] if a.startswith("http")][-1]
print("HTTP/2 200")
if mode == "hit":
    print("cache-control: public, s-maxage=60"); print("cf-cache-status: HIT")
elif mode == "private":
    print("cache-control: private, no-cache"); print("set-cookie: NEXT_LOCALE=ar; Path=/"); print("cf-cache-status: DYNAMIC")
else:   # shareable at the origin, edge rule does not match
    print("cache-control: public, s-maxage=300"); print("cf-cache-status: DYNAMIC")
'''


class EdgeCacheCheck(unittest.TestCase):
    def run_check(self, mode, **env):
        with tempfile.TemporaryDirectory() as d:
            b = os.path.join(d, "bin"); os.makedirs(b)
            for name, text in (("curl", FAKE_CURL), ("sleep", "#!/bin/bash\nexit 0\n")):
                p = os.path.join(b, name)
                with open(p, "w") as f: f.write(text)
                os.chmod(p, os.stat(p).st_mode | stat.S_IEXEC)
            e = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], FAKE_MODE=mode, SAMPLE_PAUSE="0", **env)
            return subprocess.run(["bash", SCRIPT], env=e, capture_output=True, text=True, timeout=60)

    def test_all_hit_passes(self):
        p = self.run_check("hit")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("second request HIT: 10 of 10 (100%)", p.stdout)

    def test_private_with_cookie_fails_and_says_why(self):
        p = self.run_check("private")
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("NOT KEPT: origin says private/no-store: private, no-cache", p.stdout)
        self.assertIn("Set-Cookie", p.stdout)
        self.assertIn("FAIL below 80%", p.stdout)

    def test_shareable_but_not_kept_points_at_the_cache_rule(self):
        p = self.run_check("rule")
        self.assertEqual(p.returncode, 1, p.stdout)
        self.assertIn("the Cloudflare cache rule does not match this URL", p.stdout)


if __name__ == "__main__":
    unittest.main()
