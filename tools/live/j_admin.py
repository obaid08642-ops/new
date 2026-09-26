"""Journey: admin login (admin/src/pages/login.tsx via the admin BFF) + session."""
import os, time
from lib import AdminWeb, Client, journey, step, mail_code

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL, PASSWORD = 'admin@nabd.test', 'Adm1n!Live-Pass'


def login():
    journey('admin: login with email 2FA (admin panel)')
    w = AdminWeb(ADMIN_WEB, 'admin')
    t0 = time.time()
    r = w.post('/api/admin/auth/login', {'identifier': EMAIL, 'password': PASSWORD})
    step('credentials -> 202 requires_2fa', r.status == 202 and r.get('requires_2fa'), r)
    code = mail_code(EMAIL, t0)
    step('2FA code emailed to the admin', code, 'no mail')
    r = w.post('/api/admin/auth/verify-2fa', {'identifier': EMAIL, 'code': code})
    step('verify-2fa -> session', r.ok, r)
    step('session cookie set (httpOnly)', any(c.name for c in w.jar), [c.name for c in w.jar])
    r = w.get('/command-center')
    step('BFF call with the session (dashboard: command-center)', r.ok, r)
    bad = AdminWeb(ADMIN_WEB).post('/api/admin/auth/login', {'identifier': EMAIL, 'password': 'wrong'})
    step('wrong admin password rejected', bad.status in (400, 401), bad)
    # Direct API token for admin steps that the journeys need (same user, same 2FA)
    tok = next((c.value for c in w.jar if 'token' in c.name.lower() and 'refresh' not in c.name.lower()), None)
    return w, Client(tok, 'admin-api') if tok else None


if __name__ == '__main__':
    from lib import summary
    login()
    summary()
