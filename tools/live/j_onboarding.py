"""Journey: provider onboarding (provider-app src/screens/*/…Registration.tsx) -> admin review
(admin/src/pages/admin/provider-moderation.tsx) -> provider login -> visible to patients."""
import base64, time
from lib import Client, journey, step, mail_code, uniq, phone
import re

# A real (valid) 8x8 PNG, built here: stands in for photographed documents / the drawn signature.
def _png():
    import struct, zlib
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\x00' + b'\x00\x00\x00' * 8 for _ in range(8))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


PNG = base64.b64encode(_png()).decode()


STATE_PHONE = [None]


def provider_client(tok=None):
    # provider-app src/api/client.ts (axios): JSON, X-Device-ID, idempotency key on mutations
    c = Client(tok, 'provider')
    return c


def upload(c, name, mime='image/jpeg'):
    r = c.post('/storage/upload', {'data_base64': PNG, 'mime': mime, 'original_name': name})
    ref = r.get('id') or r.get('url')
    step(f'upload {name}', r.ok and ref, r)
    return ref


def register_pharmacy():
    journey('onboarding: pharmacy registers in the provider app')
    email = f'{uniq("pharm")}@nabd.test'
    pw = 'Ph@rm-' + uniq('')[-6:] + 'x'
    anon = provider_client()
    STATE_PHONE[0] = phone()
    r = anon.post('/provider-onboarding/start', {'phone': STATE_PHONE[0], 'password': pw, 'full_name': 'مدير صيدلية اختبار', 'email': email, 'type': 'pharmacy'})
    step('start (account + profile)', r.ok, r)
    # api/provider.ts onboardingLogin: the wizard runs as the onboarding identity start just created
    r = anon.post('/auth/login', {'identifier': email, 'password': pw})
    t = r.get('token')
    tok = t if isinstance(t, str) else (t or {}).get('accessToken')
    step('wizard sign-in (onboarding identity)', r.ok and tok, r)
    r = anon.post('/provider-onboarding/start', {'phone': STATE_PHONE[0], 'password': 'wrong-Pass-1', 'full_name': 'x', 'email': email, 'type': 'lab'})
    step('start with an existing phone and a wrong password is refused', r.status == 409, r)
    c = provider_client(tok)
    docs = [upload(c, n) for n in ('cr.jpg', 'moh.jpg', 'sfda.jpg')]
    iban_letter = upload(c, 'iban_letter.jpg')
    # PharmacyRegistration.tsx PStep2Legal: typed documents with step2 (Q79).
    typed = [{'doc_type': 'commercial_registration', 'file_id': docs[0]}, {'doc_type': 'facility_license', 'file_id': docs[1]},
             {'doc_type': 'iban_letter', 'file_id': iban_letter}, {'doc_type': 'other', 'file_id': docs[2]}]
    r = c.post('/provider-onboarding/step2', {'license_number': '1010123456', 'license_documents': docs, 'documents': typed})
    step('step2: licenses', r.ok, r)
    hours = [{'day': d, 'open': '09:00', 'close': '23:00', 'open_evening': None, 'close_evening': None, 'closed': False} for d in ('sun', 'mon', 'tue', 'wed', 'thu')]
    r = c.post('/provider-onboarding/step3', {
        'pharmacy_chain': False, 'has_own_drivers': True, 'has_own_delivery': True, 'delivery_radius_km': 10,
        'delivery_fee': 15, 'free_delivery_above': 200, 'min_order_sar': 30, 'express_delivery': False, 'express_fee': 0,
        'express_minutes': 0, 'working_hours': hours, 'accepts_insurance': False, 'accepted_insurance': [],
        'insurance_plans': {}, 'accepts_cash': True, 'rx_dispensing': True, 'otc_selling': True, 'enabled_categories': ['otc', 'rx']})
    step('step3: capabilities + hours', r.ok, r)
    docs2 = [upload(c, n, 'application/pdf') for n in ('cr_document', 'moh_license', 'sfda_license')]
    logo = upload(c, 'pharmacy_logo')
    loc = {'lat': 24.7136, 'lng': 46.6753}
    r = c.post('/provider-onboarding/step2', {
        'name_ar': 'صيدلية الاختبار الحي', 'name_en': 'Live Test Pharmacy', 'pharmacist_name': 'د. صيدلي',
        'city': 'الرياض', 'location': loc, 'district': 'العليا', 'address': 'شارع العليا 12', 'pharmacy_type': 'community',
        'cr_number': '1010123456', 'moh_license_number': 'MOH-PHR-12345', 'sfda_license_number': 'SFDA-12345',
        'tax_number': '300000000000003', 'license_documents': docs2, 'logo': logo, 'languages': ['ar', 'en']})
    step('step2: identity, location, documents, logo', r.ok, r)
    sig = upload(c, 'signature.png', 'image/png')
    r = c.post('/provider-onboarding/step2', {'iban': 'SA0380000000608010167519', 'bank_account_name': 'صيدلية الاختبار'})
    step('step2: bank', r.ok, r)
    t0 = time.time()
    r = c.post('/provider/auth/send-otp', {'email': email, 'purpose': 'email_verification'})
    step('send email verification code', r.ok, r)
    code = mail_code(email, t0)
    step('verification code emailed', code, 'no mail')
    r = c.post('/provider/auth/verify-email', {'email': email, 'code': code})
    step('verify email', r.ok, r)
    r = c.post('/provider-onboarding/submit', {'signer_name': 'مدير صيدلية اختبار', 'signer_role': 'owner', 'lat': loc['lat'], 'lng': loc['lng'], 'signature_url': sig, 'full_data': {'nameAr': 'صيدلية الاختبار الحي', 'city': 'الرياض'}})
    step('submit for review', r.ok, r)
    r = c.get('/provider-onboarding/progress')
    step('progress shows submitted/pending', r.ok, r)
    return {'email': email, 'password': pw, 'token': tok, 'type': 'pharmacy', 'name': 'صيدلية الاختبار الحي'}


