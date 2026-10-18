"""Minimal Resend / Brevo / Mailjet API stand-in for live journeys (one port, one path prefix per provider).

  RESEND_BASE_URL=http://127.0.0.1:9200/resend          POST /resend/emails           -> {id}
  BREVO_API_BASE=http://127.0.0.1:9200/brevo/v3          POST /brevo/v3/smtp/email     -> 201 {messageId}
  MAILJET_API_BASE=http://127.0.0.1:9200/mailjet/v3.1    POST /mailjet/v3.1/send       -> {Messages: [{Status: success}]}
  GET  /__sent                       -> [{provider, to, subject, auth, at}]  (every accepted request)
  POST /__mode {"fail": ["brevo"]}   -> those providers answer 500 until the next /__mode
  POST /__reset                      -> clears the record and the mode
Usage: python3 fake_mail.py [port]   (default 9200)
"""
import json, sys, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SENT = []
MODE = {'fail': []}


class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get('content-length') or 0)
        try:
            return json.loads(self.rfile.read(n) or b'{}')
        except Exception:
            return {}

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.rstrip('/') == '/__sent':
            return self._send(200, SENT)
        self._send(404, {'message': 'not found'})

    def do_POST(self):
        path = self.path.split('?')[0].rstrip('/')
        body = self._body()
        if path == '/__mode':
            MODE['fail'] = list(body.get('fail') or [])
            return self._send(200, MODE)
        if path == '/__reset':
            SENT.clear(); MODE['fail'] = []
            return self._send(200, {'ok': True})
        if path == '/resend/emails':
            provider, auth = 'resend', self.headers.get('authorization', '')
            to = body.get('to'); to = to[0] if isinstance(to, list) else to
            subject, ok_body, ok_code = body.get('subject'), {'id': str(uuid.uuid4())}, 200
        elif path == '/brevo/v3/smtp/email':
            provider, auth = 'brevo', self.headers.get('api-key', '')
            to, subject = (body.get('to') or [{}])[0].get('email'), body.get('subject')
            ok_body, ok_code = {'messageId': f'<{uuid.uuid4()}@fake>'}, 201
        elif path == '/mailjet/v3.1/send':
            provider, auth = 'mailjet', self.headers.get('authorization', '')
            m = (body.get('Messages') or [{}])[0]
            to, subject = (m.get('To') or [{}])[0].get('Email'), m.get('Subject')
            ok_body, ok_code = {'Messages': [{'Status': 'success'}]}, 200
        else:
            return self._send(404, {'message': 'not found'})
        if not auth:
            return self._send(401, {'message': 'missing credentials'})
        if provider in MODE['fail']:
            return self._send(500, {'message': f'{provider} drill failure'})
        SENT.append({'provider': provider, 'to': to, 'subject': subject, 'auth': bool(auth), 'at': time.time()})
        self._send(ok_code, ok_body)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9200
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
