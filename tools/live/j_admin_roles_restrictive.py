"""Owner decision 29: admin roles are restrictive.

The owner (tools/live/seed_admin.js; the designated owner email) creates a custom role that holds one permission
(coupons.manage), creates an admin account and gives it only that role. That admin then:
  - reads its session: the permission list is exactly the role's (the panel hides every other control);
  - creates a coupon (POST /admin/coupons, coupons.manage): 2xx;
  - is refused (403) on admin writes outside the role: the SLA settings (PUT /admin/config/sla, a route that named no
    permission before), creating a role (POST /admin/rbac/roles, rbac.manage) and banning a user (POST /bans).
On main every admin holds the whole admin permission set and role-only routes name none, so the outside writes pass.

  Stack: backend :8002 + admin BFF :3001 (admin login with email 2FA, as j_admin).
"""
import os, time
from lib import AdminWeb, Client, journey, step, mail_code, uniq, phone, summary, enroll_admin_device
import j_admin

PASSWORD = 'Restr1cted!Pass'
REASON = 'live journey: restrictive admin roles (owner decision 29)'


def login_admin(email, password):
    """Same admin panel login as j_admin.login (email 2FA through the BFF), for another admin account."""
    w = AdminWeb(j_admin.ADMIN_WEB, 'admin')
    t0 = time.time()
    r = w.post('/api/admin/auth/login', {'identifier': email, 'password': password})
    step('restricted admin: credentials -> 202 requires_2fa', r.status == 202 and r.get('requires_2fa'), r)
    code = mail_code(email, t0)
    step('restricted admin: 2FA code emailed', code, 'no mail')
    r = w.post('/api/admin/auth/verify-2fa', {'identifier': email, 'code': code})
    step('restricted admin: verify-2fa -> session', r.ok, r)
    tok = next((c.value for c in w.jar if c.name == 'admin_access'), None)
    step('restricted admin: session token issued', bool(tok), [c.name for c in w.jar])
    api = Client(tok, 'admin-api')
    enroll_admin_device(api)
    return api


def run():
    _, owner = j_admin.login()

    journey('owner: create a one-permission role and an admin that holds only it')
    key = uniq('cpn').lower()[:30]
    r = owner.post('/admin/rbac/roles', {'key': key, 'name_ar': 'مكتب القسائم', 'permissions': ['coupons.manage'], 'reason': REASON})
    step('owner creates the role (coupons.manage only)', r.ok and r.get('permissions') == ['coupons.manage'], r)
    email = f'{uniq("radm")}@nabd.test'
    r = owner.post('/admin/sub-admins', {'email': email, 'full_name': 'Restricted Admin', 'password': PASSWORD, 'phone': phone()})
    step('owner creates the admin account', r.ok and r.get('id'), r)
    admin_id = r.get('id')
    r = owner.post(f'/admin/rbac/users/{admin_id}/roles', {'custom_role_keys': [key], 'reason': REASON})
    step('owner assigns the role to the admin', r.ok and r.get('custom_role_keys') == [key], r)

    journey('restricted admin: only the role permission')
    api = login_admin(email, PASSWORD)
    r = api.get('/admin/session')
    step('session lists exactly the role permission', r.ok and sorted(r.get('permissions') or []) == ['coupons.manage'], r)

    code = uniq('RST').upper()[:16]
    r = api.post('/admin/coupons', {'code': code, 'discount_type': 'percent', 'value': 5, 'reason': REASON})
    step('inside the role: create a coupon (coupons.manage) -> 2xx', r.ok, r)

    sla = owner.get('/admin/config/sla')
    body = {k: sla.get(k) for k in ('consultationDuration', 'callRingingDuration', 'jwtExpiry')}
    body['reason'] = REASON
    r = api.put('/admin/config/sla', body)
    step('outside the role: SLA settings (was role-only) -> 403', r.status == 403, r)
    r = api.post('/admin/rbac/roles', {'key': uniq('esc').lower()[:30], 'name_ar': 'تصعيد', 'permissions': ['rbac.manage'], 'reason': REASON})
    step('outside the role: create a role (rbac.manage) -> 403', r.status == 403, r)
    r = api.post('/bans', {'type': 'device', 'value': uniq('livedev'), 'reason': REASON})
    step('outside the role: ban a user (user.edit) -> 403', r.status == 403, r)

    journey('owner keeps every permission')
    r = owner.get('/admin/session')
    step('owner session holds settings.edit and rbac.manage', r.ok and {'settings.edit', 'rbac.manage'} <= set(r.get('permissions') or []), r)
    r = owner.put('/admin/config/sla', body)
    step('owner: SLA settings write -> 2xx', r.ok, r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
