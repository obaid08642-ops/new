"""Journey: provider onboarding (provider-app src/screens/*/…Registration.tsx) -> admin review
(admin/src/pages/admin/provider-moderation.tsx) -> provider login -> visible to patients."""
import base64, time
from lib import Client, journey, step, mail_code, uniq, phone

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
    r = c.post('/provider-onboarding/step2', {'license_number': '1010123456', 'license_documents': docs})
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


def admin_review(admin, prov):
    journey(f"onboarding: admin reviews the {prov['type']}")
    r = admin.get('/providers?status=pending&limit=100')
    items = r.body.get('items', []) if isinstance(r.body, dict) else []
    mine = next((i for i in items if i.get('email') == prov['email']), None)
    step('pending list (provider-moderation) shows the new provider', r.ok and mine, f"{r.status} {len(items)} items; emails={[i.get('email') for i in items][:5]}")
    if not mine:
        return None
    r = admin.get(f"/providers/{mine['id']}")
    step('provider detail opens', r.ok, r)
    r = admin.post(f"/providers/{mine['id']}/approve", {'reason': 'مستندات مكتملة', 'commission_cash': 10, 'commission_insurance': 8})
    step('approve with commissions', r.ok, r)
    r = admin.get('/providers?status=pending&limit=100')
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


if __name__ == '__main__':
    from lib import summary
    import j_admin
    admin, _ = j_admin.login()
    p = register_pharmacy()
    admin_review(admin, p)
    provider_after_approval(p)
    summary()
