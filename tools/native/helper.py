"""Small HTTP helper the Maestro flows call from runScript (the flows run on the runner, the app on the emulator).

  python3 tools/native/helper.py [port]        (default 9300, 127.0.0.1 only; started by run_job.sh)
  GET /fresh                    -> {email, phone, password, name}   unused sign-up data (nothing is created)
  GET /otp?to=<email>[&since=ms] -> {code}                           newest 6-digit code mailed to <email> (smtp_sink), waits up to 25 s
  GET /patient/new              -> {email, phone, password, name}   a patient created through the real API (for flows that change or delete the account)
  GET /api?path=/x&token=...    -> the backend's JSON answer (GET), for checks on the other side of a journey
Test stack only; every address is @nabd.test.
"""
import json, os, sys, time, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'live'))
import lib  # noqa: E402


def fresh():
    return {'email': f"{lib.uniq('e2e')}@nabd.test", 'phone': lib.phone(), 'password': 'Str0ng!Pass' + lib.uniq('')[-4:], 'name': 'اختبار نبض'}


def otp(to, since):
    return lib.mail_code(to, since, timeout=25)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if u.path == '/fresh':
                return self._send(200, fresh())
            if u.path == '/otp':
                since = float(q.get('since', 0)) / 1000.0
                return self._send(200, {'code': otp(q['to'], since)})
            if u.path == '/patient/new':
                import j_accounts
                p = j_accounts.app_signup(label='native-extra')
                return self._send(200, {'email': p['email'], 'phone': p['phone'], 'password': p['password'], 'name': 'اختبار native-extra'})
            if u.path == '/api':
                r = lib.Client(q.get('token')).get(q['path'])
                return self._send(200, {'ok': r.ok, 'status': r.status, 'body': r.body})
        except Exception as e:  # noqa: BLE001
            return self._send(500, {'error': str(e)})
        self._send(404, {'error': 'not found'})


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 9300), H).serve_forever()
