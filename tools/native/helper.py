"""Small HTTP helper the Maestro flows call from runScript (the flows run on the runner, the app on the emulator).

  python3 tools/native/helper.py [port]        (default 9300, 127.0.0.1 only; started by run_job.sh)
  GET /fresh                    -> {email, phone, password, name}   unused sign-up data (nothing is created)
  GET /otp?to=<email>[&since=ms] -> {code}                           newest 6-digit code mailed to <email> (smtp_sink), waits up to 25 s
  GET /patient/new[?address=1][&family=1] -> {email, phone, password, name}   a patient created through the real API (for flows that change or delete the account); address=1 adds a saved address, family=1 a family with one member
  GET /family/member-appointments -> {ok, count, ids}   the appointments the last family member (of /patient/new?family=1) sees
  GET /api?path=/x&token=...    -> the backend's JSON answer (GET), for checks on the other side of a journey
Test stack only; every address is @nabd.test.
"""
import json, os, sys, time, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'live'))
import lib  # noqa: E402


def fresh():
    return {'email': f"{lib.uniq('e2e')}@nabd.test", 'phone': lib.phone(), 'password': 'Str0ng!Pass' + lib.uniq('')[-4:], 'name': 'اختبار نبض'}


ACCOUNTS = os.environ.get('NATIVE_ACCOUNTS', '/tmp/native/accounts.json')
OFFERED = set()
MEMBER = {}   # the family member the last /patient/new?family=1 created (its sign-up token)


def accounts():
    return json.load(open(ACCOUNTS, encoding='utf8'))


def provider(kind):
    a = accounts()['providers'][kind]
    r = lib.Client().post('/provider/auth/login', {'email': a['email'], 'password': a['password']})
    return lib.Client(r.get('access_token'), kind)


def pharmacy_offer(timeout=45):
    """The pharmacy that stocks the seeded medicines answers the newest broadcast it has not answered yet with an offer for every item."""
    ph = provider('pharmacy_stock')
    end = time.time() + timeout
    while time.time() < end:
        for b in ph.get('/provider/pharmacy/broadcasts').items():
            oid = b.get('order_id')
            if not oid or oid in OFFERED:
                continue
            items = b.get('items') or b.get('medicines') or []
            offer_items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
                            'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in items]
            d = ph.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': offer_items})
            if not d.get('id'):
                return {'ok': False, 'step': 'draft', 'detail': str(d)}
            r = ph.post(f"/provider/pharmacy/broadcasts/{oid}/offers/{d.get('id')}/submit")
            OFFERED.add(oid)
            return {'ok': bool(r.ok), 'order_id': oid, 'offer_id': d.get('id')}
        time.sleep(1.5)
    return {'ok': False, 'step': 'broadcast', 'detail': 'no new pharmacy broadcast'}


