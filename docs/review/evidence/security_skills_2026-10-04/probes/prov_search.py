import sys, json, subprocess, seclib
from lib import Client, uniq, phone
name, api, db = sys.argv[1], sys.argv[2], sys.argv[3]
seclib.use(api)
anon = Client()
ph = phone(); em = f'{uniq("doc")}@nabd.test'
r = anon.post('/provider-onboarding/start', {'phone': ph, 'password': 'Str0ng!Pass1', 'full_name': 'Synthetic Doctor', 'email': em, 'type': 'doctor'})
print(f'[{name}] start ->', r.status, list((r.body or {}).keys()) if isinstance(r.body, dict) else r.body)
uid = r.get('user_id')
lg = anon.post('/auth/login', {'phone': ph, 'password': 'Str0ng!Pass1'})
tok = lg.get('token'); tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
print(f'[{name}] provider login ->', lg.status)
s2 = Client(tok).post('/provider-onboarding/step2', {'iban': 'SA0380000000608010167519', 'bank_account_name': 'Synthetic Doctor Bank Acct'})
print(f'[{name}] step2 (provider enters IBAN) ->', s2.status, str(s2.body)[:150])
# Simulate the admin approval on the throwaway test DB only (status -> active).
out = subprocess.run(['docker','exec','p5mongo','mongosh','--quiet',db,'--eval',f'["providers","provider_profiles"].map(c=>db[c].updateMany({{user_id:"{uid}"}},{{$set:{{status:"active"}}}}).modifiedCount).join("+") + db.providers.updateMany({{user_id:"{uid}"}},{{$set:{{status:"active"}}}}).modifiedCount + "|" + db.getCollectionNames().filter(c=>/provider/i.test(c)).join(",")'],capture_output=True,text=True)
print(f'[{name}] approval simulated in test DB:', out.stdout.strip(), out.stderr.strip()[:200])
r = anon.get('/search/providers?type=doctor')
rows = r.body if isinstance(r.body, list) else r.items()
mine = [p for p in rows if 'Synthetic Doctor Bank Acct' in json.dumps(p)]
print(f'[{name}] anonymous GET /search/providers?type=doctor ->', r.status, 'rows', len(rows))
for p in mine: print('   ', {k: p.get(k) for k in ('iban','bank_account_name','national_id','phone','email','commission_rate','status')})
