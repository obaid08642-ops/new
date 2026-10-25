"""Journey: password rules and forgot-password (A-07, A-06) over the API.
The reset link carries a token; it is read from the mail sink (tools/live/fake_mail or smtp_sink), as the
live journeys do for OTP codes. A password change is proven by logging in with the new password only."""
import re, time
from lib import Client, journey, step, mail_to
from j_accounts import app_signup


def run():
    journey('password: 8-character rule, forgot and reset (API, read-back)')
    anon = Client(None, 'anon')
    r = anon.post('/auth/register', {'full_name': 'QA short', 'phone': '+966500000777', 'email': f'short{int(time.time())}@nabd.test', 'password': 'short7c'})
    step('register rejects a 7-character password', r.status == 400 and 'longer than or equal to 8' in str(r.body), r)

    pat = app_signup(label='qapw')
    t0 = time.time()
    r = anon.post('/auth/password/forgot', {'identifier': pat['email']})
    step('forgot-password request', r.ok, r)
    mails = mail_to(pat['email'], t0)
    tokens = re.findall(r'[A-Za-z0-9_-]{43}', str(mails))
    step('reset token delivered by mail', bool(tokens), str(mails)[:200])
    if not tokens:
        return
    new_pw = 'Renewed!Pass' + str(int(time.time()))[-4:]
    r = anon.post('/auth/password/reset', {'reset_token': tokens[0], 'new_password': new_pw})
    step('reset with the emailed token', r.ok, r)
    r = anon.post('/auth/login', {'identifier': pat['email'], 'password': pat['password']})
    step('old password no longer logs in', r.status == 401, r)
    r = anon.post('/auth/login', {'identifier': pat['email'], 'password': new_pw})
    step('new password logs in', r.ok, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
