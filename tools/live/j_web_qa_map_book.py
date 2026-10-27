"""Journey (QA MP-02, patient-web in a real browser): a signed-in patient books and pays a doctor found on the providers map.
  - an approved doctor publishes clinic hours (the same setup as j_web_qa_map.py);
  - the anonymous visitor finds the doctor's card on /ar/map (its booking link carries the profile id) and opens the profile;
  - a patient signs in on the website, opens the booking page, picks tomorrow's first free clinic slot and submits it;
  - the appointment page opens; the patient starts the card payment, which goes to the hosted checkout (fake gateway);
  - the checkout is completed on the fake gateway and verified through the API; MongoDB shows the visit paid.
Open defect (kept out of the gate, tools/live/gate_skip.txt): the website sends duration_minutes to POST /api/appointments/book,
but that route's schema is .strict() without it (patient-web/app/api/appointments/book/route.ts:8-28; the client sends it at
patient-web/components-next/booking-flow.tsx:164). The booking answers 400 invalid_appointment_payload and the journey stops there.
A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import urllib.request

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
HOME = {'lat': 24.7136, 'lng': 46.6753}
HERE = os.path.dirname(os.path.abspath(__file__))


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def fake_pay(invoice, status='paid'):
    """The patient completes the hosted checkout on the fake gateway (tools/live/fake_moyasar.py), as j_nursing.py does."""
    urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:9100/__pay/{invoice}?status={status}', method='POST')).read()


def main():
    import j_admin, j_onboarding, j_consultation
    from j_accounts import app_signup
    from playwright.sync_api import sync_playwright
    from lib import summary
    admin, _ = j_admin.login()
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    Client(d['token'], 'doctor').post('/provider-onboarding/step2', {'location': HOME, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doc = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic',))
    profile_id = doc.get('/provider-onboarding/my-profile').get('id')
    msgs = json.load(open(os.path.join(HERE, '..', '..', 'patient-web', 'messages', 'ar.json'), encoding='utf-8'))

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('providers map MP-02 (web): the card opens the profile, then the signed-in patient books the visit')
        page.goto(f'{WEB}/ar/map', wait_until='load', timeout=60000)
        lst = page.locator('ul[aria-label]').first
        lst.wait_for(timeout=60000)
        profile_link = lst.locator(f'a[href*="/consultations/doctors/{profile_id}"]').first
        profile_link.wait_for(timeout=60000)
        profile_link.click()
        page.wait_for_url(f'**/consultations/doctors/{profile_id}**', timeout=60000)
        step('the card opens the doctor profile page (this doctor)', profile_id in page.url, page.url)

        acct = app_signup(label='map-web-book')
        pat = Client(acct['token'], 'patient')
        signed = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', signed.ok, f'{signed.status}')
        page.goto(f'{WEB}/ar/consultations/book/{profile_id}', wait_until='load', timeout=60000)
        day = page.locator('section[aria-labelledby="book-day"] button').nth(1)
        day.wait_for(timeout=60000)
        day.click()
        slot = page.locator('section[aria-labelledby="book-slots"] button').first
        slot.wait_for(timeout=60000)
        slot.click()
        step('a free clinic slot is chosen (aria-pressed true)', slot.get_attribute('aria-pressed') == 'true', slot.get_attribute('aria-pressed'))
        with page.expect_response(lambda resp: resp.request.method == 'POST' and '/api/appointments/book' in resp.url, timeout=60000) as booked:
            page.get_by_role('button', name=msgs['BookConsultation']['submit'], exact=True).click()
        status = booked.value.status
        step('the website books the visit (POST /api/appointments/book 2xx)', 200 <= status < 300,
             f'{status} {booked.value.text()[:200]} SENT {booked.value.request.post_data[:300]}')
        if not 200 <= status < 300:
            return
        page.wait_for_url('**/appointments/**', timeout=60000)
        aid = page.url.split('?')[0].rstrip('/').split('/')[-1]
        step('the booking opens the appointment page', bool(aid), page.url)
        row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, doctor_id: 1, patient_id: 1, payment_status: 1}})')
        step("MongoDB: the visit is this doctor's and not paid yet", bool(row) and row.get('doctor_id') == profile_id and row.get('payment_status') != 'paid', row)

        pay_section = page.locator('section[aria-labelledby="consultation-payment-title"]')
        pay_section.get_by_role('button', name=msgs['ConsultClient']['payShow'], exact=True).click()
        card_btn = pay_section.get_by_role('button', name=msgs['ConsultClient']['payCard'], exact=True)
        card_btn.wait_for(timeout=60000)
        with page.expect_request(lambda req: 'fake-moyasar' in req.url, timeout=60000) as went:
            card_btn.click()
        invoice = went.value.url.split('?')[0].rstrip('/').split('/')[-1]
        step('the card checkout opens on the hosted page', 'fake-moyasar' in went.value.url, went.value.url)
        txn = mongo_json(f'db.transactions.findOne({{gateway_intent_id: "{invoice}", booking_id: "{aid}"}}, {{_id: 0, id: 1, status: 1}})')
        step('MongoDB: one card transaction exists for this checkout and visit', bool(txn and txn.get('id')), txn)
        fake_pay(invoice, 'paid')
        r = pat.post(f"/payments/verify/{txn['id']}", {}) if txn else None
        step('the payment is verified as paid (POST /payments/verify)', bool(r) and r.ok and r.get('status') == 'paid', r)
        row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, payment_status: 1}})')
        step('MongoDB: the visit is paid', bool(row) and row.get('payment_status') == 'paid', row)
        # the hosted checkout host is not reachable from the browser, so the page goes back to the appointment by address
        page.goto(f'{WEB}/ar/appointments/{aid}', wait_until='load', timeout=60000)
        step('after the payment the appointment page opens again for this visit', f'/appointments/{aid}' in page.url, page.url)
    finally:
        browser.close()
        pw.stop()
        summary()


if __name__ == '__main__':
    main()
