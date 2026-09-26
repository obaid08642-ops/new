"""Journey: accounts (patient-app signup/login/logout/refresh/reset, provider self-registration).
Payloads are copied from the clients: patient-app app/(auth)/{register,otp,login,forgot-password}.tsx."""
import time
from lib import Client, journey, step, mail_code, uniq, phone

anon = Client()
STATE = {}


def app_signup(role=None, label='patient'):
    """patient-app register.tsx -> otp.tsx: send-otp(email) -> verify-otp -> register -> token."""
    email = f'{uniq(label)}@nabd.test'
    ph = phone()
    pw = 'Str0ng!Pass' + uniq('')[-4:]
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
    step(f'{label}: send-otp (email, register)', r.ok, r)
    code = mail_code(email, t0)
    step(f'{label}: OTP email delivered', code, 'no mail with a 6-digit code')
    r = anon.post('/auth/verify-otp', {'email': email, 'code': code})
    step(f'{label}: verify-otp', r.ok and (r.get('ok') or r.get('verified')), r)
    body = {'full_name': f'اختبار {label}', 'phone': ph, 'email': email, 'password': pw}
    if role:
        body['role'] = role
    r = anon.post('/auth/register', body)
    tok = r.get('token')
    tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    step(f'{label}: register returns token + user', r.ok and tok and r.get('user'), r)
    return {'email': email, 'phone': ph, 'password': pw, 'token': tok, 'user': r.get('user') or {}, 'refresh': (r.get('token') or {}).get('refreshToken') if isinstance(r.get('token'), dict) else r.get('refresh_token')}


def run():
    journey('accounts: patient app signup + login')
    p = app_signup()
    STATE['patient'] = p
    me = Client(p['token']).get('/auth/me')
    step('patient: /auth/me after signup', me.ok and (me.get('email') == p['email'] or me.get('user', 'email') == p['email']), me)

    r = anon.post('/auth/register', {'full_name': 'بدون تحقق', 'phone': phone(), 'email': f'{uniq("x")}@nabd.test', 'password': 'Str0ng!Pass1'})
    step('register without OTP is refused (otp_required)', r.status == 400 and 'otp_required' in str(r.body), r)

    # login.tsx sends { phone: fullPhone, password } where fullPhone = +966 + input (unless it starts with +)
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': p['password']})
    step('login by phone (app payload)', r.ok and r.get('token'), r)
    STATE['patient']['login'] = r.body
    # login.tsx -> src/utils/login-credentials.ts: an email goes as { identifier }
    r = anon.post('/auth/login', {'identifier': p['email'].upper(), 'password': p['password']})
    step('login by email typed in mixed case (app payload)', r.ok and r.get('token'), r)
    r = anon.post('/auth/login', {'identifier': p['email'], 'password': p['password']})
    step('login by email (identifier)', r.ok and r.get('token'), r)
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': 'wrong-Pass1'})
    step('wrong password is 401', r.status == 401, r)

    tok = STATE['patient']['login'].get('token') if isinstance(STATE['patient'].get('login'), dict) else None
    refresh = tok.get('refreshToken') if isinstance(tok, dict) else None
    step('login returns a refresh token', refresh, STATE['patient'].get('login'))
    if refresh:
        # SessionManager.ts / patient-web lib/auth/refresh.ts expect { accessToken, refreshToken }
        r = anon.post('/auth/refresh', {'refresh_token': refresh})
        step('refresh token rotates (accessToken + refreshToken)', r.ok and r.get('accessToken') and r.get('refreshToken') and r.get('refreshToken') != refresh, r)
        r2 = anon.post('/auth/refresh', {'refresh_token': refresh})
        step('the old refresh token is rejected after rotation', r2.status == 401, r2)

    journey('accounts: forgot password (app)')
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'email': p['email'], 'purpose': 'reset'})
    step('send-otp (reset)', r.ok, r)
    code = mail_code(p['email'], t0)
    step('reset OTP email delivered', code, 'no mail')
    r = anon.post('/auth/verify-otp', {'email': p['email'], 'code': code})
    step('verify-otp (reset)', r.ok, r)
    STATE['reset_code'] = code

    journey('accounts: provider self-registration (app -> provider-info)')
    for role in ('pharmacy', 'doctor', 'lab', 'radiology', 'nursing'):
        acct = app_signup(role=role, label=role)
        STATE[role] = acct
        me = Client(acct['token']).get('/auth/me')
        step(f'{role}: /auth/me role={role}', me.ok and (me.get('role') == role or me.get('user', 'role') == role), me)
    r = anon.post('/auth/register', {'full_name': 'x', 'phone': phone(), 'email': f'{uniq("adm")}@nabd.test', 'password': 'Str0ng!Pass1', 'role': 'admin'})
    step('self-registering as admin is refused', r.status in (400, 403), r)
    return STATE


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
