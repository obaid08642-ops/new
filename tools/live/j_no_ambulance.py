"""Journey: the ambulance provider type is gone (decision 14, issue 333).
  Registration refuses the role (it was still self-registerable through POST /auth/register), the admin notification centre
  no longer offers an "ambulance" audience, and the six other provider types still register.
"""
import time

from lib import Client, journey, step


def main():
    import j_admin, j_accounts
    from j_accounts import anon, mail_code, phone, uniq
    admin, _ = j_admin.login()

    journey('decision 14: nobody can register as an ambulance')
    email = f'{uniq("amb")}@nabd.test'
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
    code = mail_code(email, t0)
    anon.post('/auth/verify-otp', {'email': email, 'code': code})
    r = anon.post('/auth/register', {'full_name': 'اسعاف', 'phone': phone(), 'email': email, 'password': 'Str0ng!Pass' + uniq('')[-4:], 'role': 'ambulance'})
    step('POST /auth/register with role ambulance is refused', r.status == 400 and 'role_not_self_registerable' in str(r.body), r)
    nurse = j_accounts.app_signup(role='nurse', label='still-nurse')
    step('another provider role still registers (nurse)', bool(nurse.get('token')), nurse.get('user'))

    journey('decision 14: no ambulance audience in the admin notification centre')
    body = {'title': 'اختبار', 'body': 'اختبار', 'segment': 'role:ambulance', 'audience_confirmed': True}
    r = admin.post('/admin/admin/notification-center/broadcasts', body)
    step('a broadcast to "role:ambulance" is refused', r.status == 400 and 'unsupported notification segment' in str(r.body), r)
    uid = (nurse.get('user') or {}).get('id') or ''
    r = admin.post('/admin/admin/notification-center/broadcasts', {**body, 'segment': f'user:{uid}'})
    step('the notification centre itself still works (a single-user audience is accepted)', r.ok, r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