# Q79: approval needs one typed provider_documents row per required doc_type.
# The journey no longer uploads them itself: it sends only what the registration
# screens send (step2 `documents`, built with typedDocuments in each screen).
REQUIRED_DOCS = {
    'pharmacy': ['commercial_registration', 'facility_license', 'iban_letter'],
    'lab': ['commercial_registration', 'facility_license', 'iban_letter'],
    'radiology': ['commercial_registration', 'facility_license', 'iban_letter'],
    'hospital': ['commercial_registration', 'facility_license', 'vat_certificate', 'iban_letter'],
    'ambulance': ['commercial_registration', 'facility_license', 'iban_letter'],
    'home_care': ['commercial_registration', 'facility_license', 'iban_letter'],
    'nursing': ['national_id', 'medical_license', 'iban_letter'],
    'doctor': ['national_id', 'medical_license', 'professional_cv', 'iban_letter'],
}


def screen_documents(c, ptype, at):
    """The typed documents the screen's step2 call at `at` sends for this provider type."""
    rel, line = at.rsplit(':', 1)
    root = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), '../..'))
    src = open(_os.path.join(root, rel), encoding='utf8').read().split('\n')
    window = '\n'.join(src[max(0, int(line) - 25):int(line) + 12])
    types = [t for t in dict.fromkeys(re.findall(r"\['(\w+)',\s*[\w.]+\]", window)) if t in REQUIRED_DOCS.get(ptype, [])]
    return [{'doc_type': t, 'file_id': upload(c, f'{t}.jpg')} for t in types]


