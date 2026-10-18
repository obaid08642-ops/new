"""Journey: order a prescription for pickup, and the patient's connected AI assistants (needs-review journeys 23,
ac-1-agent-oauth#1).
  - "Order this prescription" on the website asks delivery or pickup, as the cart checkout does; a pickup request
    reaches the pharmacies as fulfillment=pickup (it was always delivery).
  - An AI assistant the patient connected (OAuth with PKCE: register, consent, code, token) is listed on the website's
    settings/connected-apps with what it may do; disconnecting it there ends the connection on the server.
  Stack: backend :8002, patient-web :3100.
"""
import base64
import hashlib
import os
import secrets
import urllib.parse
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def prescription_for(admin, acct):
    """A real prescription: the patient books and pays a visit, the doctor writes the prescription during it."""
    import j_onboarding, j_consultation, j_pharmacy
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin, ('clinic',))
    pat = Client(acct['token'], 'patient')
    j_pharmacy.patient_address(pat)
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return None
    for action in ('check-in', 'start'):
        doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
    pid = doctor.get(f'/care/appointments/{aid}').get('patient_id')
    r = doctor.post('/prescriptions/create', {'patient_id': pid, 'appointment_id': aid, 'diagnosis': 'صداع', 'notes': 'صداع',
                                              'erx': [{'manual_name_en': 'Paracetamol 500mg', 'manual_name_ar': 'باراسيتامول 500', 'dose': '500mg',
                                                       'duration_days': 3, 'instructions': 'عند اللزوم'}], 'labs': [], 'radiology': []})
    step('the doctor writes a prescription during the visit (TEST data)', r.ok, r)
    r = pat.get('/prescriptions/active')
    rx = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('appointment_id') == aid), {})
    return rx.get('id')


def main():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    acct = j_accounts.app_signup(label='flows-c')
    pat = Client(acct['token'], 'patient')
    rx_id = prescription_for(admin, acct)
    step('the patient has the prescription', rx_id, rx_id)

    journey('ac-1-agent-oauth#1: an AI assistant connects (OAuth with PKCE)')
    anon = Client(None, 'anon')
    redirect = 'http://127.0.0.1:9/callback'
    name = f'مساعد اختبار {uuid.uuid4().hex[:5]}'
    r = anon.post('/oauth/register', {'client_name': name, 'redirect_uris': [redirect], 'grant_types': ['authorization_code', 'refresh_token'], 'response_types': ['code'], 'token_endpoint_auth_method': 'none'})
    client_id = r.get('client_id')
    step('the assistant registers', r.ok and client_id, r)
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    params = {'response_type': 'code', 'client_id': client_id, 'redirect_uri': redirect, 'code_challenge': challenge, 'code_challenge_method': 'S256', 'scope': 'agent:read agent:order', 'state': 'st1'}
    r = pat.post('/oauth/authorize', {**params, 'decision': 'approve'})
    location = str(r.get('redirect_to') or r.get('redirect_uri') or r.get('location') or '')
    code = urllib.parse.parse_qs(urllib.parse.urlparse(location).query).get('code', [None])[0] or r.get('code')
    step('the patient approves and the assistant gets a code', r.ok and code, r)
    r = anon.post('/oauth/token', {'grant_type': 'authorization_code', 'code': code, 'code_verifier': verifier, 'client_id': client_id, 'redirect_uri': redirect})
    step('the assistant exchanges it for a token', r.ok and r.get('access_token'), r.status)
    r = pat.get('/patient/agent-connections')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('the server lists the connection', any(x.get('client_id') == client_id for x in rows), rows)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.ok, r.status)

        journey('ac-1-agent-oauth#1: the website lists and disconnects it')
        # each part has its own try, so a failure here does not hide the pickup check below
        try:
            page.goto(f'{WEB}/ar/settings/connected-apps', wait_until='load', timeout=60000)
            row = page.get_by_text(name)
            row.first.wait_for(timeout=30000)
            main_text = page.locator('main').first.inner_text()
            step('the connected assistant is listed with what it may do', 'عرض طلباتك وحجوزاتك الخاصة' in main_text, main_text[:300])
            page.wait_for_function("() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('قطع الاتصال')); return !!b && Object.keys(b).some((k) => k.startsWith('__react')); }", timeout=30000)
            page.get_by_role('button', name='قطع الاتصال').first.click()
            page.get_by_text('لا تطبيقات متصلة').first.wait_for(timeout=30000)
            rows = pat.get('/patient/agent-connections')
            step('disconnecting it ends the connection on the server', not any(x.get('client_id') == client_id for x in (rows.body if isinstance(rows.body, list) else rows.items())), rows)
        except Exception as e:
            step('ac-1-agent-oauth#1 web flow', False, str(e)[:300])

        journey('journeys#23: order the prescription for pickup')
        if rx_id:
            page.goto(f'{WEB}/ar/pharmacy/rx-order?prescriptionId={rx_id}', wait_until='load', timeout=60000)
            # decision 39 (the app's flow): rx-order confirms the prescription and continues to the checkout, which asks
            # delivery or pickup (a Segmented radio group) and sends the request
            page.get_by_role('link', name='متابعة إلى الطلب').first.click(timeout=30000)
            page.wait_for_url('**/cart/checkout**', timeout=60000)
            page.wait_for_function("() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('إرسال الطلب إلى الصيدليات')); return !!b && Object.keys(b).some((k) => k.startsWith('__react')); }", timeout=30000)
            pick = page.get_by_role('radio', name='استلام', exact=True)
            pick.first.click(timeout=30000)
            page.get_by_role('button', name='إرسال الطلب إلى الصيدليات').last.click(timeout=30000)
            page.wait_for_url('**/broadcast-status**', timeout=60000)
            oid = page.url.split('orderId=')[1].split('&')[0] if 'orderId=' in page.url else None
            o = pat.get(f'/patient/pharmacy/orders/{oid}') if oid else None
            body = (o.body.get('data', o.body) if o and isinstance(o.body, dict) else {})
            ful = body.get('fulfillment') or (body.get('delivery') or {}).get('method')
            step('the request reaches the pharmacies as a pickup', oid and ful == 'pickup', f'{oid} {ful}')
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
