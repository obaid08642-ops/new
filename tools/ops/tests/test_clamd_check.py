"""tools/ops/tasks/96d-clamd-check.sh against a fake docker and a fake clamd that speaks the real protocol: PING, VERSION, INSTREAM.
The test virus is built from parts here too: no virus-test string is stored in the repository."""
import os
import re
import socket
import struct
import subprocess
import tempfile
import threading
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "tasks", "96d-clamd-check.sh")
VIRUS = "".join(["X5O!P%@AP[4\\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!", "$H+H*"])


class FakeClamd(threading.Thread):
    """detects=False: a scanner that says OK to everything (a broken one)."""
    def __init__(self, detects=True, pong=True):
        super().__init__(daemon=True)
        self.detects, self.pong = detects, pong
        self.srv = socket.socket(); self.srv.bind(("127.0.0.1", 0)); self.srv.listen(8); self.port = self.srv.getsockname()[1]
        self.stop = False

    def run(self):
        self.srv.settimeout(0.2)
        while not self.stop:
            try:
                c, _ = self.srv.accept()
            except socket.timeout:
                continue
            threading.Thread(target=self.handle, args=(c,), daemon=True).start()

    def handle(self, c):
        try:
            cmd = b""
            while not cmd.endswith(b"\0"):
                cmd += c.recv(1)
            if cmd == b"zPING\0":
                c.sendall(b"PONG\0" if self.pong else b"NOPE\0")
            elif cmd == b"zVERSION\0":
                c.sendall(b"ClamAV 1.4.2/27800/Fri Oct 30 08:00:00 2026\0")
            elif cmd == b"zINSTREAM\0":
                data = b""
                while True:
                    n = struct.unpack(">I", c.recv(4))[0]
                    if n == 0:
                        break
                    left = n
                    while left:
                        part = c.recv(left); data += part; left -= len(part)
                c.sendall((b"stream: Eicar-Test-Signature FOUND\0" if self.detects and b"EICAR-STANDARD-ANTIVIRUS" in data else b"stream: OK\0"))
        finally:
            c.close()


class ClamdCheck(unittest.TestCase):
    def run_task(self, port, env=None, host="127.0.0.1", candidate=False, mode="required"):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        d = tmp.name; b = os.path.join(d, "bin"); os.makedirs(b)
        calls = os.path.join(d, "calls.log")
        script = os.path.join(d, "task.sh")
        text = open(TASK).read()
        if candidate:
            text = re.sub(r'(?m)^CLAMD_TEST_HOST=""$', f'CLAMD_TEST_HOST="{host}"', text)
            text = re.sub(r'(?m)^CLAMD_TEST_PORT=""$', f'CLAMD_TEST_PORT="{port}"', text)
        open(script, "w").write(text)
        with open(os.path.join(b, "sudo"), "w") as f:
            f.write('#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        # the fake docker: `exec <ct> printenv NAME` answers from the table; `exec -e CHECK_HOST=.. -e CHECK_PORT=.. <ct> node -e JS` runs real node, reaching the fake clamd on localhost
        with open(os.path.join(b, "docker"), "w") as f:
            f.write(f'''#!/bin/bash
echo "$1 ${{*:2:4}}" >> "{calls}"
if [ "$1" = exec ]; then
  shift
  if [ "$1" = -e ]; then
    shift; shift; shift; shift   # -e CHECK_HOST=x -e CHECK_PORT=y
    shift                        # the container name
    [ "$1" = node ] && {{ shift; CHECK_HOST=127.0.0.1 CHECK_PORT={port} exec node "$@"; }}
  fi
  case "$3" in
    CLAMD_HOST) echo "{host}";;
    CLAMD_PORT) echo "{port}";;
    UPLOAD_SCAN) [ -n "{mode}" ] && echo "{mode}";;
  esac
fi
''')
        os.chmod(os.path.join(b, "sudo"), 0o755); os.chmod(os.path.join(b, "docker"), 0o755)
        e = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], HOME=d)
        p = subprocess.run(["bash", script], env=e, capture_output=True, text=True, timeout=90, stdin=subprocess.DEVNULL)
        return p, open(calls).read() if os.path.exists(calls) else ""

    def scanner(self, **kw):
        s = FakeClamd(**kw); s.start(); self.addCleanup(lambda: setattr(s, "stop", True))
        return s

    def test_a_working_private_scanner_is_ready_and_nothing_is_changed(self):
        s = self.scanner()
        p, calls = self.run_task(s.port, host="10.77.0.2", mode="defer")
        out = p.stdout
        self.assertEqual(p.returncode, 0, out + p.stderr)
        self.assertIn("address kind=private", out)
        self.assertIn("ping=ok", out); self.assertIn("clean_file=ok", out); self.assertIn("test_virus=found(ok)", out)
        self.assertIn("version=ClamAV 1.4.2", out)
        self.assertIn("scanner=ok", out)
        self.assertIn("switch is OFF: UPLOAD_SCAN=defer", out)
        self.assertIn("ready_to_switch=yes", out)
        self.assertNotIn("10.77.0.2", out)                                   # the kind of address, never the address
        self.assertFalse(re.search(r"\b(restart|stop|start|up|rm|run|compose)\b", " ".join(l.split()[0] for l in calls.splitlines())))   # only inspection: exec

    def test_required_mode_says_the_switch_is_on(self):
        s = self.scanner()
        p, _ = self.run_task(s.port, host="10.77.0.2", mode="required")
        self.assertIn("switch is ON: UPLOAD_SCAN=required", p.stdout)
        self.assertIn("never served", p.stdout)

    def test_a_scanner_that_does_not_catch_the_test_virus_is_not_ready(self):
        s = self.scanner(detects=False)
        p, _ = self.run_task(s.port, host="10.77.0.2")
        self.assertIn("test_virus=FAIL", p.stdout); self.assertIn("scanner=FAIL", p.stdout)
        self.assertIn("ready_to_switch=no because: scanner does not pass", p.stdout)

    def test_an_unreachable_scanner_is_not_ready(self):
        p, _ = self.run_task(1, host="10.77.0.2")                             # nothing listens on port 1
        self.assertIn("ping=FAIL", p.stdout); self.assertIn("scanner=FAIL", p.stdout); self.assertIn("ready_to_switch=no", p.stdout)

    def test_a_public_address_is_never_ready_even_when_it_answers(self):
        s = self.scanner()
        p, _ = self.run_task(s.port, host="203.0.113.9")
        self.assertIn("address kind=PUBLIC", p.stdout)
        self.assertIn("ready_to_switch=no because: the address is PUBLIC", p.stdout)
        self.assertNotIn("203.0.113.9", p.stdout)

    def test_a_candidate_is_tested_before_anything_is_switched(self):
        s = self.scanner()
        p, calls = self.run_task(s.port, host="10.99.0.5", candidate=True, mode="defer")
        self.assertIn("scanner under test: candidate", p.stdout)
        self.assertIn("scanner=ok", p.stdout); self.assertIn("ready_to_switch=yes", p.stdout)
        self.assertIn("switch is OFF", p.stdout)

    def test_no_scanner_configured_says_so(self):
        p, _ = self.run_task(3310, host="")
        self.assertIn("no scanner configured", p.stdout); self.assertIn("ready_to_switch=no", p.stdout)

    def test_no_virus_test_string_is_stored_in_the_task_or_this_test_file(self):
        full = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!"
        self.assertNotIn("X5O!P%@AP[4\\PZX54(P^)7CC)7}$" + full, open(TASK).read().replace("','", ""))
        self.assertNotIn("$EICAR", open(TASK).read())


if __name__ == "__main__":
    unittest.main()
