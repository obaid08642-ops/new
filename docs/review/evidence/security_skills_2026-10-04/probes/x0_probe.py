import sys, json, seclib
from lib import Client
name, api, edge = sys.argv[1], sys.argv[2], sys.argv[3]
seclib.use(api)
A = seclib.signup('x0a'); B = seclib.signup('x0b')
a, b, anon = Client(A['token']), Client(B['token']), Client()
term = 'x0secret' + A['user']['id'][:6]
a.get(f'/medicines?search={term}')
a.get(f'/medicines/search?q={term}')
print('A recent via backend:', a.get('/medicines/search/recent'))
for path in ['/medicines/search/recent', '/medicines/me/recently-viewed', '/radiology/bookings/mine', '/radiology/reports/mine']:
    u = edge + path
    r0 = anon.get(u); r1 = a.get(u); r2 = anon.get(u); r3 = b.get(u)
    print(f'[{name}] {path}\n   anon-before {r0.status} {r0.headers.get("X-Cache-Status")}\n   A           {r1.status} {r1.headers.get("X-Cache-Status")} cc={r1.headers.get("Cache-Control")} {str(r1.body)[:120]}\n   anon-after  {r2.status} {r2.headers.get("X-Cache-Status")} {str(r2.body)[:120]}\n   B           {r3.status} {r3.headers.get("X-Cache-Status")} {str(r3.body)[:120]}')
