"""X4 (ca16fa7), live: with ADMIN_PASSKEY_ENFORCED=true (start-backend.sh),
- a bootstrap admin session (password + email code, no passkey yet) reaches only
  the passkey/device endpoints: command-center answers 403 passkey_enrollment_required;
- an admin who has a passkey cannot enroll a new device outside a passkey login
  (403 passkey_assertion_required).
The bootstrap admin is a synthetic sub-admin created and deleted by this run.
- a finance account (synthetic, seeded per run) follows the same path: email-code
  bootstrap, its own passkey, then passkey-only sign-in bound to the device.
"""
import os, subprocess, time, uuid

from lib import AdminWeb, Client, journey, step, mail_code
import j_admin

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')


def main():
    owner_web, owner_api = j_admin.login()
    journey('X4: bootstrap admin session is limited to passkey enrollment')
    email = f'x4-{uuid.uuid4().hex[:8]}@nabd.test'
    password = f'X4!{uuid.uuid4().hex[:10]}'
    created = owner_web.post('/admin/admin/sub-admins', {'email': email, 'full_name': 'X4 synthetic admin', 'password': password, 'permissions': []})
    if not step('owner creates a synthetic sub-admin (step-up)', created.ok, created):
        return
    sub_id = created.get('id')
    try:
        w = AdminWeb(ADMIN_WEB, 'admin')
        t0 = time.time()
        r = w.post('/api/admin/auth/login', {'identifier': email, 'password': password})
        step('no passkey yet: login asks for the emailed code (bootstrap)', r.status == 202 and r.get('requires_2fa'), r)
        code = mail_code(email, t0)
        step('bootstrap code emailed', code, 'no mail')
        r = w.post('/api/admin/auth/verify-2fa', {'identifier': email, 'code': code})
        step('bootstrap session issued', r.ok, r)
        r = w.get('/admin/admin/command-center')
        step('bootstrap session -> command-center 403 passkey_enrollment_required', r.status == 403 and 'passkey_enrollment_required' in repr(r), r)
        r = w.get('/api/admin/auth/passkey/devices')
        step('bootstrap session may reach the passkey enrollment endpoints', r.ok, r)

        journey('X4: a passkey admin enrolls devices only by a passkey login')
        stranger = Client(owner_api.token, 'admin-api')
        r = stranger.post('/admin/devices/enroll', {'device_id': uuid.uuid4().hex * 2, 'name': 'x4-unbound'})
        step('generic enroll of a new device -> 403 passkey_assertion_required', r.status == 403 and 'passkey_assertion_required' in repr(r), r)
    finally:
        if sub_id:
            d = owner_web.req('DELETE', f'/admin/admin/sub-admins/{sub_id}')
            step('synthetic sub-admin deleted', d.ok, d)


def staff_passkey(role):
    """X4 (owner decision): finance and support_agent enroll and sign in with a passkey."""
    import softkey
    from lib import ADMIN_DEVICE_ID
    journey(f'X4: a {role} account enrolls a passkey and signs in with it')
    email = f'x4-{role}-{uuid.uuid4().hex[:8]}@nabd.test'
    password = f'X4!{uuid.uuid4().hex[:10]}'
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    seeded = subprocess.run(['node', os.path.join(root, 'tools/live/seed_admin.js')], cwd=os.path.join(root, 'backend'), capture_output=True, text=True,
                            env={**os.environ, 'LIVE_ADMIN_EMAIL': email, 'LIVE_ADMIN_PASSWORD': password, 'LIVE_ADMIN_ROLE': role,
                                 'LIVE_ADMIN_NAME': f'X4 synthetic {role}', 'LIVE_ADMIN_PHONE': '+9665' + str(uuid.uuid4().int)[:8]})
    if not step(f'synthetic {role} account seeded', seeded.returncode == 0, seeded.stderr[-300:]):
        return
    anon = Client(None, 'anon')
    t0 = time.time()
    r = anon.post('/auth/login', {'identifier': email, 'password': password})
    step('password alone gives no token: emailed-code bootstrap', r.ok and r.get('requires_2fa') and r.get('passkey_bootstrap') and not r.get('token'), r)
    code = mail_code(email, t0)
    step('bootstrap code emailed', code, 'no mail')
    r = anon.post('/auth/login/verify-2fa', {'identifier': email, 'code': code})
    tok = (r.get('token') or {}).get('accessToken') if r.ok and isinstance(r.get('token'), dict) else r.get('token') if r.ok else None
    if not step('bootstrap session issued', tok, r):
        return
    c = Client(tok, 'admin-api')
    r = c.post('/admin/devices/enroll', {'device_id': ADMIN_DEVICE_ID, 'name': f'x4-{role}-device'})
    step('bootstrap: this device is enrolled', r.ok, r)
    r = c.get('/admin/command-center')
    step('bootstrap session -> 403 passkey_enrollment_required', r.status == 403 and 'passkey_enrollment_required' in repr(r), r)
    key, cred = softkey.synthetic_key(f'x4-{role}')
    opts = c.post('/auth/passkey/enroll/options', {})
    step(f'{role} may start passkey enrollment', opts.ok, opts)
    if not opts.ok:
        return
    r = c.post('/auth/passkey/enroll/verify', {'response': softkey.registration(opts.body, key, cred), 'device_name': f'x4 {role} key'})
    step(f'{role} passkey enrolled', r.ok, r)
    r = anon.post('/auth/login', {'identifier': email, 'password': password})
    opts = r.get('passkey_options') if r.ok else None
    step('with a passkey, login asks for it (no emailed code)', opts and not r.get('requires_2fa'), r)
    # No code is mailed once a passkey exists; whatever code is sent, the answer is passkey_required.
    r = anon.post('/auth/login/verify-2fa', {'identifier': email, 'code': '000000'})
    step('an emailed code alone is refused (403 passkey_required)', r.status == 403 and 'passkey_required' in repr(r), r)
    if not opts:
        return
    v = anon.post('/auth/passkey/login/verify', {'identifier': email, 'response': softkey.assertion(opts, key, cred),
                                                 'device_id': ADMIN_DEVICE_ID, 'device_name': f'x4-{role}-device'})
    step(f'{role} signs in with the passkey', v.ok, v)
    tok = (v.get('token') or {}).get('accessToken') if v.ok and isinstance(v.get('token'), dict) else v.get('token') if v.ok else None
    r = Client(tok, 'admin-api').get('/admin/command-center')
    step('passkey session passes the enforcement checks (no enrollment/rebind 403)',
         r.status != 401 and 'passkey_enrollment_required' not in repr(r) and 'device_rebind_required' not in repr(r) and 'device_not_enrolled' not in repr(r), r)


if __name__ == '__main__':
    from lib import summary
    main()
    staff_passkey('finance')
    staff_passkey('support_agent')
    summary()
