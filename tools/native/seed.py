"""Seed real test data for the native E2E run and write the accounts the crawler signs in with.

  python3 tools/native/seed.py /tmp/native/accounts.json

Runs the data-creating live journeys (tools/live/j_*.py) against the local test stack, with ONE shared
patient (so the patient app has appointments, orders, results, ...) and records every provider the journeys
register and approve, keeping the last approved one per provider type (so each provider dashboard has the
journey's requests, bookings and orders). Test database only; accounts use @nabd.test addresses.
"""
import json, os, runpy, sys, traceback

LIVE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'live'))
sys.path.insert(0, LIVE)
os.chdir(LIVE)
import j_accounts, j_onboarding  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/native/accounts.json'
JOURNEYS = ['pharmacy', 'consultation', 'lab', 'radiology', 'nursing', 'facility', 'chat', 'returns', 'loyalty']   # j_ambulance no longer exists: the provider types the journeys miss are registered below
SHARED = {'consult-patient', 'buyer', 'lab-patient', 'rad-patient', 'nursing-patient', 'insured-patient', 'loyal',
          'support-patient', 'chat-patient', 'returner'}
state = {'patient': None, 'providers': {}, 'meds': [], 'tok': {}}

_signup = j_accounts.app_signup


def app_signup(role=None, label='patient'):
    if role is None and label in SHARED:
        if state['patient'] is None:
            state['patient'] = _signup(label='native')
        return dict(state['patient'])
    return _signup(role=role, label=label)


_after = j_onboarding.provider_after_approval


def provider_after_approval(prov):
    tok = _after(prov)
    if tok:
        state['providers'][prov['type']] = {'email': prov['email'], 'password': prov['password']}
        state['tok'][tok] = {'email': prov['email'], 'password': prov['password']}
    return tok


import lib  # noqa: E402

_post = lib.Client.post


def post(self, path, body=None, *a, **k):
    # the catalogue items j_pharmacy creates (its pharmacy stocks them and is online): the flows search for them and the helper answers orders as that pharmacy
    r = _post(self, path, body, *a, **k)
    if path == '/medicines/admin/catalog' and isinstance(body, dict) and r.get('id'):
        state['meds'].append({'id': r.get('id'), 'name_ar': body.get('name_ar'), 'name_en': body.get('name_en')})
        if 'pharmacy' in state['providers'] and 'pharmacy_stock' not in state['providers']:
            state['providers']['pharmacy_stock'] = dict(state['providers']['pharmacy'])
    if path == '/provider/schedule-slots' and self.token in state['tok'] and 'doctor_slots' not in state['providers']:
        state['providers']['doctor_slots'] = dict(state['tok'][self.token])   # the doctor who published clinic hours: patients can book them
    if path == '/labs/samples/register' and self.token in state['tok'] and 'lab_stock' not in state['providers']:
        state['providers']['lab_stock'] = dict(state['tok'][self.token])   # the lab that runs the seeded tests: patients can book it
    return r


lib.Client.post = post
j_accounts.app_signup = app_signup
j_onboarding.provider_after_approval = provider_after_approval
for mod in list(sys.modules.values()):  # journeys that already imported the helpers by name
    if getattr(mod, 'app_signup', None) is _signup:
        mod.app_signup = app_signup

for j in JOURNEYS:
    print(f'\n##### {j}', flush=True)
    try:
        runpy.run_path(f'{LIVE}/j_{j}.py', run_name='__main__')
    except SystemExit:
        pass
    except Exception:
        traceback.print_exc()

if 'pharmacy' not in state['providers'] or len(state['providers']) < 1 + len(j_onboarding.SCREENS):
    import j_admin
    admin, _ = j_admin.login()
    for ptype in ['pharmacy', *j_onboarding.SCREENS]:
        if ptype in state['providers']:
            continue
        p = j_onboarding.register_pharmacy() if ptype == 'pharmacy' else j_onboarding.register_type(ptype)
        j_onboarding.admin_review(admin, p)
        provider_after_approval(p)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
p = state['patient'] or _signup(label='native')
json.dump({'patient': {'email': p['email'], 'password': p['password']}, 'providers': state['providers'], 'meds': state['meds']}, open(OUT, 'w'), indent=1)
print('accounts:', {'patient': p['email'], 'providers': sorted(state['providers'])})
