"""X4 (ca16fa7), live: with ADMIN_PASSKEY_ENFORCED=true (start-backend.sh),
- a bootstrap admin session (password + email code, no passkey yet) reaches only
  the passkey/device endpoints: command-center answers 403 passkey_enrollment_required;
- an admin who has a passkey cannot enroll a new device outside a passkey login
  (403 passkey_assertion_required).
The bootstrap admin is a synthetic sub-admin created and deleted by this run.
"""
import os, time, uuid

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


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
