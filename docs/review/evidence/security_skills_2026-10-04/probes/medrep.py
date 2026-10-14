import sys, json, subprocess, seclib
from lib import Client, uniq, phone
name, api, db = sys.argv[1], sys.argv[2], sys.argv[3]
seclib.use(api)
anon = Client()
P = seclib.signup('reportvictim')
ph = phone(); em = f'{uniq("doc")}@nabd.test'
r = anon.post('/provider-onboarding/start', {'phone': ph, 'password': 'Str0ng!Pass1', 'full_name': 'Synthetic Doctor', 'email': em, 'type': 'doctor'})
uid = r.get('user_id')
# Simulates the admin approval on the throwaway test DB only (role -> doctor, account active).
subprocess.run(['docker','exec','p5mongo','mongosh','--quiet',db,'--eval',f'db.users.updateOne({{id:"{uid}"}},{{$set:{{role:"doctor",onboarding_only:false}}}})'],capture_output=True)
lg = anon.post('/auth/login', {'phone': ph, 'password': 'Str0ng!Pass1'})
tok = lg.get('token'); tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
print(f'[{name}] doctor with no appointment/booking with the patient: login {lg.status}')
c = Client(tok).post('/medical-reports', {'patient_id': P['user']['id'], 'title_ar': 'تقرير اصطناعي', 'diagnosis': 'synthetic fabricated diagnosis', 'critical': True})
print(f'[{name}] doctor POST /medical-reports for unrelated patient -> {c.status} {str(c.body)[:120]}')
m = Client(P['token']).get('/medical-reports/mine')
print(f'[{name}] patient GET /medical-reports/mine contains it: {m.status} {"synthetic fabricated diagnosis" in json.dumps(m.body)}')
