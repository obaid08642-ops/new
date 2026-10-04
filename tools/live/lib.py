"""Live journey harness: real HTTP against a running backend, findings collected per step.

Every request carries what the real clients send (JSON, idempotency key on mutations).
`step()` records PASS/FAIL with the actual status/body; a journey keeps going after a
failure when later steps do not depend on it, so one run shows every broken step.
"""
import json, os, re, time, uuid, urllib.request, urllib.error, urllib.parse

BASE = os.environ.get('NABD_API', 'http://127.0.0.1:8002/api/v1')
MAIL = os.environ.get('NABD_MAIL', '/tmp/nabd-mail.jsonl')
# 7C: admin hardening headers. The gate backend requires every direct
# /api/v1/admin/* call to carry an enrolled device id (C2) and the network
# gate token (C3). Non-admin clients are unaffected.
ADMIN_DEVICE_ID = os.environ.get('NABD_ADMIN_DEVICE') or 'live-gate-owner-macbook-01'
# start-backend.sh sets ADMIN_GATE_TOKEN (and mirrors it to NABD_ADMIN_GATE_TOKEN)
# with this same default, so the harness must present the identical secret. Reading
# the env alone left the default empty and every /admin/* call 403'd once the C3
# gate actually became active.
ADMIN_GATE_TOKEN = (os.environ.get('NABD_ADMIN_GATE_TOKEN')
                    or os.environ.get('ADMIN_GATE_TOKEN')
                    or 'live-gate-token')


def enroll_admin_device(admin):
    """Enroll the gate run's device id for the admin user (C2). Idempotent."""
    r = admin.post('/admin/devices/enroll', {'device_id': ADMIN_DEVICE_ID, 'name': 'gate-run-owner-macbook'})
    step('admin device enrolled for the gate run (C2)', r.ok, r)
    # R23: sensitive actions need a fresh passkey assertion; enroll the synthetic key once.
    import softkey
    step('synthetic passkey enrolled for step-up (R23)', softkey.ensure_enrolled(admin.post, admin.get), 'enroll failed')
    return r.ok
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
    def __init__(self, token=None, label='anon', admin=False):
        self.token, self.label = token, label
        # 7C: admin API clients carry the device + gate headers the backend requires.
        self.is_admin = admin or 'admin' in str(label or '')

    def req(self, method, path, body=None, headers=None, idem=True):
        url = path if path.startswith('http') else BASE + path
        h = {'accept': 'application/json'}
        if body is not None:
            h['content-type'] = 'application/json'
        if self.token:
            h['authorization'] = f'Bearer {self.token}'
        if self.is_admin:
            h['x-admin-device'] = ADMIN_DEVICE_ID
            if ADMIN_GATE_TOKEN:
                h['x-admin-gate-token'] = ADMIN_GATE_TOKEN
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
        # R23: a @StepUp route answers 403 step_up_required; do the passkey
        # ceremony with the synthetic key (softkey.py) and retry once, like the dashboard.
        if (self.is_admin and status == 403 and 'step_up_' in txt and not path.startswith('http')
                and 'x-step-up-token' not in (headers or {}) and not getattr(self, '_stepping', False)):
            import softkey
            self._stepping = True
            try:
                tok = softkey.step_up_token(lambda p, b: self.req('POST', p, b), f"{method}:/api/v1{path.split('?')[0]}")
            finally:
                self._stepping = False
            if tok:
                return self.req(method, path, body, {**(headers or {}), 'x-step-up-token': tok}, idem)
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


class WebClient(Client):
    """Browser-like client for a Next.js BFF (patient-web /api/*, admin /api/admin/*): keeps cookies,
    sends JSON, and adds an idempotency key only when the page itself would (explicit headers)."""

    def __init__(self, base, label='web'):
        import http.cookiejar
        super().__init__(None, label)
        self.base = base.rstrip('/')
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def req(self, method, path, body=None, headers=None, idem=False):
        url = path if path.startswith('http') else self.base + path
        h = {'accept': 'application/json', 'origin': self.base}
        if body is not None:
            h['content-type'] = 'application/json'
        if idem and method in ('POST', 'PATCH', 'PUT', 'DELETE'):
            h['idempotency-key'] = f'web-{uuid.uuid4()}'
        h.update(headers or {})
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(url, data=data, method=method, headers=h)
        try:
            with self.opener.open(r, timeout=60) as resp:
                raw, status, hdrs = resp.read(), resp.status, dict(resp.headers)
        except urllib.error.HTTPError as e:
            raw, status, hdrs = e.read(), e.code, dict(e.headers)
        for c in self.jar:  # production cookies are Secure; the local run is plain http on localhost
            c.secure = False
        txt = raw.decode('utf8', 'replace')
        try:
            parsed = json.loads(txt) if txt else None
        except ValueError:
            parsed = txt
        return Resp(status, parsed, hdrs)

    def cookie(self, name):
        return next((c.value for c in self.jar if c.name == name), None)


class AdminWeb(WebClient):
    """admin/src/utils/api.ts: fetchWithAdminGuard -> /api/admin/<path>, x-admin-csrf on writes."""

    def req(self, method, path, body=None, headers=None, idem=False):
        h = dict(headers or {})
        if method in ('POST', 'PUT', 'PATCH', 'DELETE') and self.cookie('admin_csrf'):
            h['x-admin-csrf'] = urllib.parse.unquote(self.cookie('admin_csrf'))
        # same normalisation as admin/src/utils/api.ts toAdminProxyUrl
        if path.startswith('/api/v1/admin/'):
            path = '/api/admin/' + path[len('/api/v1/admin/'):]
        elif path.startswith('/admin/'):
            path = '/api/admin/' + path[len('/admin/'):]
        elif not path.startswith('/api/') and not path.startswith('http'):
            path = '/api/admin' + path
        r = super().req(method, path, body, h, idem)
        # R23: same as the dashboard's GlobalStepUp: passkey ceremony, then one retry.
        if (r.status == 403 and path.startswith('/api/admin/') and 'x-step-up-token' not in h
                and 'step_up_' in json.dumps(r.body, ensure_ascii=False) and not getattr(self, '_stepping', False)):
            import softkey
            self._stepping = True
            try:
                tok = softkey.step_up_token(lambda p, b: self.req('POST', '/api/admin' + p, b), f"{method}:/api/v1/{path[len('/api/admin/'):].split('?')[0]}")
            finally:
                self._stepping = False
            if tok:
                r = super().req(method, path, body, {**h, 'x-step-up-token': tok}, idem)
        return r
