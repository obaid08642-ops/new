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
    if path.startswith('/radiology/bookings/') and self.token in state['tok'] and 'radiology_stock' not in state['providers']:
        state['providers']['radiology_stock'] = dict(state['tok'][self.token])   # the centre that runs the seeded scans
    if path.startswith('/provider/jobs/nursing/') and self.token in state['tok'] and 'home_care_stock' not in state['providers']:
        state['providers']['home_care_stock'] = dict(state['tok'][self.token])   # the nurse the seeded visits were booked with
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

# The lab and the imaging centre of the journeys also declare their prices for the ordering engine (the basket, the six-step screens ask POST /ordering/quote):
# without a priced provider the basket cannot offer one. Same calls as j_ordering_engine.py (PUT /provider/ordering/settings and /items).
def declare_ordering(key, kind, service_path, n, modes=('home', 'facility')):
    acc = state['providers'].get(key)
    if not acc:
        print('ordering prices: no', key); return
    tok = lib.Client().post('/provider/auth/login', {'email': acc['email'], 'password': acc['password']}).get('access_token')
    prov = lib.Client(tok, key)
    r = prov.put('/provider/ordering/settings', {'modes': list(modes), 'home_fee': 25, 'home_radius_km': 50, 'auto_accept': False, 'walk_in': False})
    print('ordering settings', key, r.status)
    for svc in lib.Client(tok, key).get(service_path).items()[:n]:
        r = prov.put('/provider/ordering/items', {'service_kind': kind, 'catalog_id': svc['id'], 'prices': ({'home': 80, 'facility': 55} if 'home' in modes else {'facility': 55})})
        print('ordering item', key, svc.get('id'), r.status)


def nurse_hours(key='home_care_stock'):
    """The nurse of the journeys works every day 08:00-18:00. The patient app lists her free times from the profile's working hours
    (home-care slotsForProvider), which the registration wizard sets; the journeys registered her with a Sunday-only default, so the hours are set in the TEST database."""
    acc = state['providers'].get(key)
    if not acc:
        print('working hours: no', key); return
    import json as _json, subprocess
    tok = lib.Client().post('/provider/auth/login', {'email': acc['email'], 'password': acc['password']}).get('access_token')
    account_id = lib.Client(tok, 'nurse').get('/provider/me').get('account', 'id')
    code = ("const m=require('mongoose');(async()=>{await m.connect(process.env.MONGO_URL,{dbName:process.env.DB_NAME});"
            "const r=await m.connection.db.collection('provider_profiles').updateOne({account_id:process.argv[1]},{$set:{working_hours:[{day:'all',open:'08:00',close:'18:00',open_evening:null,close_evening:null,closed:false}]}});"
            "console.log(JSON.stringify(r));await m.disconnect();})().catch(e=>{console.error(e);process.exit(1)})")
    backend = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'backend')
    r = subprocess.run(['node', '-e', code, str(account_id)], cwd=backend, capture_output=True, text=True, timeout=60,
                       env={**os.environ, 'MONGO_URL': os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'), 'DB_NAME': os.environ.get('DB_NAME', 'nabd_live')})
    print('working hours', key, account_id, r.stdout.strip(), r.stderr.strip()[:200])


for _k in ('home_care_stock', 'lab_stock', 'radiology_stock'):   # every day 08:00-18:00 (the lab and the centre offer centre visits in those hours)
    try:
        nurse_hours(_k)
    except Exception:
        traceback.print_exc()
try:
    declare_ordering('lab_stock', 'lab', '/labs/services', 8)
    declare_ordering('radiology_stock', 'radiology', '/radiology/services', 4, modes=('facility',))   # only portable ultrasound may be priced for home
except Exception:
    traceback.print_exc()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
p = state['patient'] or _signup(label='native')
json.dump({'patient': {'email': p['email'], 'password': p['password']}, 'providers': state['providers'], 'meds': state['meds']}, open(OUT, 'w'), indent=1)
print('accounts:', {'patient': p['email'], 'providers': sorted(state['providers'])})