def patient_order():
    """A new patient (with an address) sends a pharmacy order for the seeded medicine, as the patient app does; the provider flows then answer it in the provider app."""
    import j_accounts, uuid
    p = j_accounts.app_signup(label='native-orderer')
    me = lib.Client(p['token'], 'patient')
    me.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760, 'is_default': True})
    med = accounts()['meds'][0]
    draft = {'items': [{'raw_name': med['name_ar'], 'qty': 1, 'sku': med['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760},
             'prescription_attachments': []}
    k = f'mobile-native-order-{uuid.uuid4()}'
    r = me.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    if not oid:
        return {'ok': False, 'detail': str(r)}
    r = me.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    return {'ok': bool(r.ok), 'order_id': oid, 'token': p['token'], 'email': p['email'], 'password': p['password']}


def pharmacy_delivered():
    """A new patient's pharmacy order, all the way to DELIVERED (offer, card payment on the Moyasar double, pharmacy confirm/preparing/ready/out-for-delivery/delivered),
    not yet rated. The patient app's rate and refund screens only exist for a finished order (the lifecycle of tools/live/j_pharmacy.py)."""
    import j_accounts, uuid
    from j_nursing import card_payment
    p = j_accounts.app_signup(label='native-delivered')
    pat = lib.Client(p['token'], 'patient')
    pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760, 'is_default': True})
    pharm = provider('pharmacy_stock')
    med = accounts()['meds'][0]
    KEY = lambda n: f'native-{n}-{uuid.uuid4()}'
    draft = {'items': [{'raw_name': med['name_ar'], 'qty': 1, 'sku': med['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760},
             'prescription_attachments': []}
    k = KEY('deliv')
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k}).get('id')
    if not oid:
        return {'ok': False, 'step': 'draft'}
    if not pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'}).ok:
        return {'ok': False, 'step': 'submit'}
    end = time.time() + 45
    mine = None
    while time.time() < end and not mine:
        mine = next((b for b in pharm.get('/provider/pharmacy/broadcasts').items() if b.get('order_id') == oid), None)
        if not mine:
            time.sleep(1.5)
    if not mine:
        return {'ok': False, 'step': 'broadcast'}
    offer_items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
                    'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in (mine.get('items') or mine.get('medicines') or [])]
    d = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': offer_items})
    if not d.get('id') or not pharm.post(f"/provider/pharmacy/broadcasts/{oid}/offers/{d.get('id')}/submit").ok:
        return {'ok': False, 'step': 'offer', 'detail': str(d)}
    offers = pat.get(f'/patient/pharmacy/orders/{oid}/offers').items()
    if not offers:
        return {'ok': False, 'step': 'offers'}
    of = offers[0]
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{of.get('id') or of.get('offer_id')}/select", {'coverage_mode': 'cash'}, headers={'Idempotency-Key': KEY('offer')})
    if not r.ok:
        return {'ok': False, 'step': 'select', 'detail': str(r)}
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    if order.get('governed_state') == 'FINAL_QUOTE_READY' or order.get('selected_offer_hash'):
        fq = order.get('governed_state') == 'FINAL_QUOTE_READY'
        pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept',
                 {'quote_hash': order.get('pending_final_quote_hash') if fq else order.get('selected_offer_hash'),
                  'quote_revision': order.get('pending_final_quote_revision') if fq else order.get('selected_offer_revision')},
                 headers={'Idempotency-Key': KEY('final-quote')})
    if not card_payment(pat, 'pharmacy', oid):
        return {'ok': False, 'step': 'card payment'}
    alloc = next((a for a in pharm.get('/provider/pharmacy/allocations').items() if oid in (a.get('order_id'), a.get('id'), a.get('pharmacy_order_id'))), None)
    if not alloc:
        return {'ok': False, 'step': 'allocation'}
    aid = alloc.get('id')
    for action in ('confirm', 'preparing', 'ready'):
        for _ in range(15):  # the payment evidence is recorded by an asynchronous handler: ask again until it is there
            r = pharm.post(f'/provider/pharmacy/allocations/{aid}/{action}', {})
            if r.ok or 'payment_confirmation_required' not in json.dumps(r.body, ensure_ascii=False):
                break
            time.sleep(1)
        if not r.ok:
            return {'ok': False, 'step': action, 'detail': str(r)}
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/out-for-delivery', {'courier_name': 'مندوب', 'courier_phone': '+966500000555'})
    if r.ok:
        r = pharm.post(f'/provider/pharmacy/allocations/{aid}/delivered', {})
    if not r.ok:
        return {'ok': False, 'step': 'delivery', 'detail': str(r)}
    return {'ok': True, 'order_id': oid, 'token': p['token'], 'email': p['email'], 'password': p['password']}


def doctor_blacklist():
    """A new patient is blocked by the seeded doctor (as the doctor app does from the patient file); the provider flow finds it in Settings -> Patient Blacklist."""
    import j_accounts
    doc = provider('doctor_slots')
    p = j_accounts.app_signup(label='native-blocked')
    pid = (p.get('user') or {}).get('id') or (p.get('user') or {}).get('_id')
    if not pid:
        return {'ok': False, 'detail': 'no patient id: ' + str(p.get('user'))}
    reason = 'Maestro ' + lib.uniq('')[-4:]
    r = doc.post(f'/provider/ops/doctor/blacklist/{pid}', {'reason': reason})
    return {'ok': r.ok, 'patient_id': pid, 'reason': reason, 'detail': '' if r.ok else str(r)}


def doctor_appointment():
    """A new patient books the seeded doctor (clinic visit tomorrow, cash), as the patient app does; the provider flow then finds it in the doctor app."""
    import j_accounts, uuid, datetime
    doc = provider('doctor_slots')
    did = doc.get('/provider-onboarding/my-profile').get('id') or doc.get('/provider/me').get('account', 'id')
    p = j_accounts.app_signup(label='native-booker')
    me = lib.Client(p['token'], 'patient')
    day = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    r = me.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [x for x in slots if (x.get('available', True) if isinstance(x, dict) else True)]
    if not free:
        return {'ok': False, 'detail': 'no free slot tomorrow: ' + str(r)}
    s0 = free[0]
    slot = (s0.get('start') or s0.get('slot_start') or s0.get('time')) if isinstance(s0, dict) else s0
    lock = me.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot}).get('id')
    r = me.post('/care/appointments', {'doctor_id': did, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'cash', 'slot_lock_id': lock},
                headers={'Idempotency-Key': f'appointment-create-{did}-{slot}-{uuid.uuid4()}'})
    aid = r.get('id')
    return {'ok': bool(aid), 'appointment_id': aid, 'token': p['token'], 'detail': '' if aid else str(r)}


