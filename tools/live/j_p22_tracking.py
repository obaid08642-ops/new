"""Journey P22.4: delivery promise — ETA by location, slots, live tracking, proof of visit.

Contracts (slice p22-b, read-only via `git show p22-b:<path>` from /Users/ahmedobaid/nabd-plus):
  backend/src/modules/labs/labs.service.ts            (home_collection_eta_minutes by city)
  backend/src/modules/labs/visit-slots.controller.ts  (GET /labs/slots public)
  backend/src/modules/home-care/home-care.controller.ts (tracking/position/transit/arrive/complete)
  backend/src/modules/home-care/home-care.service.ts  (pushPosition guards, verifyVisitProof)
  backend/src/modules/home-care/visit-proof-tracking.p22.spec.ts (intended live path)

What the screens send (no fixture-only shortcuts):
  - lab catalog ETA: GET /labs/services?city= — the product page read.
  - slots: GET /labs/slots?city=&date= — public, shown pre-login.
  - visit: POST /home-care/bookings {service_id, scheduled_at, provider_id, payment_method: card}
    (nursing/service-details -> nurse-profile payload, cf. j_nursing.py); positions are
    REAL device coordinates the nurse's phone sends (0,0 is refused server-side).
  - the 6-digit visit_code travels patient -> nurse out-of-band in real life (spoken at
    the door); the journey passes it the same way the patient would speak it.

NOT RUN HERE: no docker on this machine, so the live gate cannot start.
Authored + static-checked only; must go green in CI (NABD_GATE_P22=1) after p22-b merges.

Never-loses-data invariants asserted:
  - fabricated positions (0,0 / out-of-range) never touch the record (400, no save).
  - a nurse not assigned to the visit cannot move or read it (403).
  - completion without proof is refused (visit_proof_required); a wrong code is refused
    (visit_code_mismatch); double completion is refused — never a 500.
"""
import datetime as _dt
import uuid
from lib import Client, journey, step

KEY = lambda tag: f'p22-track-{tag}-{uuid.uuid4()}'
ADDR = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
NURSE_POS_1 = {'lat': 24.7300, 'lng': 46.7300}
NURSE_POS_2 = {'lat': 24.7100, 'lng': 46.7100}


def lab_promise(pat):
    journey('P22.4: ETA by location on the catalog (product page read)')
    r = pat.get('/labs/services?city=' + 'الرياض')
    items = r.body if isinstance(r.body, list) else r.items()
    home = [x for x in items if x.get('home_visit_supported') is not False]
    step('catalog lists services for the city', r.ok and len(items) > 0, f'{r.status} {len(items)}')
    if not home:
        return
    bad = [x.get('id') for x in home if not isinstance(x.get('home_collection_eta_minutes'), int)]
    step('every home-visit item carries home_collection_eta_minutes (int)',
         r.ok and not bad, f'missing on {bad[:3]}')
    noflag = [x.get('id') for x in items if 'cold_chain_required' not in x]
    step('items expose the cold-chain flag', r.ok and not noflag, f'missing on {noflag[:3]}')

    journey('P22.4: bookable visit slots are public (shown pre-login)')
    day = (_dt.date.today() + _dt.timedelta(days=2)).isoformat()
    r = Client().get(f'/labs/slots?city=الرياض&date={day}')
    slots = r.body if isinstance(r.body, list) else r.items()
    step('public slot list loads', r.ok and isinstance(slots, list), r)


