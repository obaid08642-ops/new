"""tools/ops/tasks/76-api-latency.sh against a fake curl and docker (read-only task: nothing is written, no secret is read)."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "76-api-latency.sh")
FAKE_SUDO = '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n'
FAKE_CURL = r'''#!/bin/bash
for a in "$@"; do
  case "$a" in
    *%{time_starttransfer}*) echo "0.004 0.006"; exit 0;;
    -D) printf 'HTTP/2 200\r\nx-cache-status: HIT\r\ncache-control: public, s-maxage=300\r\n'; exit 0;;
  esac
done
case " $* " in *" -o "*) exit 0;; esac
case " $* " in *gzip*) printf 'x%.0s' $(seq 700);; *) printf 'x%.0s' $(seq 2700);; esac
'''
FAKE_DOCKER = r'''#!/bin/bash
case "$*" in
  *"nginx -T"*) printf '  gzip on;\n  gzip_comp_level 4;\n  proxy_buffering off;\n  keepalive 256;\n  ssl_certificate_key /secret/key.pem;\n';;
  *"command -v wget"*) exit 0;;
  *) echo 31;;
esac
'''


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class ApiLatency(unittest.TestCase):
    def test_prints_percentiles_sizes_and_nginx_settings_only(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        b = os.path.join(tmp.name, "bin"); os.makedirs(b)
        write_exec(os.path.join(b, "sudo"), FAKE_SUDO)
        write_exec(os.path.join(b, "curl"), FAKE_CURL)
        write_exec(os.path.join(b, "docker"), FAKE_DOCKER)
        p = subprocess.run(["bash", TASK], env=dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], OPS_SAMPLES="5"), capture_output=True, text=True, timeout=60)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("x-cache-status: HIT", p.stdout)
        self.assertIn("items size: 2700 bytes plain, 700 bytes gzip", p.stdout)
        self.assertRegex(p.stdout, r"1 items via nginx \(HIT\)\s+ttfb p50=4 p95=4 ms  total p50=6 p95=6 ms  \(n=5\)")
        self.assertIn("4 items inside the backend       total p50=31 p95=31 ms", p.stdout)
        self.assertIn("nginx: proxy_buffering off;", p.stdout)
        self.assertNotIn("ssl_certificate_key", p.stdout)             # only the listed names
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith("status: ") or line.startswith("## "), line)


if __name__ == "__main__":
    unittest.main()
