import sys, hmac, hashlib, base64, collections, os
os.environ['NABD_LIVE_WAIT_429'] = '0'
import seclib, lib
from lib import Client
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
anon = Client(); anon._retrying = True  # never wait out a 429: we want to see it
g = anon.post('/auth/guest', {})
gt = g.get('token'); gt = gt if isinstance(gt, str) else (gt or {}).get('accessToken')
r = Client(gt).get('/calls/ice/credentials')
print(f'[{name}] guest (no account, no call) GET /calls/ice/credentials -> {r.status} ttl={r.get("ttl")} user={r.get("username")}')
if r.ok:
    exp = base64.b64encode(hmac.new(b'change_this_secret', r.get('username').encode(), hashlib.sha1).digest()).decode()
    print(f'[{name}]   credential == HMAC-SHA1("change_this_secret", username): {exp == r.get("credential")}')
def burst(label, fn, n=30):
    c = collections.Counter(fn(i).status for i in range(n)); print(f'[{name}] {label} x{n}: {dict(c)}')
burst('POST /auth/login wrong password', lambda i: anon.post('/auth/login', {'identifier': 'nobody@nabd.test', 'password': f'Wrong{i}!x'}))
burst('POST /auth/verify-otp wrong code', lambda i: anon.post('/auth/verify-otp', {'email': 'nobody2@nabd.test', 'code': f'{i:06d}'}))
burst('POST /auth/guest', lambda i: anon.post('/auth/guest', {}))
burst('POST /auth/login wrong pw, rotating X-Forwarded-For', lambda i: anon.post('/auth/login', {'identifier': 'nobody3@nabd.test', 'password': f'Wrong{i}!x'}, headers={'x-forwarded-for': f'203.0.113.{i}'}))
