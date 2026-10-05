import os, sys, time, json
sys.path.insert(0, '/home/user/new/tools/live')
import lib
from lib import Client, mail_code, uniq, phone

def use(base):
    lib.BASE = base

def signup(label='patient', role=None):
    anon = Client()
    email = f'{uniq(label)}@nabd.test'; ph = phone(); pw = 'Str0ng!Pass' + uniq('')[-4:]
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'}); assert r.ok, r
    code = mail_code(email, t0); assert code, 'no otp'
    r = anon.post('/auth/verify-otp', {'email': email, 'code': code}); assert r.ok, r
    body = {'full_name': f'Synthetic {label}', 'phone': ph, 'email': email, 'password': pw}
    if role: body['role'] = role
    r = anon.post('/auth/register', body); assert r.ok, r
    tok = r.get('token'); tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    refresh = (r.get('token') or {}).get('refreshToken') if isinstance(r.get('token'), dict) else (r.get('refresh_token') or r.get('refreshToken'))
    time.sleep(0.1)
    return {'email': email, 'phone': ph, 'password': pw, 'token': tok, 'refresh': refresh, 'user': r.get('user') or {}, 'raw': r.body}