def admin_review(admin, prov):
    journey(f"onboarding: admin reviews the {prov['type']}")
    # The moderation list lives behind the admin controller (BFF 1:1 → /api/v1/admin/providers);
    # GET /providers is the public discovery feed and never shows pending accounts.
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    items = r.body.get('items', []) if isinstance(r.body, dict) else []
    mine = next((i for i in items if i.get('email') == prov['email']), None)
    step('pending list (provider-moderation) shows the new provider', r.ok and mine, f"{r.status} {len(items)} items; emails={[i.get('email') for i in items][:5]}")
    if not mine:
        return None
    r = admin.get(f"/admin/admin/providers/{mine['id']}")
    step('provider detail opens', r.ok, r)
    r = admin.post(f"/admin/admin/providers/{mine['id']}/approve", {'reason': 'مستندات مكتملة', 'commission_cash': 10, 'commission_insurance': 8})
    step('approve with commissions', r.ok, r)
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    still = [i for i in (r.body.get('items', []) if isinstance(r.body, dict) else []) if i.get('email') == prov['email']]
    step('no longer pending', r.ok and not still, r)
    return mine['id']


def provider_after_approval(prov):
    journey(f"onboarding: approved {prov['type']} signs in")
    r = Client().post('/provider/auth/login', {'email': prov['email'], 'password': prov['password']})
    tok = r.get('access_token')
    step('provider login', r.ok and tok, r)
    prov['token'] = tok
    return tok




# ── Every provider type: payload structure taken from the registration screen itself ─────────
import json as _json, os as _os, subprocess as _sp

SCREENS = {  # provider type -> registration screen (provider-app/src/screens)
    'doctor': 'doctor/DoctorRegistration.tsx', 'lab': 'lab/LabRegistration.tsx', 'radiology': 'radiology/RadiologyRegistration.tsx',
    'home_care': 'nursing/NursingRegistration.tsx', 'nursing': 'nursing/NursingRegistration.tsx', 'hospital': 'facility/FacilityRegistration.tsx', 'ambulance': 'ambulance/AmbulanceRegistration.tsx',
}
_CT = []


def _calls():
    """clientbodies --types output (typed payload shape per call site)."""
    if not _CT:
        root = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), '../..'))
        out = _sp.run(['node', 'tools/audit/clientbodies.js', '--types'], cwd=root, capture_output=True, text=True, check=True).stdout
        _CT.extend(_json.loads(out))
    return _CT


# Fields the type checker could not infer (kind None): what the registration screens actually send, by name.
UNTYPED = {'working_hours': [{'day': 'sunday', 'open': '09:00', 'close': '17:00', 'open_evening': None, 'close_evening': None, 'closed': False}],
           'home_visit_radius_km': 10, 'coverage_radius_km': 10, 'gender': 'female', 'pricingModel': ['visit'],
           'nursing_services': [], 'equipment_list': [], 'test_categories': []}


def _value(key, kind):
    k = key.lower()
    if kind is None or kind == 'null':
        return UNTYPED.get(key)
    if kind == 'string':
        if 'date' in k or 'expiry' in k:
            return '2027-06-30'
        if k in ('gender', 'gender_pref', 'home_collector_gender'):
            return 'male'
        if 'email' in k:
            return None
        if 'iban' in k:
            return 'SA0380000000608010167519'
        if k in ('specialty',):
            return 'cardiology'
        if 'city' in k:
            return 'الرياض'
        return 'قيمة اختبار'
    if kind == 'number':
        return 10
    if kind == 'boolean':
        return True
    if kind.startswith('array<object>'):
        if 'schedule' in k or 'hours' in k:
            return [{'day': 'sunday', 'open': '09:00', 'close': '17:00', 'closed': False}]
        return [{'name': 'وحدة اختبار'}]
    if kind.startswith('array<string>'):
        return ['clinic', 'video'] if 'modes' in k else ['قيمة']
    if kind.startswith('array<number>'):
        return [1]
    if kind.startswith('array'):
        return []
    if kind == 'object':
        return {}
    return None


