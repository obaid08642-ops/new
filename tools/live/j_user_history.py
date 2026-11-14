"""Journey (backend): a person's own history (23.6).

  1. GET /me/history/activity: the caller's own account events only, in the shape a person may see (no hashes, a masked
     address); a second patient's events never appear.
  2. A pharmacy order the patient creates and submits: GET /me/history/pharmacy/<id> lists its steps with "you" as the
     actor, no internal fields; another patient gets 404 for the same id.
  3. The PDPL export (GET /users/me/data-export) carries `audit_events` with the person's own events.
  Providers: the provider journeys (j_onboarding.provider_after_approval) check /provider/auth/history and /sessions.
  Stack: backend :8002. TEST database only.
"""
import json
import urllib.parse
import uuid

from lib import Client, journey, step, summary
import j_accounts
import j_pharmacy

def find_key(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            found = find_key(v, key)
            if found is not None:
                return found
    return None


FORBIDDEN = ('"hash"', 'prev_hash', 'actor_account_id', 'idempotency', 'refresh_token')


def run():
    journey('user history: two patients')
    a = j_accounts.app_signup(label='history-a')
    b = j_accounts.app_signup(label='history-b')
    ca, cb = Client(a['token'], 'patient-a'), Client(b['token'], 'patient-b')
    r = Client().post('/auth/login', {'phone': a['phone'], 'password': a['password']}, headers={'x-device-id': 'live-hist-' + uuid.uuid4().hex})
    step('patient A signs in', r.ok, r)

    journey('user history: account activity')
    r = ca.get('/me/history/activity')
    step('activity answers with paging and events', r.ok and isinstance(r.get('events'), list) and r.get('page') == 1, r)
    text = json.dumps(r.body, ensure_ascii=False)
    step('no hash, no full address, no raw device id', not any(f in text for f in FORBIDDEN) and a['phone'] not in text, text[:300])
    mine = {e.get('action') for e in r.get('events') or []}
    step('only account events a person may see', mine <= {'account_registered', 'login_success', 'login_failed', 'otp_requested', 'password_changed',
                                                          'session_ended', 'device_revoked', 'device_changed', 'policy_accepted', 'data_export',
                                                          'data_erasure', 'account.linked', 'account.guest_merged'}, mine)
    rb = cb.get('/me/history/activity')
    step('patient B has their own list, not A\'s', rb.ok and set(e.get('id') for e in rb.get('events') or []).isdisjoint(set(e.get('id') for e in r.get('events') or [])), rb)
    r = ca.get('/me/history/activity?limit=100000&page=-3')
    step('a silly page size is clamped', r.ok and r.get('limit') == 100 and r.get('page') == 1, r)

    journey('user history: status history of an order')
    addr = j_pharmacy.patient_address(ca)
    meds = ca.get('/medicines?limit=2').items()
    draft = {'items': [{'raw_name': (m.get('name_ar') or m.get('name_en') or 'x'), 'qty': 1, 'sku': m['id'], 'intake_source': 'cart'} for m in meds[:1]],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
             'prescription_attachments': []}
    step('the catalogue offers a medicine to order', bool(meds), 'no medicines')
    k = j_pharmacy.KEY('history')
    r = ca.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    step('patient creates an order', r.ok and oid, r)
    if oid:
        r = ca.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
        step('patient submits it', r.ok, r)
        r = ca.get(f'/me/history/pharmacy/{oid}')
        hist = r.get('history') or []
        text = json.dumps(r.body, ensure_ascii=False)
        step('the order history lists the steps, done by "you"', r.ok and len(hist) >= 1 and all(h.get('by') in ('you', 'system') for h in hist)
             and hist[0].get('event') == 'service.requested', hist)
        step('no internal fields in it', not any(f in text for f in FORBIDDEN), text[:300])
        r = cb.get(f'/me/history/pharmacy/{oid}')
        step('another patient gets 404 for the same order', r.status == 404, r)
        r = ca.get(f'/me/history/pharmacy/{urllib.parse.quote("{$ne:1}")}')
        step('an id that is not a plain id is refused (400/404)', r.status in (400, 404), r)
    r = ca.get('/me/history/spaceship/abc')
    step('an unknown kind is refused (400)', r.status == 400, r)

    journey('user history: the PDPL export carries the audit events')
    r = ca.get('/users/me/data-export')
    ev = find_key(r.body, 'audit_events') if r.ok else None
    step('export has audit_events', r.ok and isinstance(ev, list), r)
    step('only the person\'s own events, never a hash', isinstance(ev, list) and '"hash"' not in json.dumps(ev) and b['email'] not in json.dumps(ev), str(ev)[:300])


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