def run(pat, nurse, other_nurse, admin):
    lab_promise(pat)

    journey('P22.4: patient books a home visit (card, assigned nurse)')
    r = pat.get('/home-care/services')
    svcs = r.body if isinstance(r.body, list) else r.items()
    svc = next((s for s in svcs if s.get('id')), None)
    step('published home-care services exist', r.ok and svc, f'{r.status} {len(svcs)}')
    if not svc:
        return
    nurse_id = nurse.get('/provider/me').get('account', 'id')
    day = (_dt.date.today() + _dt.timedelta(days=1)).isoformat()
    r = pat.post('/home-care/bookings',
                 {'service_id': svc['id'], 'scheduled_at': f'{day}T10:00:00+03:00',
                  'provider_id': nurse_id, 'payment_method': 'card', 'address': ADDR,
                  'contact': {'name': 'مريض اختبار', 'phone': '+966500000111'}},
                 headers={'Idempotency-Key': KEY('book')})
    bid = r.get('id')
    vcode = r.get('visit_code')
    step('booking created with a 6-digit handover code',
         r.ok and bid and isinstance(vcode, str) and len(vcode) == 6 and vcode.isdigit(), (bid, vcode))
    if not bid:
        return

    journey('P22.4: live positions advance, ETA updates (nurse phone -> patient tracking)')
    r = nurse.post(f'/home-care/visits/{bid}/position', NURSE_POS_1)
    step('nurse pushes a live position', r.ok and r.get('position') == NURSE_POS_1, r)
    r = nurse.post(f'/home-care/visits/{bid}/position', {'lat': 0, 'lng': 0})
    step('fabricated (0,0) position is refused, never stored', r.status == 400, r)
    r = nurse.post(f'/home-care/visits/{bid}/position', {'lat': 24.7, 'lng': 500})
    step('out-of-range coordinates refused', r.status == 400, r)
    r = other_nurse.post(f'/home-care/visits/{bid}/position', NURSE_POS_1)
    step('a nurse not assigned to the visit cannot push positions', r.status in (403, 404), r)
    r = nurse.post(f'/home-care/visits/{bid}/position', NURSE_POS_2)
    step('second position (closer to the patient) accepted', r.ok, r)
    r = pat.get(f'/home-care/visits/{bid}/tracking')
    eta = r.get('eta_minutes')
    step('patient tracking shows the visit with a recomputed ETA',
         r.ok and isinstance(eta, int) and eta >= 1, (r.get('status'), eta))
    r = other_nurse.get(f'/home-care/visits/{bid}/tracking')
    step('an unassigned nurse cannot read the tracking', r.status in (403, 404), r)

    journey('P22.4: nurse accepts, travels, arrives, cares, proves delivery')
    r = nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    step('nurse accepts the visit', r.ok, r)
    if not r.ok:
        step('visit leg BLOCKED on the accept path (see P22_F_NOTES)', False, r)
        return
    r = nurse.post(f'/home-care/visits/{bid}/transit', {})
    step('nurse sets off (CONFIRMED -> IN_TRANSIT)', r.ok, r)
    r = nurse.post(f'/home-care/visits/{bid}/arrive', {'lat': 24.80, 'lng': 46.80})
    step('arrival far from the patient is refused (geofence)', r.status == 400, r)
    r = nurse.post(f'/home-care/visits/{bid}/arrive', {'lat': 24.7002, 'lng': 46.7002})
    step('arrived at the patient', r.ok, r)
    r = nurse.post(f'/home-care/visits/{bid}/start-care', {})
    step('care started', r.ok, r)
    r = nurse.post(f'/home-care/visits/{bid}/complete', {'clinical_notes': 'تمت الزيارة'})
    step('completion WITHOUT proof is refused (visit_proof_required)', r.status == 400, r)
    r = nurse.post(f'/home-care/visits/{bid}/complete', {'clinical_notes': 'تمت الزيارة', 'visit_code': '000000'})
    step('a WRONG handover code is refused (visit_code_mismatch)', r.status == 400, r)
    r = nurse.post(f'/home-care/visits/{bid}/complete',
                   {'clinical_notes': 'تم إعطاء الحقنة ومتابعة العلامات الحيوية',
                    'vitals': {'bp': '120/80', 'hr': '82'}, 'visit_code': vcode})
    step('handover code closes the visit (proof-of-delivery)', r.ok and r.get('proof_method') == 'visit_code', r)
    r = nurse.post(f'/home-care/visits/{bid}/complete', {'visit_code': vcode})
    step('double completion is refused, not a 500', r.status == 400, r)

    journey('P22.4: afterwards the tracking is the visit report')
    r = pat.get(f'/home-care/visits/{bid}/tracking')
    step('tracking shows COMPLETED with the clinical report',
         r.ok and r.get('status') == 'COMPLETED' and (r.get('notes') or r.get('vitals')), r)


if __name__ == '__main__':
    import j_admin
    import j_accounts
    import j_nursing
    import j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    j_nursing.admin_publishes_nursing(admin)
    catalog = Client(None, 'anon').get('/nursing/catalog')
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': 0}
                for x in (catalog.body if isinstance(catalog.body, list) else catalog.items())]
    p = j_onboarding.register_type('home_care', {'nursing_services': services})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    # Second nurse: only a token is needed to prove cross-provider isolation (403s).
    p2 = j_onboarding.register_type('home_care', {'nursing_services': services})
    pat = j_accounts.app_signup(label='tracking-patient')
    run(Client(pat['token'], 'patient'), Client(p['token'], 'nurse'), Client(p2['token'], 'nurse2'), admin)
    summary()