def screen_payloads(ptype):
    """[(url, payload)] for every step2/step3 call the screen makes, in source order."""
    screen = SCREENS[ptype]
    rows = [c for c in _calls() if c['url'] in ('/provider-onboarding/step2', '/provider-onboarding/step3') and c['at'].endswith(screen.split('/')[-1] + ':' + c['at'].split(':')[-1]) and screen in c['at']]
    rows.sort(key=lambda c: int(c['at'].split(':')[-1]))
    out = []
    for c in rows:
        body = {k: v for k, v in ((k, _value(k, kind)) for k, kind in (c.get('kinds') or {}).items()) if v is not None}
        if 'address' in body:
            body['address'] = 'شارع التحلية 7'
        if 'location' in (c.get('kinds') or {}):
            body['location'] = {'lat': 24.7, 'lng': 46.7}
        if c['url'].endswith('step2') and 'license_documents' in (c.get('kinds') or {}):
            body['license_documents'] = '__UPLOAD_DOCS__'
        if c['url'].endswith('step2') and 'documents' in (c.get('kinds') or {}):
            body['documents'] = '__TYPED_DOCS__'
        out.append((c['url'], body, c['at']))
    return out


def register_type(ptype, overrides=None):
    """overrides: {field: value} for choices the screen fills from live data (e.g. test_categories = catalog ids)."""
    journey(f'onboarding: {ptype} registers in the provider app')
    email = f'{uniq(ptype)}@nabd.test'
    pw = 'Prov-' + uniq('')[-6:] + 'x!'
    anon = provider_client()
    r = anon.post('/provider-onboarding/start', {'phone': phone(), 'password': pw, 'full_name': f'مسؤول {ptype}', 'email': email, 'type': ptype})
    step('start', r.ok, r)
    r = anon.post('/auth/login', {'identifier': email, 'password': pw})
    t = r.get('token')
    tok = t if isinstance(t, str) else (t or {}).get('accessToken')
    step('wizard sign-in', r.ok and tok, r)
    c = provider_client(tok)
    for url, body, at in screen_payloads(ptype):
        sent = {k for c in _calls() if c['at'] == at for k in (c.get('kinds') or {})}
        body = {**body, **{k: v for k, v in (overrides or {}).items() if k in body or k in sent}}
        # R1: approval requires license evidence — upload real files, not [].
        if body.get('license_documents') == '__UPLOAD_DOCS__':
            body['license_documents'] = [upload(c, n) for n in ('national_id.jpg', 'medical_license.jpg', 'professional_cv.pdf', 'iban_letter.jpg')]
        if body.get('documents') == '__TYPED_DOCS__':
            body['documents'] = screen_documents(c, ptype, at)
        r = c.post(url, body)
        step(f"{url.split('/')[-1]} as sent by {at.split('/')[-1]}", r.ok, f'{r} body_keys={sorted(body)}')
    sig = upload(c, 'signature.png', 'image/png')
    t0 = time.time()
    r = c.post('/provider/auth/send-otp', {'email': email, 'purpose': 'email_verification'})
    code = mail_code(email, t0)
    r = c.post('/provider/auth/verify-email', {'email': email, 'code': code})
    step('email verified', r.ok, r)
    r = c.post('/provider-onboarding/submit', {'signer_name': f'مسؤول {ptype}', 'signer_role': 'owner', 'lat': 24.7, 'lng': 46.7, 'signature_url': sig, 'full_data': {}})
    step('submit for review', r.ok, r)
    return {'email': email, 'password': pw, 'token': tok, 'type': ptype}


def onboard_all(admin):
    """Register, approve and sign in one provider of every type; returns {type: provider}."""
    provs = {}
    p = register_pharmacy()
    admin_review(admin, p)
    provider_after_approval(p)
    provs['pharmacy'] = p
    for ptype in SCREENS:
        p = register_type(ptype)
        admin_review(admin, p)
        provider_after_approval(p)
        provs[ptype] = p
    return provs


if __name__ == '__main__':
    from lib import summary
    import j_admin
    admin, _ = j_admin.login()
    onboard_all(admin)
    summary()
