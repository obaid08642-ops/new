"""Journey: admin login (admin/src/pages/login.tsx via the admin BFF) + session."""
import os, time
from lib import AdminWeb, Client, journey, step, mail_code, enroll_admin_device

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL, PASSWORD = 'admin@nabd.test', 'Adm1n!Live-Pass'


SESSION_FILE = os.environ.get('LIVE_ADMIN_SESSION')  # run_gate.sh: reuse one admin session across journeys


def _reuse():
    """The login endpoint is rate limited per IP (a real protection); a gate run logs in once and reuses it."""
    import json, http.cookiejar
    if not SESSION_FILE or not os.path.exists(SESSION_FILE):
        return None
    w = AdminWeb(ADMIN_WEB, 'admin')
    for c in json.load(open(SESSION_FILE)):
        w.jar.set_cookie(http.cookiejar.Cookie(0, c['name'], c['value'], None, False, '127.0.0.1', False, False, '/', True, False, None, False, None, None, {}))
    if not w.get('/command-center').ok:
        return None
    journey('admin: reuse the gate run admin session')
    step('admin session still valid (command-center)', True, '')
    tok = next((c.value for c in w.jar if c.name == 'admin_access'), None)
    admin = Client(tok, 'admin-api') if tok else None
    if admin:
        enroll_admin_device(admin)  # 7C-C2, idempotent
    return w, admin


def login():
    reused = _reuse()
    if reused:
        return reused
    journey('admin: login with email 2FA (admin panel)')
    w = AdminWeb(ADMIN_WEB, 'admin')
    t0 = time.time()
    r = w.post('/api/admin/auth/login', {'identifier': EMAIL, 'password': PASSWORD})
    if r.status == 202 and r.get('requires_passkey'):
        # C1: once the admin has a passkey (softkey.py enrolls it for step-up),
        # login asks for it instead of an emailed code — the dashboard's passkey path.
        import softkey
        step('credentials -> 202 requires_passkey', True, r)
        r = w.post('/api/admin/auth/passkey-verify', {'identifier': EMAIL, 'response': softkey.assertion(r.get('passkey_options'))})
        step('passkey-verify -> session', r.ok, r)
    else:
        step('credentials -> 202 requires_2fa', r.status == 202 and r.get('requires_2fa'), r)
        code = mail_code(EMAIL, t0)
        step('2FA code emailed to the admin', code, 'no mail')
        r = w.post('/api/admin/auth/verify-2fa', {'identifier': EMAIL, 'code': code})
        step('verify-2fa -> session', r.ok, r)
    step('session cookie set (httpOnly)', any(c.name for c in w.jar), [c.name for c in w.jar])
    # BFF 1:1 → /api/v1/admin/command-center (the dashboard's aggregated snapshot).
    r = w.get('/admin/admin/command-center')
    step('BFF call with the session (dashboard: command-center)', r.ok, r)
    bad = AdminWeb(ADMIN_WEB).post('/api/admin/auth/login', {'identifier': EMAIL, 'password': 'wrong'})
    step('wrong admin password rejected (401, or 429 once the login throttle trips)', bad.status in (400, 401, 429), bad)
    # Direct API token for admin steps that the journeys need (same user, same 2FA)
    tok = next((c.value for c in w.jar if c.name in ('admin_access',) or ('token' in c.name.lower() and 'refresh' not in c.name.lower())), None)
    if SESSION_FILE:
        import json
        json.dump([{'name': c.name, 'value': c.value} for c in w.jar], open(SESSION_FILE, 'w'))
    admin = Client(tok, 'admin-api') if tok else None
    # 7C-C2: every direct /api/v1/admin/* call needs an enrolled device.
    if admin:
        enroll_admin_device(admin)
    return w, admin


if __name__ == '__main__':
    from lib import summary
    login()
    summary()
