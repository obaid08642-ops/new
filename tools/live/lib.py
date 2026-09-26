"""Live journey harness: real HTTP against a running backend, findings collected per step.

Every request carries what the real clients send (JSON, idempotency key on mutations).
`step()` records PASS/FAIL with the actual status/body; a journey keeps going after a
failure when later steps do not depend on it, so one run shows every broken step.
"""
import json, os, re, time, uuid, urllib.request, urllib.error

BASE = os.environ.get('NABD_API', 'http://127.0.0.1:8002/api/v1')
MAIL = os.environ.get('NABD_MAIL', '/tmp/nabd-mail.jsonl')
RESULTS = []  # {journey, step, ok, detail}
_journey = ['?']


def journey(name):
    _journey[0] = name
    print(f'\n=== {name}', flush=True)


def step(name, ok, detail=''):
    RESULTS.append({'journey': _journey[0], 'step': name, 'ok': bool(ok), 'detail': str(detail)[:600]})
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + ('' if ok else f'  ->  {str(detail)[:400]}'), flush=True)
    return bool(ok)


class Resp:
    def __init__(self, status, body, headers):
        self.status, self.body, self.headers = status, body, headers

    @property
    def ok(self):
        return 200 <= self.status < 300

    def __repr__(self):
        return f'{self.status} {json.dumps(self.body, ensure_ascii=False)[:400] if not isinstance(self.body, str) else self.body[:400]}'

    def get(self, *path, default=None):
        """Dig into body; unwraps a {data: ...} envelope when the key is not at top level."""
        cur = self.body
        for k in path:
            if isinstance(cur, dict) and k not in cur and isinstance(cur.get('data'), dict):
                cur = cur['data']
            if isinstance(cur, dict):
                cur = cur.get(k)
            elif isinstance(cur, list) and isinstance(k, int) and -len(cur) <= k < len(cur):
                cur = cur[k]
            else:
                return default
        return default if cur is None else cur

    def items(self):
        b = self.body
        if isinstance(b, list):
            return b
        if isinstance(b, dict):
            for k in ('data', 'items', 'results', 'rows', 'orders', 'bookings'):
                v = b.get(k)
                if isinstance(v, list):
                    return v
                if isinstance(v, dict):
                    for kk in ('items', 'data', 'rows'):
                        if isinstance(v.get(kk), list):
                            return v[kk]
        return []


class Client:
    def __init__(self, token=None, label='anon'):
        self.token, self.label = token, label

    def req(self, method, path, body=None, headers=None, idem=True):
        url = path if path.startswith('http') else BASE + path
        h = {'accept': 'application/json'}
        if body is not None:
            h['content-type'] = 'application/json'
        if self.token:
            h['authorization'] = f'Bearer {self.token}'
        if idem and method in ('POST', 'PATCH', 'PUT', 'DELETE'):
            h['idempotency-key'] = f'live-{uuid.uuid4()}'
        h.update(headers or {})
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(url, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                raw, status, hdrs = resp.read(), resp.status, dict(resp.headers)
        except urllib.error.HTTPError as e:
            raw, status, hdrs = e.read(), e.code, dict(e.headers)
        if status == 429 and not getattr(self, '_retrying', False) and os.environ.get('NABD_LIVE_WAIT_429', '1') == '1':
            # Real per-IP throttles (e.g. send-otp 5/min). Wait out the window instead of faking IPs.
            self._retrying = True
            try:
                time.sleep(62)
                return self.req(method, path, body, headers, idem)
            finally:
                self._retrying = False
        txt = raw.decode('utf8', 'replace')
        try:
            parsed = json.loads(txt) if txt else None
        except ValueError:
            parsed = txt
        return Resp(status, parsed, hdrs)

    def get(self, p, **kw): return self.req('GET', p, **kw)
    def post(self, p, b=None, **kw): return self.req('POST', p, {} if b is None else b, **kw)
    def patch(self, p, b=None, **kw): return self.req('PATCH', p, {} if b is None else b, **kw)
    def put(self, p, b=None, **kw): return self.req('PUT', p, {} if b is None else b, **kw)
    def delete(self, p, **kw): return self.req('DELETE', p, **kw)


def mail_code(to, since, timeout=20):
    """6-digit code from the newest mail to `to` received after `since` (smtp_sink.py)."""
    end = time.time() + timeout
    while time.time() < end:
        if os.path.exists(MAIL):
            for line in reversed(open(MAIL, encoding='utf8').read().splitlines()):
                m = json.loads(line)
                if m['at'] >= since and any(to.lower() == t.lower() for t in m['to']):
                    c = re.search(r'(?<!\d)(\d{6})(?!\d)', m['subject'] + ' ' + m['body'])
                    if c:
                        return c.group(1)
        time.sleep(0.5)
    return None


def mail_to(to, since, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        if os.path.exists(MAIL):
            hits = [json.loads(l) for l in open(MAIL, encoding='utf8').read().splitlines()]
            hits = [m for m in hits if m['at'] >= since and any(to.lower() == t.lower() for t in m['to'])]
            if hits:
                return hits
        time.sleep(0.5)
    return []


def uniq(prefix='u'):
    return f'{prefix}{int(time.time() * 1000) % 10**9}{uuid.uuid4().hex[:4]}'


def phone():
    return '+9665' + str(int(time.time() * 1000))[-8:]


def summary(path=None):
    fails = [r for r in RESULTS if not r['ok']]
    print(f'\n##### {len(RESULTS) - len(fails)}/{len(RESULTS)} steps passed, {len(fails)} failed')
    for r in fails:
        print(f"  FAIL [{r['journey']}] {r['step']}: {r['detail'][:300]}")
    if path:
        json.dump(RESULTS, open(path, 'w'), ensure_ascii=False, indent=1)
    return len(fails)