def lab_booking():
    """A new patient books two tests at the seeded lab (at the facility, cash), as the patient app does; the lab flow finds the request in the lab app."""
    import j_accounts, datetime
    lab = provider('lab_stock')
    lab_id = lab.get('/provider/me').get('account', 'id')
    p = j_accounts.app_signup(label='native-labber')
    me = lib.Client(p['token'], 'patient')
    services = me.get('/labs/services').items()
    when = (datetime.datetime.now() + datetime.timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0).astimezone().isoformat()
    r = me.post('/labs/bookings', {'items': [{'service_id': services[0]['id']}], 'scheduled_at': when, 'location_type': 'facility',
                                   'payment_method': 'cash', 'provider_account_id': lab_id})
    bid = r.get('id')
    return {'ok': bool(bid), 'booking_id': bid, 'token': p['token'], 'detail': '' if bid else str(r)}


def _tomorrow_at(hour):
    import datetime
    return (datetime.datetime.now() + datetime.timedelta(days=1)).replace(hour=hour, minute=0, second=0, microsecond=0).astimezone().isoformat()


def radiology_booking():
    """A new patient books a scan at the seeded imaging centre (at the centre, cash); the radiology flow finds it in the provider app."""
    import j_accounts
    centre = provider('radiology_stock')
    cid = centre.get('/provider/me').get('account', 'id')
    p = j_accounts.app_signup(label='native-scanner')
    me = lib.Client(p['token'], 'patient')
    scan = me.get('/radiology/services').items()[0]
    r = me.post('/radiology/bookings', {'service_id': scan['id'], 'scheduled_at': _tomorrow_at(11), 'location_type': 'facility', 'payment_method': 'cash', 'provider_account_id': cid})
    bid = r.get('id')
    return {'ok': bool(bid), 'booking_id': bid, 'token': p['token'], 'detail': '' if bid else str(r)}


