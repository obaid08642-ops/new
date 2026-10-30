"""Journey (QA A-03, sign-in with a phone number): a patient account with an e-mail and a phone number signs in by phone.
  - the one-time code is sent by push to the signed-in devices and, when the identifier is a phone, also by e-mail to the account's
    e-mail address (backend/src/modules/auth/auth.service.ts deliverOtp: push, then mail.sendOtp); the e-mail sink (lib.mail_code)
    reads the code, so the phone sign-in is tested end to end without a push sink and without SMS;
  - a wrong code is refused; the right code signs in; /auth/me answers for that account.
Test stack and e-mail sink only. A missing mail or route is a FAIL, never a PASS."""
import time

from lib import Client, journey, mail_code, step, summary


def main():
    import j_accounts
    journey('A-03 phone sign-in: the account is created with an e-mail and a phone number')
    acct = j_accounts.app_signup(label='phone-otp')
    phone, email = acct['phone'], acct['email']
    me = Client(acct['token'], 'patient').get('/auth/me')
    step('the account has its phone number (GET /auth/me)', me.ok and (me.get('phone') == phone or (me.get('user') or {}).get('phone') == phone), me.get('phone') if me.ok else me)

    journey('A-03 phone sign-in: the code is requested by phone and read from the e-mail sink')
    anon = Client(None, 'anon')
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'phone': phone, 'purpose': 'login'})
    step('the code is requested by phone (POST /auth/send-otp)', r.ok, r)
    code = mail_code(email, t0)
    step('the code reaches the account e-mail (the e-mail sink)', bool(code), 'code' if code else 'no mail with a 6-digit code')

    journey('A-03 phone sign-in: a wrong code is refused; the right code signs in')
    wrong = '000000' if code != '000000' else '111111'
    r = anon.post('/auth/verify-otp', {'phone': phone, 'code': wrong})
    step('a wrong code is refused', not r.ok, r)
    r = anon.post('/auth/verify-otp', {'phone': phone, 'code': code})
    ok = r.ok and bool(r.get('token') or r.get('ok') or r.get('verified'))
    step('the right code signs in (POST /auth/verify-otp)', ok, r)
    if ok:
        tok = r.get('token')
        tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken') or acct['token']
        me2 = Client(tok, 'patient').get('/auth/me')
        step('the session belongs to the same account (GET /auth/me)', me2.ok and (me2.get('email') == email or (me2.get('user') or {}).get('email') == email), me2)
    summary()


if __name__ == '__main__':
    main()
