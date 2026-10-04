"""Minimal Moyasar API stand-in for live journeys (MOYASAR_API_BASE=http://127.0.0.1:9100/v1).

  POST /v1/payments                -> {id, status: initiated, amount, source.transaction_url}
  GET  /v1/payments/<id>           -> the payment (status as last set)
  POST /v1/payments/<id>/refund    -> status refunded (amount optional)
  POST /v1/payments/<id>/capture   -> status paid
  POST /__pay/<id>?status=paid|failed  (test hook: the patient completes/declines the hosted checkout)
  POST /__mode {"payments_fail": bool} + GET /__mode
      (P15.11 chaos hook: while payments_fail is true, POST /v1/payments
      answers 500 gateway_failure_drill; flip back with chaos_ctrl.sh
      moyasar-fail / moyasar-ok)
"""
import json, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PAYMENTS = {}

# P15.11 chaos drill: in-memory gateway failure switch (reset on restart).
#   POST /__mode {"payments_fail": true}  -> POST /v1/payments answers 500
#   POST /__mode {"payments_fail": false} -> normal behaviour (default)
#   GET  /__mode                           -> {"payments_fail": bool}
# Existing behaviour is unchanged while the switch is off.
MODE = {'payments_fail': False}


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
        p = urlparse(self.path).path.rstrip('/').split('/')
        if p[1:] == ['__mode']:
            return self._send(200, MODE)
        if len(p) == 4 and p[1:3] == ['v1', 'payments'] and p[3] in PAYMENTS:
            return self._send(200, PAYMENTS[p[3]])
        self._send(404, {'message': 'not found'})

    def do_POST(self):
        u = urlparse(self.path)
        p = u.path.rstrip('/').split('/')
        if p[1:] == ['__mode']:
            MODE['payments_fail'] = bool(self._body().get('payments_fail', False))
            return self._send(200, MODE)
        if p[1:] == ['v1', 'payments']:
            if MODE['payments_fail']:
                return self._send(500, {'message': 'gateway_failure_drill', 'type': 'api_error'})
            b = self._body()
            pid = 'pay_' + uuid.uuid4().hex[:20]
            PAYMENTS[pid] = {'id': pid, 'status': 'initiated', 'amount': b.get('amount'), 'currency': b.get('currency', 'SAR'),
                             'description': b.get('description'), 'refunded': 0,
                             'source': {'type': 'creditcard', 'transaction_url': f'https://checkout.fake-moyasar.test/{pid}'}}
            return self._send(201, PAYMENTS[pid])
        if len(p) == 5 and p[1:3] == ['v1', 'payments'] and p[3] in PAYMENTS:
            pay = PAYMENTS[p[3]]
            if p[4] == 'refund':
                amt = self._body().get('amount') or pay['amount']
                pay['refunded'] = (pay.get('refunded') or 0) + amt
                pay['status'] = 'refunded'
                return self._send(200, pay)
            if p[4] == 'capture':
                pay['status'] = 'paid'
                return self._send(200, pay)
        if len(p) == 3 and p[1] == '__pay' and p[2] in PAYMENTS:
            PAYMENTS[p[2]]['status'] = parse_qs(u.query).get('status', ['paid'])[0]
            return self._send(200, PAYMENTS[p[2]])
        self._send(404, {'message': 'not found'})


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 9100), H).serve_forever()