def nursing_booking():
    """A new patient books the seeded nurse (card, paid with the test double so the nurse can accept); the home-care flow finds the visit in the provider app."""
    import j_accounts, j_nursing
    nurse = provider('home_care_stock')
    nid = nurse.get('/provider/me').get('account', 'id')
    p = j_accounts.app_signup(label='native-visitor')
    me = lib.Client(p['token'], 'patient')
    me.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    svc = (lambda r: r.body if isinstance(r.body, list) else r.items())(me.get('/home-care/services'))[0]
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    r = me.post('/nursing/bookings', {'provider_id': nid, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'), 'scheduled_at': _tomorrow_at(9), 'address': addr, 'payment_method': 'card'})
    bid = r.get('id')
    if bid:
        j_nursing.card_payment(me, 'nursing', bid)
    return {'ok': bool(bid), 'booking_id': bid, 'token': p['token'], 'detail': '' if bid else str(r)}


def pay_complete(status='paid', timeout=40):
    """The patient completes (paid) or declines (failed) the newest open hosted checkout of the Moyasar test double."""
    import urllib.request
    base = os.environ.get('NATIVE_MOYASAR', 'http://127.0.0.1:9100')
    end = time.time() + timeout
    while time.time() < end:
        ids = json.load(urllib.request.urlopen(base + '/__invoices'))
        if ids:
            req = urllib.request.Request(f'{base}/__pay/{ids[-1]}?status={status}', method='POST', data=b'{}', headers={'content-type': 'application/json'})
            urllib.request.urlopen(req).read()
            return {'ok': True, 'invoice': ids[-1], 'status': status}
        time.sleep(1)
    return {'ok': False, 'detail': 'no open invoice'}


def otp(to, since):
    return lib.mail_code(to, since, timeout=25)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if u.path == '/fresh':
                return self._send(200, fresh())
            if u.path == '/otp':
                since = float(q.get('since', 0)) / 1000.0
                return self._send(200, {'code': otp(q['to'], since)})
            if u.path == '/patient/new':
                import j_accounts
                p = j_accounts.app_signup(label='native-extra')
                me = lib.Client(p['token'])
                if q.get('address'):
                    me.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع التخصصي 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760, 'is_default': True})
                if q.get('family'):  # a second patient joins this patient's family
                    other = j_accounts.app_signup(label='native-member')
                    me.post('/family/create', {'name': 'عائلة الاختبار'})
                    code = me.post('/family/invite', {}).get('invite_code')
                    lib.Client(other['token']).post('/family/join', {'invite_code': code or '', 'relation': 'child'})
                    MEMBER['token'] = other['token']
                return self._send(200, {'email': p['email'], 'phone': p['phone'], 'password': p['password'], 'name': 'اختبار native-extra'})
            if u.path == '/family/member-appointments':
                # what the family member sees after the account holder booked for them: their own appointment list
                if not MEMBER.get('token'):
                    return self._send(200, {'ok': False, 'detail': 'no family member created by this helper'})
                r = lib.Client(MEMBER['token']).get('/care/appointments')
                return self._send(200, {'ok': r.ok, 'count': len(r.items()), 'ids': [x.get('id') for x in r.items()]})
            if u.path == '/meds':
                return self._send(200, accounts().get('meds', []))
            if u.path == '/pay/complete':
                return self._send(200, pay_complete(q.get('status', 'paid')))
            if u.path == '/radiology/booking':
                return self._send(200, radiology_booking())
            if u.path == '/nursing/booking':
                return self._send(200, nursing_booking())
            if u.path == '/lab/booking':
                return self._send(200, lab_booking())
            if u.path == '/pharmacy/delivered':
                return self._send(200, pharmacy_delivered())
            if u.path == '/doctor/blacklist':
                return self._send(200, doctor_blacklist())
            if u.path == '/doctor/appointment':
                return self._send(200, doctor_appointment())
            if u.path == '/pharmacy/order':
                return self._send(200, patient_order())
            if u.path == '/pharmacy/offer':
                return self._send(200, pharmacy_offer())
            if u.path == '/api':
                r = lib.Client(q.get('token')).get(q['path'])
                return self._send(200, {'ok': r.ok, 'status': r.status, 'body': r.body})
        except Exception as e:  # noqa: BLE001
            return self._send(500, {'error': str(e)})
        self._send(404, {'error': 'not found'})


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 9300), H).serve_forever()
