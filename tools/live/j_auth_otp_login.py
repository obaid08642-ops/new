"""Journey (scenario PT-41, sign-in with a code): an existing patient asks for a login code by e-mail (POST /auth/otp/request
), a wrong code is refused, and the right code from the mail signs the patient in (POST /auth/otp/verify).
  - a wrong code is refused (4xx), no token is issued
  - the code from the mail signs in and returns a token
  Stack: backend :8002. TEST database only.
"""
import time

from lib import Client, journey, mail_code, step, summary


def run():
    import j_accounts
    acct = j_accounts.app_signup(label='auth-otp-login')
    email = acct['email']
    anon = Client(None, 'anon')

    journey('sign-in with a code: a wrong code is refused (PT-41)')
    t0 = time.time()
    r = anon.post('/auth/otp/request', {'identifier': email})
    step('the login code is requested (POST /auth/otp/request)', r.ok, r)
    code = mail_code(email, t0)
    step('the login code arrives by e-mail', bool(code), 'no 6-digit code in the mail sink')
    if not code:
        return summary()
    wrong = '000000' if code != '000000' else '111111'
    r = anon.post('/auth/otp/verify', {'identifier': email, 'code': wrong})
    step('a wrong code is refused (4xx)', 400 <= r.status < 500, r)
    step('a wrong code issues no token', not (isinstance(r.body, dict) and (r.body.get('token') or r.body.get('accessToken'))), r)

    journey('sign-in with a code: the right code signs in (PT-41)')
    r = anon.post('/auth/otp/verify', {'identifier': email, 'code': code})
    ex = (r.body or {}).get('exchange_token') if isinstance(r.body, dict) else None
    step('the right code gives a one-time exchange token (60 s)', r.ok and bool(ex), r)
    if not ex:
        return summary()
    r = anon.post('/auth/session/exchange-native', {'exchange_token': ex})
    access = (r.body or {}).get('access_token') if isinstance(r.body, dict) else None
    step('the exchange token becomes a session (POST /auth/session/exchange-native)', r.ok and bool(access), r)
    me = Client(access, 'patient').get('/auth/me') if access else None
    step('the new session is the same patient (GET /auth/me)', bool(me) and me.ok and me.get('email') == email, me)
    r = anon.post('/auth/session/exchange-native', {'exchange_token': ex})
    step('the exchange token is single-use (a second use is refused)', not r.ok, r)
    summary()


if __name__ == '__main__':
    run()
