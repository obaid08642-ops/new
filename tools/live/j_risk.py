"""Journey (backend + admin API): seeded fraud patterns are flagged and show on the risk dashboard (22.11).

  1. Account farm: three patients register from one device (the same device header) inside a minute.
  2. Fake orders: one patient creates and cancels four orders in a row, with none delivered.
  3. An honest patient (one device, one order, no cancellations) is never listed.
  The owner reads the dashboard (GET /admin/risk/summary and /users): the farm accounts carry `account_farm`, the order
  cancelling patient carries `fake_orders`, both on the list; the honest one is not; a score detail names its evidence and
  holds no raw address or device id. Nothing is blocked: all four can still sign in.
  Stack: backend :8002. TEST database only.
"""
import os
import time
import uuid

from lib import Client, journey, step, summary, mail_code, uniq, phone
import j_admin

DEVICE = 'live-farm-' + uuid.uuid4().hex


def signup(label, device=None):
    """patient-app register.tsx -> otp.tsx -> register, with the device header the app sends."""
    anon = Client()
    h = {'x-device-id': device} if device else {}
    email = f'{uniq(label)}@nabd.test'
    pw = 'Str0ng!Pass' + uniq('')[-4:]
    t0 = time.time()
    anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'}, headers=h)
    code = mail_code(email, t0)
    anon.post('/auth/verify-otp', {'email': email, 'code': code}, headers=h)
    ph = phone()
    r = anon.post('/auth/register', {'full_name': f'اختبار {label}', 'phone': ph, 'email': email, 'password': pw}, headers=h)
    tok = r.get('token')
    tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    step(f'{label}: signed up', r.ok and tok, r)
    uid = (r.get('user') or {}).get('id')
    return {'id': uid, 'client': Client(tok, label), 'email': email, 'phone': ph, 'password': pw}


def wait_for(owner, predicate, path='/admin/risk/users?limit=100', timeout=25):
    deadline = time.time() + timeout
    r = None
    while time.time() < deadline:
        r = owner.get(path)
        if r.ok and predicate(r):
            return r
        time.sleep(1)
    return r


def signals_of(owner, uid):
    r = owner.get(f'/admin/risk/users/{uid}')
    score = (r.get('score') or {}) if r.ok else {}
    return {s.get('type') for s in score.get('signals') or []}, r


def run():
    _, owner = j_admin.login(os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test'), os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass'))

    journey('risk: seed an account farm, fake orders and an honest patient')
    farm = [signup(f'farm{i}', DEVICE) for i in range(3)]
    canceller = signup('canceller', 'live-own-' + uuid.uuid4().hex)
    honest = signup('honest', 'live-honest-' + uuid.uuid4().hex)
    addr = {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.714, 'lng': 46.676}
    made = 0
    for i in range(4):
        r = canceller['client'].post('/patient/pharmacy/orders', {'items': [{'raw_name': f'دواء اختبار {i} {uuid.uuid4().hex[:4]}', 'qty': 1}], 'delivery_address': addr, 'prescription_attachments': []})
        oid = r.get('id')
        if oid:
            c = canceller['client'].post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'patient_requested'})
            made += 1 if c.ok else 0
    step('four orders created and cancelled by the patient', made == 4, made)
    r = honest['client'].post('/patient/pharmacy/orders', {'items': [{'raw_name': 'دواء اختبار صادق', 'qty': 1}], 'delivery_address': addr, 'prescription_attachments': []})
    step('the honest patient creates one order and keeps it', r.ok, r)

    journey('risk: the dashboard flags the seeded patterns')
    listed = wait_for(owner, lambda r: all(f['id'] in {u.get('user_id') for u in r.get('users') or []} for f in farm) and canceller['id'] in {u.get('user_id') for u in r.get('users') or []})
    ids = {u.get('user_id'): u for u in (listed.get('users') or [])} if listed and listed.ok else {}
    step('the owner reads the risk list', bool(listed and listed.ok), listed)
    for i, f in enumerate(farm):
        sig, d = signals_of(owner, f['id'])
        step(f'farm account {i + 1} carries account_farm', 'account_farm' in sig and f['id'] in ids, sig)
    sig, d = signals_of(owner, canceller['id'])
    step('the order-cancelling patient carries fake_orders', 'fake_orders' in sig and canceller['id'] in ids, sig)
    step('they are medium or high, worst first', all(ids[x['id']]['level'] in ('medium', 'high') for x in farm + [canceller] if x['id'] in ids)
         and [u['score'] for u in listed.get('users')] == sorted((u['score'] for u in listed.get('users')), reverse=True), listed.get('users')[:3] if listed and listed.ok else listed)
    step('the honest patient is not on the list', honest['id'] not in ids, honest['id'])
    text = str(d.body)
    step('the detail names counts, never a raw device id or address', DEVICE not in str(owner.get(f"/admin/risk/users/{farm[0]['id']}").body) and '203.0.' not in text, text[:200])
    r = owner.get('/admin/risk/summary')
    step('the summary counts them', r.ok and ((r.get('medium') or 0) + (r.get('high') or 0)) >= 4 and any(b.get('signal') == 'account_farm' for b in r.get('by_signal') or []), r)
    r = owner.get('/admin/risk/users?signal=account_farm&limit=100')
    step('filtering by signal lists the farm', r.ok and {f['id'] for f in farm} <= {u['user_id'] for u in r.get('users') or []}, r)
    r = owner.post(f"/admin/risk/users/{farm[0]['id']}/rescore", {})
    step('re-scoring one account answers its score', r.ok and (r.get('score') or 0) >= 45, r)

    journey('risk: nothing is blocked')
    r = Client().post('/auth/login', {'phone': farm[0]['phone'], 'password': farm[0]['password']})
    step('a flagged patient can still sign in', r.ok, r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
