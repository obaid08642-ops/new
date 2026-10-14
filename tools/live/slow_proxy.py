"""P15.11: delay proxy for the slow-API chaos drill (no backend change needed).

There is no server-side latency switch in the backend (DEFERRED-OUT-OF-SCOPE
for an env-backed delay flag owned by the backend agent), so the drill injects
latency harness-side: the journey points its own client at this proxy, which
sleeps DELAY_S before forwarding each request whose path starts with one of
--slow-prefixes, then relays the backend response byte-for-byte.

  python3 tools/live/slow_proxy.py --listen 9101 --target http://127.0.0.1:8002 \\
      --delay 2 --slow-prefixes /api/v1 &   # +2 s on every API call
  NABD_API=http://127.0.0.1:9101/api/v1 python3 tools/live/j_chaos.py

Stdlib only (http.server + urllib), same as the other live doubles
(fake_moyasar.py, smtp_sink.py). Shutdown: SIGTERM / Ctrl-C.
"""
import argparse
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ARGS = None


class H(BaseHTTPRequestHandler):
    def _relay(self):
        path = self.path
        if any(path.startswith(p) for p in ARGS.slow_prefixes):
            time.sleep(ARGS.delay)
        url = ARGS.target.rstrip('/') + path
        length = int(self.headers.get('content-length') or 0)
        body = self.rfile.read(length) if length else None
        headers = {k: v for k, v in self.headers.items()
                   if k.lower() not in ('host', 'content-length', 'connection')}
        req = urllib.request.Request(url, data=body, method=self.command, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw, status = resp.read(), resp.status
        except urllib.error.HTTPError as e:
            raw, status = e.read(), e.code
        self.send_response(status)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    do_GET = _relay
    do_POST = _relay
    do_PUT = _relay
    do_PATCH = _relay
    do_DELETE = _relay

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--listen', type=int, default=9101)
    ap.add_argument('--target', default='http://127.0.0.1:8002')
    ap.add_argument('--delay', type=float, default=2.0)
    ap.add_argument('--slow-prefixes', default='/api/v1',
                    help='comma-separated path prefixes to delay')
    ARGS = ap.parse_args()
    ARGS.slow_prefixes = [p.strip() for p in ARGS.slow_prefixes.split(',') if p.strip()]
    ThreadingHTTPServer(('127.0.0.1', ARGS.listen), H).serve_forever()
