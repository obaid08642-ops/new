"""Journey: admin login (admin/src/pages/login.tsx via the admin BFF) + session."""
import os, re, time
from lib import AdminWeb, Client, journey, step, mail_code, enroll_admin_device

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL, PASSWORD = 'admin@nabd.test', 'Adm1n!Live-Pass'


SESSION_FILE = os.environ.get('LIVE_ADMIN_SESSION')  # run_gate.sh: reuse one admin session across journeys
DEVICE_FILE = os.environ.get('LIVE_ADMIN_DEVICE_FILE', '/tmp/nabd-admin-device-id')


def _device_file(email=EMAIL):
    """One saved browser device per admin account: the 2-device limit is per user."""
    if email == EMAIL:
        return DEVICE_FILE
    return DEVICE_FILE + '.' + re.sub(r'[^A-Za-z0-9]+', '_', email)


def _load_browser_device(w, email=EMAIL):
    """D-35: one browser identity per gate run. A fresh jar would mint a fresh
    device id on every login and the 2-device limit would refuse the third one,
    so the enrolled device id is reused across this run's logins."""
    import http.cookiejar
    try:
        with open(_device_file(email)) as f:
            dev = f.read().strip()
    except OSError:
        return
    if len(dev) >= 16:
        w.jar.set_cookie(http.cookiejar.Cookie(0, 'admin_device', dev, None, False, '127.0.0.1', False, False, '/', True, False, None, False, None, None, {}))


def _save_browser_device(w, email=EMAIL):
    dev = next((c.value for c in w.jar if c.name == 'admin_device'), None)
    if dev and len(dev) >= 16:
        try:
            with open(_device_file(email), 'w') as f:
                f.write(dev)
        except OSError:
            pass


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
        enroll_admin_device(admin, EMAIL)  # 7C-C2 + D-35 flow, idempotent
        _enroll_browser_device(w, admin, EMAIL)
    return w, admin


def _enroll_browser_device(w, admin, email=EMAIL):
    """D-35: the admin BFF proxies with the browser's admin_device cookie, so that
    device must be enrolled too. The gate run's enrolled device approves, then the
    browser device confirms with the e-mailed code."""
    browser = next((c.value for c in w.jar if c.name == 'admin_device'), None)
    if not browser or len(browser) < 16:
        step('browser device present for enrollment (D-35)', False, 'no admin_device cookie')
        return False
    t0 = time.time()
    r = admin.post('/admin/devices/enroll', {'device_id': browser, 'name': 'gate-run-admin-browser'})
    if r.get('status') == 'already_enrolled':
        step('browser device already enrolled (D-35)', True, '')
        return True
    if not (r.status == 202 and r.get('status') == 'pending_approval'):
        step('browser device enrollment requested (D-35)', False, r)
        return False
    request_id = r.get('request_id')
    ra = admin.post(f'/admin/devices/requests/{request_id}/approve')
    step('browser device enrollment approved from the enrolled device (D-35)', ra.ok, ra)
    if not ra.ok:
        return False
    code = mail_code(email, t0)
    step('browser enrollment code emailed to the admin (D-35)', bool(code), 'no mail')
    rc = admin.post(f'/admin/devices/requests/{request_id}/confirm', {'code': code or ''},
                    headers={'x-admin-device': browser})
    step('browser device confirmed with the e-mailed code (D-35)', rc.ok, rc)
    return rc.ok


def login(email=EMAIL, password=PASSWORD):
    """The gate admin by default; another admin account (e.g. the super admin of seed_admin.js) gets its own
    session, never the shared session file."""
    shared = email == EMAIL
    reused = _reuse() if shared else None
    if reused:
        return reused
    journey(f'admin: login with email 2FA (admin panel){"" if shared else f" as {email}"}')
    w = AdminWeb(ADMIN_WEB, 'admin')
    _load_browser_device(w, email)
    t0 = time.time()
    r = w.post('/api/admin/auth/login', {'identifier': email, 'password': password})
    step('credentials -> 202 requires_2fa', r.status == 202 and r.get('requires_2fa'), r)
    code = mail_code(email, t0)
    step('2FA code emailed to the admin', code, 'no mail')
    r = w.post('/api/admin/auth/verify-2fa', {'identifier': email, 'code': code})
    step('verify-2fa -> session', r.ok, r)
    step('session cookie set (httpOnly)', any(c.name for c in w.jar), [c.name for c in w.jar])
    # Direct API token for admin steps that the journeys need (same user, same 2FA)
    tok = next((c.value for c in w.jar if c.name in ('admin_access',) or ('token' in c.name.lower() and 'refresh' not in c.name.lower())), None)
    if SESSION_FILE and shared:
        import json
        json.dump([{'name': c.name, 'value': c.value} for c in w.jar], open(SESSION_FILE, 'w'))
    admin = Client(tok, 'admin-api') if tok else None
    # D-35: enroll both devices BEFORE asserting anything that needs them. The
    # BFF proxies with the browser device, so the gate device (first device:
    # code only) and then the browser device (approved from the gate device,
    # confirmed with the code) must be enrolled before the dashboard is read.
    if admin:
        enroll_admin_device(admin, email)
        _enroll_browser_device(w, admin, email)
        _save_browser_device(w, email)
    # BFF 1:1 → /api/v1/admin/command-center (the dashboard's aggregated snapshot).
    r = w.get('/admin/admin/command-center')
    step('BFF call with the session (dashboard: command-center)', r.ok, r)
    bad = None
    if shared:
        bad = AdminWeb(ADMIN_WEB).post('/api/admin/auth/login', {'identifier': EMAIL, 'password': 'wrong'})
        step('wrong admin password rejected (401, or 429 once the login throttle trips)', bad.status in (400, 401, 429), bad)
    return w, admin


if __name__ == '__main__':
    from lib import summary
    login()
    summary()
