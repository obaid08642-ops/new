import sys, json, seclib
from lib import Client
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
P = seclib.signup('matcher')
r = Client(P['token']).post('/workflow/match', {'kind': 'consultation'})
rows = r.body if isinstance(r.body, list) else r.items()
hit = [x for x in rows if 'Synthetic Doctor Bank Acct' in json.dumps(x)]
print(f'[{name}] patient POST /workflow/match {{kind:consultation}} ->', r.status, 'rows', len(rows))
for x in hit[:1]: print('   ', {k: x.get(k) for k in ('iban', 'bank_account_name', 'commission_rate')})
